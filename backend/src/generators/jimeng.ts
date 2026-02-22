/**
 * 即梦 (Jimeng/字节跳动) 图片/视频生成器
 * API 文档: https://www.jimeng.jianying.com/ai-tool/platform/docs
 */

import {
  MediaGenerator,
  GenerateOptions,
  GeneratedMedia,
  ProviderInfo,
} from './base.js';

export class JimengGenerator extends MediaGenerator {
  readonly info: ProviderInfo = {
    id: 'jimeng',
    name: '即梦 2.0',
    description: '字节跳动 AI 图片/视频生成，画质优秀',
    supportedTypes: ['image', 'video'],
    requiresApiKey: true,
    apiKeyEnvVar: 'JIMENG_API_KEY',
  };

  checkApiKey(): boolean {
    return !!process.env.JIMENG_API_KEY;
  }

  async generate(options: GenerateOptions): Promise<GeneratedMedia> {
    if (!this.checkApiKey()) {
      throw new Error('未配置 JIMENG_API_KEY');
    }

    const { width, height } = options.width && options.height
      ? { width: options.width, height: options.height }
      : this.getDefaultSize(options.orientation);

    const prompt = options.prompt || options.keywords.join(', ');

    // 创建生成任务
    const taskId = await this.createTask(prompt, width, height);

    // 轮询等待结果
    const result = await this.waitForResult(taskId);

    return {
      id: `jimeng-${Date.now()}`,
      type: 'image',
      url: result.url,
      width,
      height,
      provider: 'jimeng',
      keywords: options.keywords,
      createdAt: new Date(),
    };
  }

  private async createTask(prompt: string, width: number, height: number): Promise<string> {
    const response = await fetch('https://jimeng.jianying.com/mweb/v1/aigc/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.JIMENG_API_KEY}`,
      },
      body: JSON.stringify({
        prompt,
        width,
        height,
        model: 'jimeng-2.0',
        num: 1,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`即梦请求失败: ${err}`);
    }

    const data = await response.json();
    const taskId = data.data?.task_id;
    if (!taskId) throw new Error('即梦创建任务失败');
    return taskId;
  }

  private async waitForResult(taskId: string, maxAttempts = 60): Promise<{ url: string }> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 2000));

      try {
        const response = await fetch(`https://jimeng.jianying.com/mweb/v1/aigc/task/${taskId}`, {
          headers: { 'Authorization': `Bearer ${process.env.JIMENG_API_KEY}` },
        });

        if (!response.ok) continue;

        const data = await response.json();
        const status = data.data?.status;

        if (status === 'SUCCESS') {
          const url = data.data?.images?.[0]?.url;
          if (url) return { url };
          throw new Error('即梦未返回图片 URL');
        }
        if (status === 'FAILED') throw new Error('即梦生成失败');
      } catch (e: any) {
        if (e.message === '即梦生成失败' || e.message === '即梦未返回图片 URL') throw e;
        console.warn(`即梦轮询异常 (${i + 1}/${maxAttempts}):`, e.message);
      }
    }
    throw new Error('即梦生成超时');
  }
}
