/**
 * 定时发布调度器
 * 负责扫描和执行定时发布任务
 */

import { PrismaClient } from '@prisma/client';
import { getPublisher, getPlatformConfig } from './index';
import * as fs from 'fs';

const prisma = new PrismaClient();

export class PublishScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 60000; // 每分钟检查一次

  /**
   * 启动调度器
   */
  start(): void {
    console.log('定时发布调度器启动');

    // 立即执行一次
    this.checkScheduledTasks();

    // 定时检查
    this.intervalId = setInterval(() => {
      this.checkScheduledTasks();
    }, this.CHECK_INTERVAL);
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('定时发布调度器停止');
    }
  }

  /**
   * 检查并执行到期的定时任务
   */
  private async checkScheduledTasks(): Promise<void> {
    try {
      const now = new Date();

      // 查找到期的定时任务
      const tasks = await prisma.publishRecord.findMany({
        where: {
          status: 'pending',
          scheduledAt: {
            lte: now,
          },
        },
        take: 10, // 每次最多处理10个
      });

      if (tasks.length > 0) {
        console.log(`发现 ${tasks.length} 个到期的定时发布任务`);

        for (const task of tasks) {
          await this.executeTask(task.id);
        }
      }
    } catch (error) {
      console.error('检查定时任务失败:', error);
    }
  }

  /**
   * 执行单个发布任务
   */
  private async executeTask(recordId: string): Promise<void> {
    try {
      const record = await prisma.publishRecord.findUnique({
        where: { id: recordId },
      });

      if (!record) return;

      // 更新状态为处理中
      await prisma.publishRecord.update({
        where: { id: recordId },
        data: { status: 'processing' },
      });

      // 获取平台配置
      const platformConfig = await getPlatformConfig(record.platformId);
      if (!platformConfig) {
        throw new Error('平台配置不存在');
      }

      // 获取内容
      const content = await this.getPublishContent(record.contentType, record.contentId);
      if (!content) {
        throw new Error('内容不存在');
      }

      // 执行发布
      const publisher = getPublisher(platformConfig.name);
      const result = await publisher.publish(content, platformConfig, {
        mode: record.publishMode as 'draft' | 'publish',
      });

      // 更新记录
      await prisma.publishRecord.update({
        where: { id: recordId },
        data: {
          status: result.success
            ? (record.publishMode === 'draft' ? 'draft_saved' : 'published')
            : 'failed',
          platformPostId: result.platformPostId,
          platformUrl: result.platformUrl,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          publishedAt: result.success ? new Date() : undefined,
        },
      });

      console.log(`定时任务 ${recordId} 执行${result.success ? '成功' : '失败'}`);
    } catch (error: any) {
      console.error(`执行定时任务 ${recordId} 失败:`, error);

      await prisma.publishRecord.update({
        where: { id: recordId },
        data: {
          status: 'failed',
          errorMessage: error.message || '执行失败',
        },
      });
    }
  }

  /**
   * 获取发布内容
   */
  private async getPublishContent(contentType: string, contentId: string): Promise<any> {
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
}

// 导出单例
export const publishScheduler = new PublishScheduler();
