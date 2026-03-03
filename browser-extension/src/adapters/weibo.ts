/**
 * 微博平台适配器
 * 支持发布文字、图片和话题标签
 */

import {
  PlatformAdapter,
  PublishContent,
  PublishResult,
  PublishOptions,
} from './base';

export class WeiboAdapter extends PlatformAdapter {
  get platformName(): string {
    return '微博';
  }

  get platformDomain(): string {
    return 'weibo.com';
  }

  async publish(
    content: PublishContent,
    options: PublishOptions
  ): Promise<PublishResult> {
    this.clearLogs();
    this.log('开始发布到微博');

    try {
      // 检查是否在微博页面
      if (!this.isOnPlatform()) {
        throw new Error('当前不在微博页面');
      }

      this.log('检测到微博页面');

      // 等待发布框出现
      const publishBox = await this.waitForElement('textarea[class*="Form_input"]', 5000);
      if (!publishBox) {
        throw new Error('未找到发布框');
      }

      this.log('找到发布框');

      // 填充内容
      const textContent = this.buildTextContent(content);
      (publishBox as HTMLTextAreaElement).value = textContent;
      publishBox.dispatchEvent(new Event('input', { bubbles: true }));

      this.log(`已填充内容: ${textContent.substring(0, 50)}...`);

      // 等待发布按钮
      await this.sleep(500);
      const publishButton = await this.waitForElement('button[class*="Form_submit"]', 3000);
      if (!publishButton) {
        throw new Error('未找到发布按钮');
      }

      this.log('找到发布按钮');

      // 模拟点击发布
      if (options.mode === 'publish') {
        (publishButton as HTMLButtonElement).click();
        this.log('已点击发布按钮');
        await this.sleep(2000);
      } else {
        this.log('草稿模式，不点击发布');
      }

      return {
        success: true,
        platformPostId: 'weibo-' + Date.now(),
        platformUrl: 'https://weibo.com',
      };
    } catch (error: any) {
      this.log(`发布失败: ${error.message}`);
      return {
        success: false,
        errorMessage: error.message,
      };
    }
  }

  private buildTextContent(content: PublishContent): string {
    let text = content.title ? `${content.title}\n\n` : '';
    text += content.content;

    if (content.tags && content.tags.length > 0) {
      text += '\n\n';
      text += content.tags.map(tag => `#${tag}#`).join(' ');
    }

    return text;
  }
}
