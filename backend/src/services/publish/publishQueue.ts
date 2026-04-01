import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import { getPlatformConfig, getPublisher } from './index.js';
import type { PublishContent, PublishMode } from './types.js';
import { websocketService } from '../websocket.js';

const prisma = new PrismaClient();

interface BatchProgressSnapshot {
  status: string;
  totalCount: number;
  pendingCount: number;
  successCount: number;
  failedCount: number;
  completedAt: Date | null;
}

async function getPublishContent(
  contentType: string,
  contentId: string
): Promise<PublishContent | null> {
  if (contentType !== 'article') {
    return null;
  }

  const article = await prisma.article.findUnique({ where: { id: contentId } });
  if (!article) {
    return null;
  }

  let content = '';
  if (article.filePath && fs.existsSync(article.filePath)) {
    content = fs.readFileSync(article.filePath, 'utf-8');
  }

  return {
    type: 'article',
    id: article.id,
    title: article.title,
    content,
    summary: article.summary || undefined,
    coverImage: article.coverImage || undefined,
  };
}

async function updateBatchStats(batchId: string): Promise<BatchProgressSnapshot | null> {
  const stats = await prisma.publishRecord.groupBy({
    by: ['status'],
    where: { batchId },
    _count: true,
  });

  const counts = {
    pending: 0,
    success: 0,
    failed: 0,
    cancelled: 0,
  };

  for (const stat of stats) {
    if (stat.status === 'pending' || stat.status === 'processing') {
      counts.pending += stat._count;
    } else if (stat.status === 'draft_saved' || stat.status === 'published') {
      counts.success += stat._count;
    } else if (stat.status === 'failed') {
      counts.failed += stat._count;
    } else if (stat.status === 'cancelled') {
      counts.cancelled += stat._count;
    }
  }

  const batch = await prisma.publishBatch.findUnique({ where: { id: batchId } });
  if (!batch) {
    return null;
  }

  const terminalCount = counts.success + counts.failed + counts.cancelled;
  const status =
    batch.status === 'cancelled'
      ? 'cancelled'
      : terminalCount >= batch.totalCount
        ? 'completed'
        : 'processing';

  const updatedBatch = await prisma.publishBatch.update({
    where: { id: batchId },
    data: {
      pendingCount: counts.pending,
      successCount: counts.success,
      failedCount: counts.failed,
      status,
      completedAt: status === 'completed' || status === 'cancelled' ? new Date() : null,
    },
  });

  const snapshot: BatchProgressSnapshot = {
    status: updatedBatch.status,
    totalCount: updatedBatch.totalCount,
    pendingCount: updatedBatch.pendingCount,
    successCount: updatedBatch.successCount,
    failedCount: updatedBatch.failedCount,
    completedAt: updatedBatch.completedAt,
  };

  websocketService.publishBatchStatus(batchId, { ...snapshot });

  return snapshot;
}

function emitBatchRecordStatus(
  batchId: string | null,
  recordId: string,
  recordStatus: string,
  payload: Record<string, unknown> = {}
): void {
  if (!batchId) {
    return;
  }

  websocketService.publishBatchStatus(batchId, {
    recordId,
    recordStatus,
    ...payload,
  });
}

async function moveRecordToRetryOrFail(
  recordId: string,
  batchId: string | null,
  retryCount: number,
  maxRetries: number,
  errorMessage: string,
  errorCode?: string
): Promise<void> {
  const latest = await prisma.publishRecord.findUnique({
    where: { id: recordId },
    select: { status: true },
  });

  if (!latest || latest.status === 'cancelled') {
    return;
  }

  const canRetry = retryCount + 1 < maxRetries;

  await prisma.publishRecord.update({
    where: { id: recordId },
    data: {
      retryCount: { increment: 1 },
      status: canRetry ? 'pending' : 'failed',
      errorMessage,
      errorCode,
    },
  });

  emitBatchRecordStatus(batchId, recordId, canRetry ? 'pending' : 'failed', {
    errorMessage,
    errorCode,
  });
}

export class PublishQueue {
  private readonly concurrency: number;
  private readonly activeBatches = new Set<string>();

  constructor(concurrency: number = 3) {
    this.concurrency = concurrency;
  }

  async startBatch(batchId: string): Promise<void> {
    if (this.activeBatches.has(batchId)) {
      return;
    }

    this.activeBatches.add(batchId);
    void this.processBatch(batchId).finally(() => {
      this.activeBatches.delete(batchId);
    });
  }

  async recoverProcessingBatches(): Promise<void> {
    const processingRecords = await prisma.publishRecord.findMany({
      where: { status: 'processing', batchId: { not: null } },
      select: { id: true },
    });

    if (processingRecords.length > 0) {
      await prisma.publishRecord.updateMany({
        where: { id: { in: processingRecords.map((record) => record.id) } },
        data: { status: 'pending' },
      });
    }

    const batches = await prisma.publishBatch.findMany({
      where: { status: { in: ['pending', 'processing'] } },
      select: { id: true },
    });

    for (const batch of batches) {
      await updateBatchStats(batch.id);
      await this.startBatch(batch.id);
    }
  }

  private async processRecord(recordId: string): Promise<void> {
    const record = await prisma.publishRecord.findUnique({
      where: { id: recordId },
    });

    if (!record || record.status === 'cancelled') {
      return;
    }

    const platformConfig = await getPlatformConfig(record.platformId);
    if (!platformConfig) {
      await moveRecordToRetryOrFail(
        record.id,
        record.batchId,
        record.retryCount,
        record.maxRetries,
        '平台配置不存在'
      );
      return;
    }

    const content = await getPublishContent(record.contentType, record.contentId);
    if (!content) {
      await moveRecordToRetryOrFail(
        record.id,
        record.batchId,
        record.retryCount,
        record.maxRetries,
        '发布内容不存在'
      );
      return;
    }

    await prisma.publishRecord.update({
      where: { id: record.id },
      data: {
        status: 'processing',
        errorMessage: null,
        errorCode: null,
      },
    });
    emitBatchRecordStatus(record.batchId, record.id, 'processing');

    try {
      const publisher = getPublisher(platformConfig.name);
      const result = await publisher.publish(content, platformConfig, {
        mode: record.publishMode as PublishMode,
      });

      if (!result.success) {
        await moveRecordToRetryOrFail(
          record.id,
          record.batchId,
          record.retryCount,
          record.maxRetries,
          result.errorMessage || '发布失败',
          result.errorCode
        );
        return;
      }

      const latest = await prisma.publishRecord.findUnique({
        where: { id: record.id },
        select: { status: true },
      });

      if (!latest || latest.status === 'cancelled') {
        return;
      }

      const recordStatus = record.publishMode === 'draft' ? 'draft_saved' : 'published';

      await prisma.publishRecord.update({
        where: { id: record.id },
        data: {
          status: recordStatus,
          platformPostId: result.platformPostId,
          platformUrl: result.platformUrl,
          errorCode: null,
          errorMessage: null,
          publishedAt: new Date(),
        },
      });

      emitBatchRecordStatus(record.batchId, record.id, recordStatus);
    } catch (error) {
      await moveRecordToRetryOrFail(
        record.id,
        record.batchId,
        record.retryCount,
        record.maxRetries,
        error instanceof Error ? error.message : '处理异常'
      );
    }
  }

  private async processBatch(batchId: string): Promise<void> {
    await prisma.publishBatch.update({
      where: { id: batchId },
      data: {
        status: 'processing',
        completedAt: null,
      },
    });

    websocketService.publishBatchStatus(batchId, { status: 'processing' });

    while (true) {
      const batch = await prisma.publishBatch.findUnique({ where: { id: batchId } });
      if (!batch || batch.status === 'cancelled') {
        break;
      }

      const records = await prisma.publishRecord.findMany({
        where: {
          batchId,
          status: 'pending',
        },
        orderBy: { createdAt: 'asc' },
        take: this.concurrency,
        select: { id: true },
      });

      if (records.length === 0) {
        const processingCount = await prisma.publishRecord.count({
          where: { batchId, status: 'processing' },
        });

        if (processingCount === 0) {
          break;
        }
      } else {
        await Promise.all(records.map((record) => this.processRecord(record.id)));
      }

      await updateBatchStats(batchId);

      const remaining = await prisma.publishRecord.count({
        where: {
          batchId,
          status: { in: ['pending', 'processing'] },
        },
      });

      if (remaining === 0) {
        break;
      }
    }

    await updateBatchStats(batchId);
  }
}

export const publishQueue = new PublishQueue();
