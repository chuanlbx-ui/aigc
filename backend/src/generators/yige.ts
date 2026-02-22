/**
 * 文心一格 (百度) 图片生成器
 */

import {
  MediaGenerator,
  GenerateOptions,
  GeneratedMedia,
  ProviderInfo,
} from './base.js';

export class YigeGenerator extends MediaGenerator {
  readonly info: ProviderInfo = {
    id: 'yige',
    name: '文心一格',
    description: '百度图片生成服务，支持多种风格',
    supportedTypes: ['image'],
    requiresApiKey: true,
    apiKeyEnvVar: 'YIGE_API_KEY',
  };

  private accessToken: string | null = null;

  checkApiKey(): boolean {
    return !!process.env.YIGE_API_KEY && !!process.env.YIGE_SECRET_KEY;
  }

  async generate(options: GenerateOptions): Promise<GeneratedMedia> {
    if (!this.checkApiKey()) {
      throw new Error('未配置 YIGE_API_KEY 或 YIGE_SECRET_KEY');
    }

    const token = await this.getAccessToken();
    const { width, height } = this.getSize(options.orientation);
    const prompt = options.prompt || options.keywords.join(', ');

    const response = await fetch(
      `https://aip.baidubce.com/rpc/2.0/ernievilg/v1/txt2imgv2?access_token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          width,
          height,
          image_num: 1,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('文心一格请求失败');
    }

    const data = await response.json();
    const taskId = data.data?.task_id;

    if (!taskId) {
      throw new Error('文心一格创建任务失败');
    }

    // 轮询等待结果
    const result = await this.waitForResult(token, taskId);

    return {
      id: `yige-${Date.now()}`,
      type: 'image',
      url: result.url,
      width,
      height,
      provider: 'yige',
      keywords: options.keywords,
      createdAt: new Date(),
    };
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    const response = await fetch(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${process.env.YIGE_API_KEY}&client_secret=${process.env.YIGE_SECRET_KEY}`,
      { method: 'POST' }
    );

    const data = await response.json();
    this.accessToken = data.access_token;
    return this.accessToken!;
  }

  private async waitForResult(
    token: string,
    taskId: string,
    maxAttempts = 60
  ): Promise<{ url: string }> {
    for (let i = 0; i < maxAttempts; i++) {
      await this.sleep(2000);

      const response = await fetch(
        `https://aip.baidubce.com/rpc/2.0/ernievilg/v1/getImgv2?access_token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id: taskId }),
        }
      );

      const data = await response.json();
      const status = data.data?.task_status;

      if (status === 'SUCCESS') {
        const url = data.data?.sub_task_result_list?.[0]?.final_image_list?.[0]?.img_url;
        if (url) return { url };
      }

      if (status === 'FAILED') {
        throw new Error('文心一格生成失败');
      }
    }

    throw new Error('文心一格生成超时');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getSize(orientation: 'landscape' | 'portrait') {
    if (orientation === 'portrait') {
      return { width: 768, height: 1024 };
    }
    return { width: 1024, height: 768 };
  }
}
