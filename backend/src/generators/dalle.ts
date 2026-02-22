/**
 * DALL-E 3 图片生成器
 */

import OpenAI from 'openai';
import {
  MediaGenerator,
  GenerateOptions,
  GeneratedMedia,
  ProviderInfo,
} from './base.js';

export class DalleGenerator extends MediaGenerator {
  readonly info: ProviderInfo = {
    id: 'dalle',
    name: 'DALL-E 3',
    description: 'OpenAI 的图片生成模型，质量高，理解力强',
    supportedTypes: ['image'],
    requiresApiKey: true,
    apiKeyEnvVar: 'OPENAI_API_KEY',
  };

  private client: OpenAI | null = null;

  checkApiKey(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  private getClient(): OpenAI {
    if (!this.client) {
      if (!this.checkApiKey()) {
        throw new Error('未配置 OPENAI_API_KEY');
      }
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    return this.client;
  }

  async generate(options: GenerateOptions): Promise<GeneratedMedia> {
    const client = this.getClient();
    const size = this.getDalleSize(options.orientation);

    // 构建提示词
    const prompt = this.buildPrompt(options);

    const response = await client.images.generate({
      model: 'dall-e-3',
      prompt,
      size,
      quality: options.quality || 'standard',
      n: 1,
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error('DALL-E 未返回图片');
    }

    const dimensions = this.getSizeFromDalleSize(size);

    return {
      id: `dalle-${Date.now()}`,
      type: 'image',
      url: imageUrl,
      width: dimensions.width,
      height: dimensions.height,
      provider: 'dalle',
      keywords: options.keywords,
      createdAt: new Date(),
    };
  }

  private buildPrompt(options: GenerateOptions): string {
    const base = options.prompt || options.keywords.join(', ');
    return `${base}, professional photography, high quality, cinematic lighting, 8k resolution`;
  }

  private getDalleSize(
    orientation: 'landscape' | 'portrait'
  ): '1024x1024' | '1792x1024' | '1024x1792' {
    if (orientation === 'portrait') {
      return '1024x1792';
    }
    return '1792x1024';
  }

  private getSizeFromDalleSize(
    size: '1024x1024' | '1792x1024' | '1024x1792'
  ): { width: number; height: number } {
    const [w, h] = size.split('x').map(Number);
    return { width: w, height: h };
  }
}
