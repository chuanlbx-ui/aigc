import { marked } from 'marked';
import {
  PublisherService,
  PlatformType,
  ContentType,
  PlatformConfig,
  PublishContent,
  PublishOptions,
  PublishResult,
} from './types';

export abstract class BasePublisher implements PublisherService {
  abstract readonly platformName: PlatformType;
  abstract readonly displayName: string;
  abstract readonly supportedContentTypes: ContentType[];

  abstract validateConfig(config: PlatformConfig): Promise<{ valid: boolean; error?: string }>;
  abstract refreshToken(config: PlatformConfig): Promise<PlatformConfig>;
  abstract publish(
    content: PublishContent,
    config: PlatformConfig,
    options: PublishOptions
  ): Promise<PublishResult>;

  // 检查令牌是否过期（提前5分钟刷新）
  protected isTokenExpired(config: PlatformConfig): boolean {
    if (!config.tokenExpireAt) return true;
    return new Date(config.tokenExpireAt).getTime() - Date.now() < 5 * 60 * 1000;
  }

  // Markdown 转 HTML
  protected async markdownToHtml(markdown: string): Promise<string> {
    return marked(markdown);
  }

  // 下载图片为 Buffer
  protected async downloadImage(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`下载图片失败: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
