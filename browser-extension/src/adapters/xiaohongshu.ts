/**
 * 小红书平台适配器
 * 支持发布图文笔记
 */

import {
  PlatformAdapter,
  PublishContent,
  PublishResult,
  PublishOptions,
} from './base';

export class XiaohongshuAdapter extends PlatformAdapter {
  get platformName(): string {
    return '小红书';
  }

  get platformDomain(): string {
    return 'xiaohongshu.com';
  }

  async publish(
    content: PublishContent,
    options: PublishOptions
  ): Promise<PublishResult> {
    this.clearLogs();
    this.log('开始发布到小红书');

    try {
      if (!this.isOnPlatform()) {
        throw new Error('当前不在小红书页面');
      }

      this.log('检测到小红书页面');

      // 等待发布页面加载
      this.log('等待发布页面加载...');
      await this.sleep(2000);

      // 上传图片（如果提供）
      if (content.images && content.images.length > 0) {
        this.log(`开始上传 ${content.images.length} 张图片...`);
        for (let i = 0; i < content.images.length; i++) {
          const imageUploaded = await this.uploadFile(
            'input[type="file"][accept*="image"]',
            content.images[i],
            30000
          );

          if (imageUploaded) {
            this.log(`图片 ${i + 1} 上传成功`);
            await this.sleep(1000);
          } else {
            this.log(`警告: 图片 ${i + 1} 上传失败`);
          }
        }
      }

      // 填充标题
      this.log('填充标题...');
      const titleInput = await this.waitForElement(
        'input[placeholder*="标题"], input[placeholder*="填写标题"]',
        10000
      );

      if (titleInput) {
        const titleText = content.title || content.content.substring(0, 50);
        (titleInput as HTMLInputElement).value = titleText;
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        this.log(`标题已填充: ${titleText}`);
      } else {
        this.log('警告: 未找到标题输入框');
      }

      // 填充正文内容
      const contentInput = await this.waitForElement(
        'textarea[placeholder*="正文"], div[contenteditable="true"]',
        5000
      );

      if (contentInput) {
        let contentText = content.content;

        // 添加话题标签
        if (content.tags && content.tags.length > 0) {
          contentText += '\n\n' + content.tags.map(tag => `#${tag}`).join(' ');
        }

        if (contentInput.tagName === 'TEXTAREA') {
          (contentInput as HTMLTextAreaElement).value = contentText;
        } else {
          contentInput.innerHTML = contentText.replace(/\n/g, '<br>');
        }
        contentInput.dispatchEvent(new Event('input', { bubbles: true }));
        this.log('正文已填充');
      } else {
        this.log('警告: 未找到正文输入框');
      }

      // 等待内容渲染
      await this.sleep(1000);

      // 根据模式决定是否发布
      if (options.mode === 'publish') {
        this.log('查找发布按钮...');
        const publishButton = await this.waitForElement(
          'button:has-text("发布"), button:has-text("发布笔记"), .publish-btn',
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
        platformPostId: 'xiaohongshu-' + Date.now(),
        platformUrl: 'https://www.xiaohongshu.com',
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
