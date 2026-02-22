import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import {
  getPublisher,
  getSupportedPlatforms,
  getPlatformConfig,
  updatePlatformToken,
  PlatformType,
  PublishContent,
} from '../services/publish/index.js';
import { SmartPublisher } from '../services/publish/smartPublisher.js';
import { ExtensionTaskQueue } from '../services/extension/taskQueue.js';

const prisma = new PrismaClient();
export const publishRouter = Router();

// ========== 统计 API ==========

// 获取发布统计数据
publishRouter.get('/stats', async (req, res) => {
  try {
    const [pending, processing, published, failed] = await Promise.all([
      prisma.publishRecord.count({ where: { status: 'pending' } }),
      prisma.publishRecord.count({ where: { status: 'processing' } }),
      prisma.publishRecord.count({ where: { status: 'published' } }),
      prisma.publishRecord.count({ where: { status: 'failed' } }),
    ]);
    res.json({ pending, processing, published, failed });
  } catch (error) {
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// ========== 平台配置 API ==========

// 获取支持的平台列表
publishRouter.get('/platforms/supported', (req, res) => {
  res.json(getSupportedPlatforms());
});

// 获取已配置的平台列表
publishRouter.get('/platforms', async (req, res) => {
  try {
    const platforms = await prisma.publishPlatform.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        accountName: true,
        accountAvatar: true,
        isEnabled: true,
        updatedAt: true,
      },
    });
    res.json(platforms);
  } catch (error) {
    res.status(500).json({ error: '获取平台列表失败' });
  }
});

// 获取单个平台配置
publishRouter.get('/platforms/:id', async (req, res) => {
  try {
    const platform = await prisma.publishPlatform.findUnique({
      where: { id: req.params.id },
    });
    if (!platform) {
      return res.status(404).json({ error: '平台不存在' });
    }
    // 不返回敏感信息
    res.json({
      id: platform.id,
      name: platform.name,
      displayName: platform.displayName,
      appId: platform.appId,
      accountName: platform.accountName,
      accountAvatar: platform.accountAvatar,
      isEnabled: platform.isEnabled,
    });
  } catch (error) {
    res.status(500).json({ error: '获取平台配置失败' });
  }
});

// 添加/更新平台配置
publishRouter.post('/platforms', async (req, res) => {
  try {
    const { id, name, appId, appSecret } = req.body;

    // 新增时必须填写完整信息
    if (!id && (!name || !appId || !appSecret)) {
      return res.status(400).json({ error: '请填写完整的配置信息' });
    }

    // 编辑时如果没有填 appSecret，从数据库获取原值
    let finalAppSecret = appSecret;
    if (id && !appSecret) {
      const existing = await prisma.publishPlatform.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: '平台配置不存在' });
      }
      finalAppSecret = existing.appSecret;
    }

    if (!name || !appId || !finalAppSecret) {
      return res.status(400).json({ error: '请填写完整的配置信息' });
    }

    const publisher = getPublisher(name as PlatformType);

    // 验证配置
    const testConfig = {
      id: id || '',
      name: name as PlatformType,
      displayName: publisher.displayName,
      appId,
      appSecret: finalAppSecret,
      config: {},
    };

    const validationResult = await publisher.validateConfig(testConfig);
    if (!validationResult.valid) {
      return res.status(400).json({ error: validationResult.error || '配置验证失败' });
    }

    // 获取 token
    const updatedConfig = await publisher.refreshToken(testConfig);

    // 保存到数据库
    const data = {
      name,
      displayName: publisher.displayName,
      appId,
      appSecret: finalAppSecret,
      accessToken: updatedConfig.accessToken,
      tokenExpireAt: updatedConfig.tokenExpireAt,
    };

    let platform;
    if (id) {
      platform = await prisma.publishPlatform.update({
        where: { id },
        data,
      });
    } else {
      platform = await prisma.publishPlatform.create({ data });
    }

    res.json({ id: platform.id, name: platform.name, displayName: platform.displayName });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '保存配置失败' });
  }
});

// 删除平台配置
publishRouter.delete('/platforms/:id', async (req, res) => {
  try {
    await prisma.publishPlatform.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除失败' });
  }
});

// 切换平台启用状态
publishRouter.patch('/platforms/:id/toggle', async (req, res) => {
  try {
    const platform = await prisma.publishPlatform.findUnique({ where: { id: req.params.id } });
    if (!platform) return res.status(404).json({ error: '平台不存在' });

    const updated = await prisma.publishPlatform.update({
      where: { id: req.params.id },
      data: { isEnabled: !platform.isEnabled },
    });
    res.json({ isEnabled: updated.isEnabled });
  } catch (error) {
    res.status(500).json({ error: '操作失败' });
  }
});

// ========== 发布操作 API ==========

// 单篇发布
publishRouter.post('/single', async (req, res) => {
  try {
    const { contentType, contentId, platformId, mode = 'draft' } = req.body;

    if (!contentType || !contentId || !platformId) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 获取平台配置
    const platformConfig = await getPlatformConfig(platformId);
    if (!platformConfig) {
      return res.status(404).json({ error: '平台配置不存在' });
    }

    // 获取内容
    const content = await getPublishContent(contentType, contentId);
    if (!content) {
      return res.status(404).json({ error: '内容不存在' });
    }

    // 创建发布记录
    const record = await prisma.publishRecord.create({
      data: {
        contentType,
        contentId,
        contentTitle: content.title,
        platformId,
        platformName: platformConfig.displayName,
        status: 'processing',
        publishMode: mode,
      },
    });

    // 执行发布
    const publisher = getPublisher(platformConfig.name);
    const result = await publisher.publish(content, platformConfig, { mode });

    // 更新记录
    await prisma.publishRecord.update({
      where: { id: record.id },
      data: {
        status: result.success ? (mode === 'draft' ? 'draft_saved' : 'published') : 'failed',
        platformPostId: result.platformPostId,
        platformUrl: result.platformUrl,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        publishedAt: result.success ? new Date() : undefined,
      },
    });

    res.json({ recordId: record.id, ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '发布失败' });
  }
});

// 定时发布
publishRouter.post('/scheduled', async (req, res) => {
  try {
    const { contentType, contentId, platformId, mode = 'draft', scheduledAt } = req.body;

    if (!contentType || !contentId || !platformId || !scheduledAt) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 验证定时时间
    const scheduledTime = new Date(scheduledAt);
    if (scheduledTime <= new Date()) {
      return res.status(400).json({ error: '定时时间必须晚于当前时间' });
    }

    // 获取平台配置
    const platformConfig = await getPlatformConfig(platformId);
    if (!platformConfig) {
      return res.status(404).json({ error: '平台配置不存在' });
    }

    // 获取内容
    const content = await getPublishContent(contentType, contentId);
    if (!content) {
      return res.status(404).json({ error: '内容不存在' });
    }

    // 创建发布记录
    const record = await prisma.publishRecord.create({
      data: {
        contentType,
        contentId,
        contentTitle: content.title,
        platformId,
        platformName: platformConfig.displayName,
        status: 'pending',
        publishMode: mode,
        scheduledAt: scheduledTime,
      },
    });

    res.json({ recordId: record.id, scheduledAt: scheduledTime });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '创建定时发布失败' });
  }
});

// 批量发布
publishRouter.post('/batch', async (req, res) => {
  try {
    const { contentType, contentIds, platformIds, mode = 'draft' } = req.body;

    if (!contentType || !contentIds?.length || !platformIds?.length) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 创建批次
    const batch = await prisma.publishBatch.create({
      data: {
        contentType,
        contentIds: JSON.stringify(contentIds),
        platformIds: JSON.stringify(platformIds),
        totalCount: contentIds.length * platformIds.length,
        pendingCount: contentIds.length * platformIds.length,
        publishMode: mode,
        status: 'processing',
      },
    });

    // 创建发布记录
    for (const contentId of contentIds) {
      const content = await getPublishContent(contentType, contentId);
      if (!content) continue;

      for (const platformId of platformIds) {
        const platform = await prisma.publishPlatform.findUnique({
          where: { id: platformId },
        });
        if (!platform) continue;

        await prisma.publishRecord.create({
          data: {
            contentType,
            contentId,
            contentTitle: content.title,
            platformId,
            platformName: platform.displayName,
            batchId: batch.id,
            publishMode: mode,
          },
        });
      }
    }

    // 异步处理发布任务
    processBatchPublish(batch.id);

    res.json({ batchId: batch.id, totalCount: batch.totalCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '创建批量发布失败' });
  }
});

// 获取批量发布进度
publishRouter.get('/batch/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;

    const batch = await prisma.publishBatch.findUnique({
      where: { id },
    });

    if (!batch) {
      return res.status(404).json({ error: '批次不存在' });
    }

    const records = await prisma.publishRecord.findMany({
      where: { batchId: id },
      select: {
        id: true,
        contentTitle: true,
        platformName: true,
        status: true,
        errorMessage: true,
        publishedAt: true,
      },
    });

    res.json({
      batch: {
        id: batch.id,
        status: batch.status,
        totalCount: batch.totalCount,
        pendingCount: batch.pendingCount,
        successCount: batch.successCount,
        failedCount: batch.failedCount,
        createdAt: batch.createdAt,
        completedAt: batch.completedAt,
      },
      records,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取进度失败' });
  }
});

// 取消批量发布
publishRouter.post('/batch/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    const batch = await prisma.publishBatch.findUnique({
      where: { id },
    });

    if (!batch) {
      return res.status(404).json({ error: '批次不存在' });
    }

    if (batch.status === 'completed' || batch.status === 'cancelled') {
      return res.status(400).json({ error: '批次已完成或已取消' });
    }

    // 取消所有待处理的记录
    await prisma.publishRecord.updateMany({
      where: {
        batchId: id,
        status: { in: ['pending', 'processing'] },
      },
      data: { status: 'cancelled' },
    });

    // 更新批次状态
    await prisma.publishBatch.update({
      where: { id },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '取消失败' });
  }
});

// ========== 发布记录 API ==========

// 获取发布记录列表
publishRouter.get('/records', async (req, res) => {
  try {
    const { status, contentType, page = 1, pageSize = 20 } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (contentType) where.contentType = contentType;

    const [records, total] = await Promise.all([
      prisma.publishRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        include: { platform: { select: { displayName: true } } },
      }),
      prisma.publishRecord.count({ where }),
    ]);

    res.json({ records, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (error) {
    res.status(500).json({ error: '获取记录失败' });
  }
});

// 重试发布
publishRouter.post('/records/:id/retry', async (req, res) => {
  try {
    const record = await prisma.publishRecord.findUnique({
      where: { id: req.params.id },
    });
    if (!record) return res.status(404).json({ error: '记录不存在' });
    if (record.status !== 'failed') {
      return res.status(400).json({ error: '只能重试失败的记录' });
    }

    const platformConfig = await getPlatformConfig(record.platformId);
    if (!platformConfig) return res.status(404).json({ error: '平台配置不存在' });

    const content = await getPublishContent(record.contentType, record.contentId);
    if (!content) return res.status(404).json({ error: '内容不存在' });

    await prisma.publishRecord.update({
      where: { id: record.id },
      data: { status: 'processing', retryCount: record.retryCount + 1 },
    });

    const publisher = getPublisher(platformConfig.name);
    const result = await publisher.publish(content, platformConfig, {
      mode: record.publishMode as 'draft' | 'publish',
    });

    await prisma.publishRecord.update({
      where: { id: record.id },
      data: {
        status: result.success
          ? record.publishMode === 'draft' ? 'draft_saved' : 'published'
          : 'failed',
        platformPostId: result.platformPostId,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        publishedAt: result.success ? new Date() : undefined,
      },
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || '重试失败' });
  }
});

// ========== 辅助函数 ==========

// 获取发布内容
async function getPublishContent(
  contentType: string,
  contentId: string
): Promise<PublishContent | null> {
  if (contentType === 'article') {
    const article = await prisma.article.findUnique({ where: { id: contentId } });
    if (!article) return null;

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
  return null;
}

// 异步处理批量发布
async function processBatchPublish(batchId: string) {
  const records = await prisma.publishRecord.findMany({
    where: { batchId, status: 'pending' },
  });

  for (const record of records) {
    try {
      const platformConfig = await getPlatformConfig(record.platformId);
      if (!platformConfig) continue;

      const content = await getPublishContent(record.contentType, record.contentId);
      if (!content) continue;

      await prisma.publishRecord.update({
        where: { id: record.id },
        data: { status: 'processing' },
      });

      const publisher = getPublisher(platformConfig.name);
      const result = await publisher.publish(content, platformConfig, {
        mode: record.publishMode as 'draft' | 'publish',
      });

      const newStatus = result.success
        ? record.publishMode === 'draft' ? 'draft_saved' : 'published'
        : 'failed';

      await prisma.publishRecord.update({
        where: { id: record.id },
        data: {
          status: newStatus,
          platformPostId: result.platformPostId,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          publishedAt: result.success ? new Date() : undefined,
        },
      });

      // 更新批次统计
      await updateBatchStats(batchId);
    } catch (error) {
      await prisma.publishRecord.update({
        where: { id: record.id },
        data: { status: 'failed', errorMessage: '处理异常' },
      });
    }
  }

  // 标记批次完成
  await prisma.publishBatch.update({
    where: { id: batchId },
    data: { status: 'completed', completedAt: new Date() },
  });
}

// 更新批次统计
async function updateBatchStats(batchId: string) {
  const stats = await prisma.publishRecord.groupBy({
    by: ['status'],
    where: { batchId },
    _count: true,
  });

  const counts = { pending: 0, success: 0, failed: 0 };
  for (const s of stats) {
    if (s.status === 'pending' || s.status === 'processing') {
      counts.pending += s._count;
    } else if (s.status === 'draft_saved' || s.status === 'published') {
      counts.success += s._count;
    } else if (s.status === 'failed') {
      counts.failed += s._count;
    }
  }

  await prisma.publishBatch.update({
    where: { id: batchId },
    data: {
      pendingCount: counts.pending,
      successCount: counts.success,
      failedCount: counts.failed,
    },
  });
}

// ========== 智能发布 API ==========

// 获取平台发布能力
publishRouter.get('/platforms/:id/capabilities', async (req, res) => {
  try {
    const { id } = req.params;

    const platform = await prisma.publishPlatform.findUnique({
      where: { id },
    });

    if (!platform) {
      return res.status(404).json({ error: '平台不存在' });
    }

    const smartPublisher = new SmartPublisher();
    const extensionStatus = await smartPublisher['extensionBridge'].getExtensionStatus();

    res.json({
      apiAvailable: platform.apiAvailable,
      extensionAvailable: extensionStatus.online,
      extensionRequired: platform.extensionRequired,
      recommendedMethod: platform.apiAvailable ? 'api' : 'extension',
    });
  } catch (error: any) {
    console.error('获取平台能力失败:', error);
    res.status(500).json({ error: error.message || '获取失败' });
  }
});

// 智能发布（自动选择发布方式）
publishRouter.post('/smart', async (req, res) => {
  try {
    const { contentType, contentId, platformId, mode, preferExtension } = req.body;

    if (!contentType || !contentId || !platformId) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 获取内容信息
    let contentTitle = '';
    if (contentType === 'article') {
      const article = await prisma.article.findUnique({
        where: { id: contentId },
        select: { title: true },
      });
      contentTitle = article?.title || '';
    }

    // 获取平台信息
    const platform = await prisma.publishPlatform.findUnique({
      where: { id: platformId },
    });

    if (!platform) {
      return res.status(404).json({ error: '平台不存在' });
    }

    // 决定发布方式
    const smartPublisher = new SmartPublisher();
    const decision = await smartPublisher.determinePublishMethod(
      platformId,
      preferExtension || false
    );

    // 创建发布记录
    const record = await prisma.publishRecord.create({
      data: {
        contentType,
        contentId,
        contentTitle,
        platformId,
        platformName: platform.name,
        publishMode: mode || 'draft',
        publishMethod: decision.method,
        status: 'pending',
      },
    });

    // 如果使用扩展发布，创建扩展任务
    let taskId: string | undefined;
    if (decision.method === 'extension') {
      const taskQueue = new ExtensionTaskQueue();
      const task = await taskQueue.createTask(
        record.id,
        mode === 'publish' ? 'publish' : 'draft',
        {
          contentType,
          contentId,
          platformName: platform.name,
          mode,
        }
      );
      taskId = task.id;

      // 更新发布记录
      await prisma.publishRecord.update({
        where: { id: record.id },
        data: { extensionTaskId: taskId },
      });
    }

    res.json({
      recordId: record.id,
      publishMethod: decision.method,
      taskId,
      reason: decision.reason,
    });
  } catch (error: any) {
    console.error('智能发布失败:', error);
    res.status(500).json({ error: error.message || '发布失败' });
  }
});
