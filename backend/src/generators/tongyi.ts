/**
 * 通义万相 (阿里云 DashScope) 图片生成器
 */

import {
  MediaGenerator,
  GenerateOptions,
  GeneratedMedia,
  ProviderInfo,
} from './base.js';

export class TongyiGenerator extends MediaGenerator {
  readonly info: ProviderInfo = {
    id: 'tongyi',
    name: '通义万相',
    description: '阿里云图片生成服务，中文理解好，延迟低',
    supportedTypes: ['image'],
    requiresApiKey: true,
    apiKeyEnvVar: 'DASHSCOPE_API_KEY',
  };

  checkApiKey(): boolean {
    return !!process.env.DASHSCOPE_API_KEY;
  }

  async generate(options: GenerateOptions): Promise<GeneratedMedia> {
    if (!this.checkApiKey()) {
      throw new Error('未配置 DASHSCOPE_API_KEY');
    }

    const { width, height } = this.getSize(options.orientation);
    const prompt = options.prompt || options.keywords.join(', ');

    // 创建任务
    const taskResponse = await this.createTask(prompt, width, height);
    const taskId = taskResponse.output?.task_id;

    if (!taskId) {
      throw new Error('通义万相创建任务失败');
    }

    // 轮询等待结果
    const result = await this.waitForResult(taskId);

    return {
      id: `tongyi-${Date.now()}`,
      type: 'image',
      url: result.url,
      width,
      height,
      provider: 'tongyi',
      keywords: options.keywords,
      createdAt: new Date(),
    };
  }

  private async createTask(
    prompt: string,
    width: number,
    height: number
  ): Promise<any> {
    const response = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify({
          model: 'wanx-v1',
          input: { prompt },
          parameters: {
            size: `${width}*${height}`,
            n: 1,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`通义万相请求失败: ${error}`);
    }

    return response.json();
  }

  private async waitForResult(
    taskId: string,
    maxAttempts = 60
  ): Promise<{ url: string }> {
    for (let i = 0; i < maxAttempts; i++) {
      await this.sleep(2000);

      const response = await fetch(
        `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
          },
        }
      );

      if (!response.ok) continue;

      const data = await response.json();
      const status = data.output?.task_status;

      if (status === 'SUCCEEDED') {
        const url = data.output?.results?.[0]?.url;
        if (url) return { url };
        throw new Error('通义万相未返回图片 URL');
      }

      if (status === 'FAILED') {
        throw new Error('通义万相生成失败');
      }
    }

    throw new Error('通义万相生成超时');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getSize(orientation: 'landscape' | 'portrait') {
    if (orientation === 'portrait') {
      return { width: 720, height: 1280 };
    }
    return { width: 1280, height: 720 };
  }
}
