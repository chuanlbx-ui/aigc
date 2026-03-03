/**
 * 任务管理器
 * 负责轮询任务、执行任务和管理任务状态
 */

import { APIClient, ExtensionTask } from './apiClient';
import { WeiboAdapter } from '../adapters/weibo';
import { BilibiliAdapter } from '../adapters/bilibili';
import { DouyinAdapter } from '../adapters/douyin';
import { KuaishouAdapter } from '../adapters/kuaishou';
import { WeixinChannelsAdapter } from '../adapters/weixin-channels';
import { XiaohongshuAdapter } from '../adapters/xiaohongshu';
import { ZhihuAdapter } from '../adapters/zhihu';
import { PlatformAdapter } from '../adapters/base';

export class TaskManager {
  private apiClient: APIClient;
  private pollingInterval: number | null = null;
  private readonly POLL_INTERVAL = 5000; // 5秒轮询一次
  private readonly PING_INTERVAL = 30000; // 30秒心跳一次
  private pingInterval: number | null = null;
  private isProcessing = false;

  constructor() {
    this.apiClient = new APIClient();
  }

  /**
   * 启动任务管理器
   */
  start(): void {
    console.log('任务管理器启动');

    // 启动心跳
    this.startPing();

    // 启动任务轮询
    this.startPolling();
  }

  /**
   * 停止任务管理器
   */
  stop(): void {
    console.log('任务管理器停止');

    if (this.pollingInterval !== null) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * 启动心跳
   */
  private startPing(): void {
    // 立即发送一次心跳
    this.apiClient.ping();

    // 定时发送心跳
    this.pingInterval = setInterval(() => {
      this.apiClient.ping();
    }, this.PING_INTERVAL) as unknown as number;
  }

  /**
   * 启动任务轮询
   */
  private startPolling(): void {
    // 立即执行一次
    this.pollTasks();

    // 定时轮询
    this.pollingInterval = setInterval(() => {
      this.pollTasks();
    }, this.POLL_INTERVAL) as unknown as number;
  }

  /**
   * 轮询任务
   */
  private async pollTasks(): Promise<void> {
    if (this.isProcessing) {
      return; // 如果正在处理任务，跳过本次轮询
    }

    try {
      const tasks = await this.apiClient.getPendingTasks();

      if (tasks.length > 0) {
        console.log(`获取到 ${tasks.length} 个待处理任务`);
        await this.processTasks(tasks);
      }
    } catch (error) {
      console.error('轮询任务失败:', error);
    }
  }

  /**
   * 处理任务列表
   */
  private async processTasks(tasks: ExtensionTask[]): Promise<void> {
    this.isProcessing = true;

    for (const task of tasks) {
      await this.processTask(task);
    }

    this.isProcessing = false;
  }

  /**
   * 处理单个任务
   */
  private async processTask(task: ExtensionTask): Promise<void> {
    const logs: string[] = [];
    logs.push(`开始处理任务: ${task.id}`);

    try {
      // 更新任务状态为处理中
      await this.apiClient.updateTaskStatus(task.id, 'processing', 0, logs);

      // 解析任务数据
      const payload = JSON.parse(task.payload);
      logs.push(`任务类型: ${task.taskType}`);
      logs.push(`平台: ${payload.platformName}`);

      // 根据平台类型选择对应的适配器
      const adapter = this.getAdapter(payload.platformName);
      if (!adapter) {
        throw new Error(`不支持的平台: ${payload.platformName}`);
      }

      logs.push(`使用适配器: ${adapter.platformName}`);

      // 执行发布
      const result = await adapter.publish(payload.content, {
        mode: task.taskType === 'publish' ? 'publish' : 'draft',
      });

      logs.push(...adapter.getLogs());

      // 标记任务完成
      await this.apiClient.completeTask(task.id, result, logs);

    } catch (error: any) {
      logs.push(`任务执行失败: ${error.message}`);
      console.error('处理任务失败:', error);

      // 标记任务失败
      await this.apiClient.failTask(task.id, error.message, logs);
    }
  }

  private getAdapter(platformName: string): PlatformAdapter | null {
    switch (platformName.toLowerCase()) {
      case 'weibo':
      case '微博':
        return new WeiboAdapter();
      case 'bilibili':
      case 'b站':
        return new BilibiliAdapter();
      case 'douyin':
      case '抖音':
        return new DouyinAdapter();
      case 'kuaishou':
      case '快手':
        return new KuaishouAdapter();
      case 'weixin-channels':
      case '微信视频号':
      case '视频号':
        return new WeixinChannelsAdapter();
      case 'xiaohongshu':
      case '小红书':
        return new XiaohongshuAdapter();
      case 'zhihu':
      case '知乎':
        return new ZhihuAdapter();
      default:
        return null;
    }
  }
}
