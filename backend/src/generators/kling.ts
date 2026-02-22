/**
 * 可灵 AI (快手) 视频生成器
 */

import {
  MediaGenerator,
  GenerateOptions,
  GeneratedMedia,
  ProviderInfo,
} from './base.js';

export class KlingGenerator extends MediaGenerator {
  readonly info: ProviderInfo = {
    id: 'kling',
    name: '可灵 AI',
    description: '快手视频生成服务，支持文生视频和图生视频',
    supportedTypes: ['video'],
    requiresApiKey: true,
    apiKeyEnvVar: 'KLING_API_KEY',
  };

  checkApiKey(): boolean {
    return !!process.env.KLING_API_KEY;
  }

  async generate(options: GenerateOptions): Promise<GeneratedMedia> {
    if (!this.checkApiKey()) {
      throw new Error('未配置 KLING_API_KEY');
    }

    const prompt = options.prompt || options.keywords.join(', ');
    const { width, height } = this.getSize(options.orientation);

    // 创建视频生成任务
    const taskId = await this.createTask(prompt, width, height);

    // 轮询等待结果
    const result = await this.waitForResult(taskId);

    return {
      id: `kling-${Date.now()}`,
      type: 'video',
      url: result.url,
      width,
      height,
      duration: result.duration || 5,
      provider: 'kling',
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
      'https://api.klingai.com/v1/videos/text2video',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.KLING_API_KEY}`,
        },
        body: JSON.stringify({
          prompt,
          negative_prompt: '',
          cfg_scale: 0.5,
          mode: 'std',
          aspect_ratio: width > height ? '16:9' : '9:16',
          duration: '5',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`可灵 AI 请求失败: ${error}`);
    }

    const data = await response.json();
    return data.data?.task_id;
  }

  private async waitForResult(
    taskId: string,
    maxAttempts = 120
  ): Promise<{ url: string; duration?: number }> {
    for (let i = 0; i < maxAttempts; i++) {
      await this.sleep(3000);

      const response = await fetch(
        `https://api.klingai.com/v1/videos/text2video/${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.KLING_API_KEY}`,
          },
        }
      );

      if (!response.ok) continue;

      const data = await response.json();
      const status = data.data?.task_status;

      if (status === 'succeed') {
        const url = data.data?.task_result?.videos?.[0]?.url;
        const duration = data.data?.task_result?.videos?.[0]?.duration;
        if (url) return { url, duration };
      }

      if (status === 'failed') {
        throw new Error('可灵 AI 生成失败');
      }
    }

    throw new Error('可灵 AI 生成超时');
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
