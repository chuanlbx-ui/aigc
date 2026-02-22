/**
 * Runway Gen-3 视频生成器
 */

import {
  MediaGenerator,
  GenerateOptions,
  GeneratedMedia,
  ProviderInfo,
} from './base';

export class RunwayGenerator extends MediaGenerator {
  readonly info: ProviderInfo = {
    id: 'runway',
    name: 'Runway Gen-3',
    description: 'Runway 视频生成服务，质量高，支持多种控制方式',
    supportedTypes: ['video'],
    requiresApiKey: true,
    apiKeyEnvVar: 'RUNWAY_API_KEY',
  };

  checkApiKey(): boolean {
    return !!process.env.RUNWAY_API_KEY;
  }

  async generate(options: GenerateOptions): Promise<GeneratedMedia> {
    if (!this.checkApiKey()) {
      throw new Error('未配置 RUNWAY_API_KEY');
    }

    const prompt = options.prompt || options.keywords.join(', ');
    const { width, height } = this.getSize(options.orientation);

    // 创建视频生成任务
    const taskId = await this.createTask(prompt, width, height);

    // 轮询等待结果
    const result = await this.waitForResult(taskId);

    return {
      id: `runway-${Date.now()}`,
      type: 'video',
      url: result.url,
      width,
      height,
      duration: result.duration || 4,
      provider: 'runway',
      keywords: options.keywords,
      createdAt: new Date(),
    };
  }

  private async createTask(
    prompt: string,
    width: number,
    height: number
  ): Promise<string> {
    const response = await fetch(
      'https://api.runwayml.com/v1/text-to-video',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
        },
        body: JSON.stringify({
          prompt,
          model: 'gen3a_turbo',
          duration: 5,
          ratio: width > height ? '16:9' : '9:16',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Runway 请求失败: ${error}`);
    }

    const data = await response.json();
    return data.id;
  }

  private async waitForResult(
    taskId: string,
    maxAttempts = 120
  ): Promise<{ url: string; duration?: number }> {
    for (let i = 0; i < maxAttempts; i++) {
      await this.sleep(3000);

      const response = await fetch(
        `https://api.runwayml.com/v1/tasks/${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
          },
        }
      );

      if (!response.ok) continue;

      const data = await response.json();

      if (data.status === 'SUCCEEDED') {
        const url = data.output?.[0];
        if (url) return { url, duration: 5 };
      }

      if (data.status === 'FAILED') {
        throw new Error('Runway 生成失败');
      }
    }

    throw new Error('Runway 生成超时');
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
