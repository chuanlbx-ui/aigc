/**
 * Pika Labs 视频生成器
 */

import {
  MediaGenerator,
  GenerateOptions,
  GeneratedMedia,
  ProviderInfo,
} from './base.js';

export class PikaGenerator extends MediaGenerator {
  readonly info: ProviderInfo = {
    id: 'pika',
    name: 'Pika Labs',
    description: 'Pika 视频生成服务，简单易用，适合短视频',
    supportedTypes: ['video'],
    requiresApiKey: true,
    apiKeyEnvVar: 'PIKA_API_KEY',
  };

  checkApiKey(): boolean {
    return !!process.env.PIKA_API_KEY;
  }

  async generate(options: GenerateOptions): Promise<GeneratedMedia> {
    if (!this.checkApiKey()) {
      throw new Error('未配置 PIKA_API_KEY');
    }

    const prompt = options.prompt || options.keywords.join(', ');
    const { width, height } = this.getSize(options.orientation);

    // 创建视频生成任务
    const taskId = await this.createTask(prompt, width, height);

    // 轮询等待结果
    const result = await this.waitForResult(taskId);

    return {
      id: `pika-${Date.now()}`,
      type: 'video',
      url: result.url,
      width,
      height,
      duration: result.duration || 3,
      provider: 'pika',
      keywords: options.keywords,
      createdAt: new Date(),
    };
  }

  private async createTask(
    prompt: string,
    width: number,
    height: number
  ): Promise<string> {
    const response = await fetch('https://api.pika.art/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.PIKA_API_KEY}`,
      },
      body: JSON.stringify({
        prompt,
        aspectRatio: width > height ? '16:9' : '9:16',
        duration: 3,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pika 请求失败: ${error}`);
    }

    const data = await response.json();
    return data.id;
  }

  private async waitForResult(
    taskId: string,
    maxAttempts = 60
  ): Promise<{ url: string; duration?: number }> {
    for (let i = 0; i < maxAttempts; i++) {
      await this.sleep(3000);

      const response = await fetch(
        `https://api.pika.art/v1/generate/${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PIKA_API_KEY}`,
          },
        }
      );

      if (!response.ok) continue;

      const data = await response.json();

      if (data.status === 'completed') {
        const url = data.video?.url;
        if (url) return { url, duration: 3 };
      }

      if (data.status === 'failed') {
        throw new Error('Pika 生成失败');
      }
    }

    throw new Error('Pika 生成超时');
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
