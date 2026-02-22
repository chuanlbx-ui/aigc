/**
 * Stability AI (SDXL) 图片生成器
 */

import {
  MediaGenerator,
  GenerateOptions,
  GeneratedMedia,
  ProviderInfo,
} from './base.js';

export class StabilityGenerator extends MediaGenerator {
  readonly info: ProviderInfo = {
    id: 'stability',
    name: 'Stability AI',
    description: 'SDXL 模型，风格多样，性价比高',
    supportedTypes: ['image'],
    requiresApiKey: true,
    apiKeyEnvVar: 'STABILITY_API_KEY',
  };

  checkApiKey(): boolean {
    return !!process.env.STABILITY_API_KEY;
  }

  async generate(options: GenerateOptions): Promise<GeneratedMedia> {
    if (!this.checkApiKey()) {
      throw new Error('未配置 STABILITY_API_KEY');
    }

    const { width, height } = this.getStabilitySize(options.orientation);
    const prompt = this.buildPrompt(options);

    const response = await fetch(
      'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
        },
        body: JSON.stringify({
          text_prompts: [{ text: prompt, weight: 1 }],
          cfg_scale: 7,
          width,
          height,
          samples: 1,
          steps: 30,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stability AI 生成失败: ${error}`);
    }

    const data = await response.json();
    const base64Image = data.artifacts?.[0]?.base64;

    if (!base64Image) {
      throw new Error('Stability AI 未返回图片');
    }

    // 返回 base64 数据 URL
    return {
      id: `stability-${Date.now()}`,
      type: 'image',
      url: `data:image/png;base64,${base64Image}`,
      width,
      height,
      provider: 'stability',
      keywords: options.keywords,
      createdAt: new Date(),
    };
  }

  private buildPrompt(options: GenerateOptions): string {
    const base = options.prompt || options.keywords.join(', ');
    return `${base}, high quality, detailed, professional`;
  }

  private getStabilitySize(orientation: 'landscape' | 'portrait') {
    // SDXL 支持的尺寸
    if (orientation === 'portrait') {
      return { width: 768, height: 1344 };
    }
    return { width: 1344, height: 768 };
  }
}
