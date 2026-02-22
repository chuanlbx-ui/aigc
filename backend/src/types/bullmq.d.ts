// bullmq 可选依赖的类型声明
declare module 'bullmq' {
  export class Queue {
    constructor(name: string, options?: any);
    add(name: string, data: any, options?: any): Promise<any>;
    close(): Promise<void>;
  }

  export class Worker {
    constructor(name: string, processor: (job: any) => Promise<void>, options?: any);
    on(event: string, callback: (job: any, error?: any) => void): void;
    close(): Promise<void>;
  }
}
