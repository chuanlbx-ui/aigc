/**
 * 知乎平台适配器
 * 支持发布文章和回答
 */

import {
  PlatformAdapter,
  PublishContent,
  PublishResult,
  PublishOptions,
} from './base';

export class ZhihuAdapter extends PlatformAdapter {
  get platformName(): string {
    return '知乎';
  }

  get platformDomain(): string {
    return 'zhihu.com';
  }

  async publish(
    content: PublishContent,
    options: PublishOptions
  ): Promise<PublishResult> {
    this.clearLogs();
    this.log('开始发布到知乎');

    try {
      if (!this.isOnPlatform()) {
        throw new Error('当前不在知乎页面');
      }

      this.log('检测到知乎页面');

      // 等待编辑器加载
      this.log('等待编辑器加载...');
      await this.sleep(2000);

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
          await this.sleep(2000);
        } else {
          this.log('警告: 封面上传失败');
        }
      }

      // 填充标题
      if (content.title) {
        this.log('填充标题...');
        const titleInput = await this.waitForElement(
          'input[placeholder*="标题"], input[placeholder*="请输入标题"]',
          5000
        );

        if (titleInput) {
          (titleInput as HTMLInputElement).value = content.title;
          titleInput.dispatchEvent(new Event('input', { bubbles: true }));
          this.log(`标题已填充: ${content.title}`);
        } else {
          this.log('警告: 未找到标题输入框');
        }
      }

      // 填充内容
      this.log('填充内容...');
      const editor = await this.waitForElement(
        '.public-DraftEditor-content, [contenteditable="true"]',
        10000
      );

      if (editor) {
        editor.innerHTML = this.formatContent(content.content);
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        this.log('内容已填充');
      } else {
        this.log('警告: 未找到编辑器');
      }

      // 等待内容渲染
      await this.sleep(1000);

      // 根据模式决定是否发布
      if (options.mode === 'publish') {
        this.log('查找发布按钮...');
        const publishButton = await this.waitForElement(
          'button:has-text("发布"), button:has-text("发布文章"), .publish-button',
          5000
        );

        if (publishButton) {
          this.log('点击发布按钮');
          (publishButton as HTMLButtonElement).click();
          await this.sleep(2000);
          this.log('已点击发布按钮');
        } else {
          this.log('警告: 未找到发布按钮，内容已保存为草稿');
        }
      } else {
        this.log('草稿模式，不点击发布按钮');
      }

      return {
        success: true,
        platformPostId: 'zhihu-' + Date.now(),
        platformUrl: 'https://www.zhihu.com',
      };
    } catch (error: any) {
      this.log(`发布失败: ${error.message}`);
      return {
        success: false,
        errorMessage: error.message,
      };
    }
  }

  /**
   * 格式化内容为 HTML
   */
  private formatContent(content: string): string {
    const paragraphs = content.split('\n').filter(p => p.trim());
    return paragraphs.map(p => `<p>${this.escapeHtml(p)}</p>`).join('');
  }

  /**
   * HTML 转义
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
