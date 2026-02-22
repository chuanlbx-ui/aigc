/**
 * 任务队列服务
 * 支持两种模式：
 * - 内存队列（开发环境，无需 Redis）
 * - Redis 队列（生产环境，使用 BullMQ）
 */

import PQueue from 'p-queue';

// 队列配置
const REDIS_URL = process.env.REDIS_URL;
const QUEUE_MODE = REDIS_URL ? 'redis' : 'memory';

console.log(`[Queue] 队列模式: ${QUEUE_MODE}`);

// 任务处理器类型
type JobProcessor<T> = (data: T) => Promise<void>;

// 任务状态
export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';

// 任务信息
export interface JobInfo<T = unknown> {
  id: string;
  name: string;
  data: T;
  status: JobStatus;
  progress: number;
  failedReason?: string;
  createdAt: Date;
  processedAt?: Date;
  finishedAt?: Date;
}

// 队列接口
export interface QueueService<T> {
  add(name: string, data: T, options?: { priority?: number; delay?: number }): Promise<string>;
  process(processor: JobProcessor<T>): void;
  getJob(jobId: string): Promise<JobInfo<T> | null>;
  getJobs(status?: JobStatus[]): Promise<JobInfo<T>[]>;
  removeJob(jobId: string): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  close(): Promise<void>;
}

// ========== 内存队列实现 ==========

class MemoryQueue<T> implements QueueService<T> {
  private queue: PQueue;
  private jobs: Map<string, JobInfo<T>> = new Map();
  private processor?: JobProcessor<T>;
  private jobCounter = 0;
  private isPaused = false;

  constructor(concurrency: number = 1) {
    this.queue = new PQueue({ concurrency });
  }

  async add(name: string, data: T, options?: { priority?: number; delay?: number }): Promise<string> {
    const jobId = `job-${++this.jobCounter}-${Date.now()}`;

    const jobInfo: JobInfo<T> = {
      id: jobId,
      name,
      data,
      status: 'waiting',
      progress: 0,
      createdAt: new Date(),
    };

    this.jobs.set(jobId, jobInfo);

    // 延迟执行
    const delay = options?.delay || 0;

    if (delay > 0) {
      jobInfo.status = 'delayed';
      setTimeout(() => this.enqueue(jobId), delay);
    } else {
      this.enqueue(jobId);
    }

    return jobId;
  }

  private enqueue(jobId: string): void {
    if (this.isPaused) return;

    const jobInfo = this.jobs.get(jobId);
    if (!jobInfo) return;

    this.queue.add(async () => {
      if (!this.processor) {
        console.warn(`[MemoryQueue] 未设置处理器，跳过任务: ${jobId}`);
        return;
      }

      jobInfo.status = 'active';
      jobInfo.processedAt = new Date();

      try {
        await this.processor(jobInfo.data);
        jobInfo.status = 'completed';
        jobInfo.progress = 100;
        jobInfo.finishedAt = new Date();
      } catch (error) {
        jobInfo.status = 'failed';
        jobInfo.failedReason = error instanceof Error ? error.message : '未知错误';
        jobInfo.finishedAt = new Date();
        console.error(`[MemoryQueue] 任务失败: ${jobId}`, error);
      }
    });
  }

  process(processor: JobProcessor<T>): void {
    this.processor = processor;
  }

  async getJob(jobId: string): Promise<JobInfo<T> | null> {
    return this.jobs.get(jobId) || null;
  }

  async getJobs(status?: JobStatus[]): Promise<JobInfo<T>[]> {
    const allJobs = Array.from(this.jobs.values());
    if (!status || status.length === 0) {
      return allJobs;
    }
    return allJobs.filter(job => status.includes(job.status));
  }

  async removeJob(jobId: string): Promise<void> {
    this.jobs.delete(jobId);
  }

  async pause(): Promise<void> {
    this.isPaused = true;
    this.queue.pause();
  }

  async resume(): Promise<void> {
    this.isPaused = false;
    this.queue.start();
  }

  async close(): Promise<void> {
    this.queue.clear();
    this.jobs.clear();
  }
}

// ========== Redis 队列实现（BullMQ） ==========

class RedisQueue<T> implements QueueService<T> {
  private queueName: string;
  private queue: any; // BullMQ Queue
  private worker: any; // BullMQ Worker
  private initialized = false;

  constructor(queueName: string, _concurrency: number = 1) {
    this.queueName = queueName;
    // BullMQ 需要动态导入，因为可能未安装
    this.initBullMQ(_concurrency);
  }

  private async initBullMQ(concurrency: number): Promise<void> {
    try {
      // 动态导入 BullMQ
      const { Queue, Worker } = await import('bullmq');

      const connection = {
        url: REDIS_URL,
      };

      this.queue = new Queue(this.queueName, { connection });

      // Worker 在 process() 调用时创建
      this.initialized = true;
      console.log(`[RedisQueue] 队列 ${this.queueName} 初始化成功`);
    } catch (error) {
      console.error('[RedisQueue] BullMQ 初始化失败，请安装: npm install bullmq');
      console.error('[RedisQueue] 回退到内存队列模式');
      throw error;
    }
  }

  async add(name: string, data: T, options?: { priority?: number; delay?: number }): Promise<string> {
    if (!this.initialized) {
      throw new Error('队列未初始化');
    }

    const job = await this.queue.add(name, data, {
      priority: options?.priority,
      delay: options?.delay,
    });

    return job.id;
  }

  process(processor: JobProcessor<T>): void {
    if (!this.initialized) {
      console.error('[RedisQueue] 队列未初始化');
      return;
    }

    import('bullmq').then(({ Worker }) => {
      this.worker = new Worker(
        this.queueName,
        async (job: any) => {
          await processor(job.data);
        },
        {
          connection: { url: REDIS_URL },
        }
      );

      this.worker.on('completed', (job: any) => {
        console.log(`[RedisQueue] 任务完成: ${job.id}`);
      });

      this.worker.on('failed', (job: any, err: Error) => {
        console.error(`[RedisQueue] 任务失败: ${job.id}`, err);
      });
    });
  }

  async getJob(jobId: string): Promise<JobInfo<T> | null> {
    if (!this.initialized) return null;

    const job = await this.queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      status: state as JobStatus,
      progress: job.progress || 0,
      failedReason: job.failedReason,
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
    };
  }

  async getJobs(status?: JobStatus[]): Promise<JobInfo<T>[]> {
    if (!this.initialized) return [];

    const states = status || ['waiting', 'active', 'completed', 'failed', 'delayed'];
    const jobs = await this.queue.getJobs(states);

    return Promise.all(
      jobs.map(async (job: any) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        status: (await job.getState()) as JobStatus,
        progress: job.progress || 0,
        failedReason: job.failedReason,
        createdAt: new Date(job.timestamp),
        processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
        finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      }))
    );
  }

  async removeJob(jobId: string): Promise<void> {
    if (!this.initialized) return;

    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }

  async pause(): Promise<void> {
    if (this.initialized && this.queue) {
      await this.queue.pause();
    }
  }

  async resume(): Promise<void> {
    if (this.initialized && this.queue) {
      await this.queue.resume();
    }
  }

  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
    if (this.queue) {
      await this.queue.close();
    }
  }
}

// ========== 队列工厂 ==========

export function createQueue<T>(name: string, concurrency: number = 1): QueueService<T> {
  if (QUEUE_MODE === 'redis') {
    try {
      return new RedisQueue<T>(name, concurrency);
    } catch {
      console.warn('[Queue] Redis 队列创建失败，回退到内存队列');
      return new MemoryQueue<T>(concurrency);
    }
  }

  return new MemoryQueue<T>(concurrency);
}

// 导出默认渲染队列
export const videoRenderQueue = createQueue<{ taskId: string; projectId: string; config: string }>('video-render', 1);
