// 发布平台类型
export type PlatformType = 'wechat' | 'xiaohongshu' | 'toutiao' | 'zhihu';

// 内容类型
export type ContentType = 'article' | 'video';

// 发布模式
export type PublishMode = 'draft' | 'publish';

// 发布状态
export type PublishStatus =
  | 'pending'
  | 'processing'
  | 'draft_saved'
  | 'published'
  | 'failed'
  | 'cancelled';

// 平台配置接口
export interface PlatformConfig {
  id: string;
  name: PlatformType;
  displayName: string;
  appId?: string;
  appSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpireAt?: Date;
  accountId?: string;
  accountName?: string;
  config: Record<string, any>;
}

// 发布内容接口
export interface PublishContent {
  type: ContentType;
  id: string;
  title: string;
  content: string;
  summary?: string;
  coverImage?: string;
  tags?: string[];
  // 视频特有
  videoUrl?: string;
  videoDuration?: number;
}

// 发布选项
export interface PublishOptions {
  mode: PublishMode;
  scheduledAt?: Date;
  platformOptions?: Record<string, any>;
}

// 发布结果
export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  platformUrl?: string;
  errorCode?: string;
  errorMessage?: string;
}

// 发布服务接口
export interface PublisherService {
  readonly platformName: PlatformType;
  readonly displayName: string;
  readonly supportedContentTypes: ContentType[];

  validateConfig(config: PlatformConfig): Promise<{ valid: boolean; error?: string }>;
  refreshToken(config: PlatformConfig): Promise<PlatformConfig>;
  publish(
    content: PublishContent,
    config: PlatformConfig,
    options: PublishOptions
  ): Promise<PublishResult>;
  getPublishStatus?(platformPostId: string, config: PlatformConfig): Promise<PublishStatus>;
  delete?(platformPostId: string, config: PlatformConfig): Promise<boolean>;
}
