import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 扩展任务队列管理器
 */
export class ExtensionTaskQueue {
  /**
   * 创建扩展任务
   */
  async createTask(
    publishRecordId: string,
    taskType: 'publish' | 'draft' | 'delete',
    payload: any,
    priority: number = 0
  ) {
    try {
      const task = await prisma.extensionTask.create({
        data: {
          publishRecordId,
          taskType,
          payload: JSON.stringify(payload),
          priority,
          status: 'queued',
        },
      });

      return task;
    } catch (error) {
      console.error('创建扩展任务失败:', error);
      throw error;
    }
  }

  /**
   * 获取待处理任务
   */
  async getPendingTasks(limit: number = 10) {
    try {
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

      return tasks;
    } catch (error) {
      console.error('获取待处理任务失败:', error);
      throw error;
    }
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(
    taskId: string,
    status: string,
    data?: any
  ) {
    try {
      await prisma.extensionTask.update({
        where: { id: taskId },
        data: {
          status,
          ...data,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('更新任务状态失败:', error);
      throw error;
    }
  }
}
