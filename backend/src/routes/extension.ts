import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const extensionRouter = Router();

// 1. 检测扩展状态
extensionRouter.get('/status', async (req, res) => {
  try {
    const userId = req.query.userId as string | undefined;
    const extensionId = 'remotion-publisher-extension'; // 固定的扩展ID

    const status = await prisma.extensionStatus.findFirst({
      where: {
        userId: userId || null,
        extensionId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (!status) {
      return res.json({
        installed: false,
        enabled: false,
        version: null,
      });
    }

    // 检查是否在线（最后心跳时间在60秒内）
    const isOnline = status.lastPingAt &&
      (Date.now() - status.lastPingAt.getTime()) < 60000;

    res.json({
      installed: status.isInstalled,
      enabled: status.isEnabled,
      online: isOnline,
      version: status.version,
      lastPingAt: status.lastPingAt,
      browserType: status.browserType,
      connectionType: status.connectionType,
    });
  } catch (error: any) {
    console.error('检测扩展状态失败:', error);
    res.status(500).json({ error: error.message || '检测失败' });
  }
});

// 2. 扩展心跳
extensionRouter.post('/ping', async (req, res) => {
  try {
    const { extensionId, version, browserInfo } = req.body;
    const userId = req.body.userId || null;

    if (!extensionId || !version) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 先查找现有记录
    const existing = await prisma.extensionStatus.findFirst({
      where: {
        userId: userId,
        extensionId,
      },
    });

    let status;
    if (existing) {
      // 更新现有记录
      status = await prisma.extensionStatus.update({
        where: { id: existing.id },
        data: {
          version,
          isInstalled: true,
          isEnabled: true,
          lastPingAt: new Date(),
          browserType: browserInfo?.browserType,
          browserVersion: browserInfo?.browserVersion,
          connectionType: 'http_polling',
        },
      });
    } else {
      // 创建新记录
      status = await prisma.extensionStatus.create({
        data: {
          userId,
          extensionId,
          version,
          isInstalled: true,
          isEnabled: true,
          lastPingAt: new Date(),
          browserType: browserInfo?.browserType,
          browserVersion: browserInfo?.browserVersion,
          connectionType: 'http_polling',
        },
      });
    }

    res.json({
      success: true,
      serverTime: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('扩展心跳失败:', error);
    res.status(500).json({ error: error.message || '心跳失败' });
  }
});

// 3. 获取待处理任务
extensionRouter.get('/tasks/pending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const tasks = await prisma.extensionTask.findMany({
      where: {
        status: 'queued',
      },
      orderBy: [
        { priority: 'desc' },
        { queuedAt: 'asc' },
      ],
      take: limit,
    });

    // 更新任务状态为 sent
    if (tasks.length > 0) {
      await prisma.extensionTask.updateMany({
        where: {
          id: { in: tasks.map(t => t.id) },
        },
        data: {
          status: 'sent',
          sentAt: new Date(),
        },
      });
    }

    res.json({
      tasks: tasks.map(task => ({
        id: task.id,
        taskType: task.taskType,
        payload: JSON.parse(task.payload),
        timeoutSeconds: task.timeoutSeconds,
      })),
    });
  } catch (error: any) {
    console.error('获取待处理任务失败:', error);
    res.status(500).json({ error: error.message || '获取失败' });
  }
});

// 4. 更新任务状态
extensionRouter.post('/tasks/:taskId/status', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, progress, logs } = req.body;

    const task = await prisma.extensionTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'processing' && !task.startedAt) {
      updateData.startedAt = new Date();
    }

    await prisma.extensionTask.update({
      where: { id: taskId },
      data: updateData,
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('更新任务状态失败:', error);
    res.status(500).json({ error: error.message || '更新失败' });
  }
});

// 5. 完成任务
extensionRouter.post('/tasks/:taskId/complete', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { result, logs } = req.body;

    const task = await prisma.extensionTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }

    // 更新任务状态
    await prisma.extensionTask.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        result: JSON.stringify(result),
        completedAt: new Date(),
      },
    });

    // 更新发布记录
    await prisma.publishRecord.update({
      where: { id: task.publishRecordId },
      data: {
        status: result.success ? 'published' : 'failed',
        platformPostId: result.platformPostId,
        platformUrl: result.platformUrl,
        errorMessage: result.error,
        extensionLogs: JSON.stringify(logs || []),
        publishedAt: result.success ? new Date() : undefined,
      },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('完成任务失败:', error);
    res.status(500).json({ error: error.message || '完成失败' });
  }
});

// 6. 任务失败
extensionRouter.post('/tasks/:taskId/fail', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { error, logs } = req.body;

    const task = await prisma.extensionTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }

    // 检查是否需要重试
    const shouldRetry = task.retryCount < task.maxRetries;

    if (shouldRetry) {
      // 重试：重置为 queued 状态
      await prisma.extensionTask.update({
        where: { id: taskId },
        data: {
          status: 'queued',
          retryCount: task.retryCount + 1,
          nextRetryAt: new Date(Date.now() + 60000), // 1分钟后重试
        },
      });
    } else {
      // 不再重试：标记为失败
      await prisma.extensionTask.update({
        where: { id: taskId },
        data: {
          status: 'failed',
          result: JSON.stringify({ error }),
          completedAt: new Date(),
        },
      });

      // 更新发布记录
      await prisma.publishRecord.update({
        where: { id: task.publishRecordId },
        data: {
          status: 'failed',
          errorMessage: error,
          extensionLogs: JSON.stringify(logs || []),
        },
      });
    }

    res.json({ success: true, willRetry: shouldRetry });
  } catch (error: any) {
    console.error('任务失败处理失败:', error);
    res.status(500).json({ error: error.message || '处理失败' });
  }
});

