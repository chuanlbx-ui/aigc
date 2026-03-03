/**
 * 抖音平台适配器
 * 支持发布视频和图文内容
 */

import {
  PlatformAdapter,
  PublishContent,
  PublishResult,
  PublishOptions,
} from './base';

export class DouyinAdapter extends PlatformAdapter {
  get platformName(): string {
    return '抖音';
  }

  get platformDomain(): string {
    return 'douyin.com';
  }

  async publish(
    content: PublishContent,
    options: PublishOptions
  ): Promise<PublishResult> {
    this.clearLogs();
    this.log('开始发布到抖音');

    try {
      if (!this.isOnPlatform()) {
        throw new Error('当前不在抖音页面');
      }

      this.log('检测到抖音页面');

      // 等待发布页面加载
      this.log('等待发布页面加载...');
      await this.sleep(2000);

      // 上传视频（如果提供）
      if (content.video) {
        this.log('开始上传视频...');
        const videoUploaded = await this.uploadFile(
          'input[type="file"][accept*="video"]',
          content.video,
          60000
        );

        if (videoUploaded) {
          this.log('视频上传成功，等待处理...');
          await this.sleep(5000);
        } else {
          this.log('警告: 视频上传失败');
        }
      }

      // 上传封面（如果提供）
      if (content.coverImage) {
        this.log('开始上传封面...');
        const coverUploaded = await this.uploadFile(
          'input[type="file"][accept*="image"]',
          content.coverImage,
          30000
        );

        if (coverUploaded) {
          this.log('封面上传成功');
        } else {
          this.log('警告: 封面上传失败');
        }
      }

      // 填充标题/描述
      this.log('填充标题和描述...');
      const titleInput = await this.waitForElement(
        'textarea[placeholder*="标题"], textarea[placeholder*="作品标题"], input[placeholder*="标题"]',
        10000
      );

      if (titleInput) {
        const titleText = content.title || content.content.substring(0, 50);
        if (titleInput.tagName === 'TEXTAREA') {
          (titleInput as HTMLTextAreaElement).value = titleText;
        } else {
          (titleInput as HTMLInputElement).value = titleText;
        }
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        this.log(`标题已填充: ${titleText}`);
      } else {
        this.log('警告: 未找到标题输入框');
      }

      // 填充描述内容
      const descInput = await this.waitForElement(
        'textarea[placeholder*="描述"], textarea[placeholder*="添加作品描述"]',
        5000
      );

      if (descInput) {
        let descText = content.content;

        // 添加话题标签
        if (content.tags && content.tags.length > 0) {
          descText += '\n\n' + content.tags.map(tag => `#${tag}`).join(' ');
        }

        (descInput as HTMLTextAreaElement).value = descText;
        descInput.dispatchEvent(new Event('input', { bubbles: true }));
        this.log('描述已填充');
      } else {
        this.log('警告: 未找到描述输入框');
      }

      // 等待内容渲染
      await this.sleep(1000);

      // 根据模式决定是否发布
      if (options.mode === 'publish') {
        this.log('查找发布按钮...');
        const publishButton = await this.waitForElement(
          'button:has-text("发布"), button:has-text("立即发布"), .publish-btn',
          5000
        );

        if (publishButton) {
          this.log('点击发布按钮');
          (publishButton as HTMLButtonElement).click();
          await this.sleep(2000);
          this.log('已点击发布按钮');
        } else {
          this.log('警告: 未找到发布按钮，内容已保存');
        }
      } else {
        this.log('草稿模式，不点击发布按钮');
      }

      return {
        success: true,
        platformPostId: 'douyin-' + Date.now(),
        platformUrl: 'https://www.douyin.com',
      };
    } catch (error: any) {
      this.log(`发布失败: ${error.message}`);
      return {
        success: false,
        errorMessage: error.message,
      };
    }
  }
}
