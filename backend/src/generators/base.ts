/**
 * 媒体生成器基类
 */

export type MediaType = 'image' | 'video';
export type Orientation = 'landscape' | 'portrait';

export interface GenerateOptions {
  prompt: string;
  keywords: string[];
  orientation: Orientation;
  width?: number;
  height?: number;
  quality?: 'standard' | 'hd';
  style?: string;
}

export interface GeneratedMedia {
  id: string;
  type: MediaType;
  url?: string;
  localPath?: string;
  width: number;
  height: number;
  duration?: number; // 视频时长（秒）
  provider: string;
  keywords: string[];
  createdAt: Date;
}

export interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  supportedTypes: MediaType[];
  requiresApiKey: boolean;
  apiKeyEnvVar?: string;
}

export abstract class MediaGenerator {
  abstract readonly info: ProviderInfo;

  /**
   * 检查 API Key 是否已配置
   */
  abstract checkApiKey(): boolean;

  /**
   * 生成媒体
   */
  abstract generate(options: GenerateOptions): Promise<GeneratedMedia>;

  /**
   * 下载媒体到本地
   */
  async downloadToLocal(media: GeneratedMedia, outputDir: string): Promise<string> {
    if (!media.url) {
      throw new Error('媒体没有 URL');
    }

    const fs = await import('fs');
    const path = await import('path');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const ext = media.type === 'video' ? '.mp4' : '.png';
    const filename = `${media.provider}-${Date.now()}${ext}`;
    const filepath = path.join(outputDir, filename);

    const response = await fetch(media.url);
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filepath, buffer);

    return filepath;
  }

  /**
   * 获取默认尺寸
   */
  protected getDefaultSize(orientation: Orientation): { width: number; height: number } {
    if (orientation === 'portrait') {
      return { width: 1080, height: 1920 };
    }
    return { width: 1920, height: 1080 };
  }
}
