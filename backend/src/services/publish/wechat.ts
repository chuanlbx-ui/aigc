import FormData from 'form-data';
import axios from 'axios';
import { BasePublisher } from './base';
import {
  PlatformType,
  ContentType,
  PlatformConfig,
  PublishContent,
  PublishOptions,
  PublishResult,
} from './types';

export class WechatPublisher extends BasePublisher {
  readonly platformName: PlatformType = 'wechat';
  readonly displayName = '微信公众号';
  readonly supportedContentTypes: ContentType[] = ['article'];

  private baseUrl = 'https://api.weixin.qq.com/cgi-bin';

  async validateConfig(config: PlatformConfig): Promise<{ valid: boolean; error?: string }> {
    if (!config.appId || !config.appSecret) {
      return { valid: false, error: '缺少 AppID 或 AppSecret' };
    }
    try {
      await this.getAccessToken(config);
      return { valid: true };
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }

  // 获取公众号基本信息
  async getAccountInfo(config: PlatformConfig): Promise<{ name?: string; avatar?: string }> {
    try {
      const token = await this.getAccessToken(config);
      // 获取公众号设置的头像和名称需要通过获取素材列表间接获取
      // 这里简化处理，返回空
      return {};
    } catch {
      return {};
    }
  }

  async refreshToken(config: PlatformConfig): Promise<PlatformConfig> {
    const url = `${this.baseUrl}/token?grant_type=client_credential&appid=${config.appId}&secret=${config.appSecret}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.errcode) {
      throw new Error(`微信 API 错误: ${data.errmsg}`);
    }

    return {
      ...config,
      accessToken: data.access_token,
      tokenExpireAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  // 默认封面图 URL（一张简洁的默认图片）
  private defaultCoverUrl = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=900&h=500&fit=crop';

  async publish(
    content: PublishContent,
    config: PlatformConfig,
    options: PublishOptions
  ): Promise<PublishResult> {
    try {
      // 确保 token 有效
      if (this.isTokenExpired(config)) {
        config = await this.refreshToken(config);
      }

      // 上传封面图片（微信草稿必须有封面图，没有则使用默认图）
      let thumbMediaId: string;
      const coverUrl = content.coverImage || this.defaultCoverUrl;
      try {
        thumbMediaId = await this.uploadMaterial(coverUrl, config, 'thumb');
      } catch (err: any) {
        return {
          success: false,
          errorCode: 'UPLOAD_COVER_FAILED',
          errorMessage: `封面图上传失败: ${err.message}`,
        };
      }

      // 处理文章内容
      const htmlContent = await this.processContent(content.content, config);

      // 创建草稿
      const draftResult = await this.createDraft({
        title: content.title,
        content: htmlContent,
        thumb_media_id: thumbMediaId,
        digest: content.summary?.slice(0, 120),
      }, config);

      if (draftResult.errcode) {
        return {
          success: false,
          errorCode: String(draftResult.errcode),
          errorMessage: draftResult.errmsg,
        };
      }

      // 直接发布模式
      if (options.mode === 'publish') {
        const publishResult = await this.publishDraft(draftResult.media_id, config);
        if (publishResult.errcode) {
          return {
            success: false,
            errorCode: String(publishResult.errcode),
            errorMessage: publishResult.errmsg,
          };
        }
      }

      return {
        success: true,
        platformPostId: draftResult.media_id,
      };
    } catch (error: any) {
      return {
        success: false,
        errorCode: 'UNKNOWN',
        errorMessage: error.message,
      };
    }
  }

  // 获取 access_token
  private async getAccessToken(config: PlatformConfig): Promise<string> {
    if (config.accessToken && !this.isTokenExpired(config)) {
      return config.accessToken;
    }
    const updated = await this.refreshToken(config);
    return updated.accessToken!;
  }

  // 上传素材
  private async uploadMaterial(
    imageUrl: string,
    config: PlatformConfig,
    type: 'image' | 'thumb'
  ): Promise<string> {
    const token = await this.getAccessToken(config);
    const url = `${this.baseUrl}/material/add_material?access_token=${token}&type=${type}`;

    const imageBuffer = await this.downloadImage(imageUrl);
    const form = new FormData();
    form.append('media', imageBuffer, { filename: 'cover.jpg', contentType: 'image/jpeg' });

    const res = await axios.post(url, form, {
      headers: form.getHeaders(),
    });
    const data = res.data;

    if (data.errcode) {
      throw new Error(`上传素材失败: ${data.errmsg}`);
    }
    return data.media_id;
  }

  // 处理内容中的图片
  private async processContent(markdown: string, config: PlatformConfig): Promise<string> {
    let html = await this.markdownToHtml(markdown);
    // TODO: 提取并上传图片，替换为微信图片链接
    return html;
  }

  // 创建草稿
  private async createDraft(article: any, config: PlatformConfig): Promise<any> {
    const token = await this.getAccessToken(config);
    const url = `${this.baseUrl}/draft/add?access_token=${token}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articles: [article] }),
    });
    return res.json();
  }

  // 发布草稿
  private async publishDraft(mediaId: string, config: PlatformConfig): Promise<any> {
    const token = await this.getAccessToken(config);
    const url = `${this.baseUrl}/freepublish/submit?access_token=${token}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media_id: mediaId }),
    });
    return res.json();
  }
}
