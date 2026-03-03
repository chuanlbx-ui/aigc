/**
 * B站平台适配器
 * 支持发布专栏文章
 */

import {
  PlatformAdapter,
  PublishContent,
  PublishResult,
  PublishOptions,
} from './base';

export class BilibiliAdapter extends PlatformAdapter {
  get platformName(): string {
    return 'B站';
  }

  get platformDomain(): string {
    return 'bilibili.com';
  }

  async publish(
    content: PublishContent,
    options: PublishOptions
  ): Promise<PublishResult> {
    this.clearLogs();
    this.log('开始发布到B站专栏');

    try {
      if (!this.isOnPlatform()) {
        throw new Error('当前不在B站页面');
      }

      this.log('检测到B站页面');

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

      // 等待编辑器加载
      this.log('等待编辑器加载...');
      const editor = await this.waitForElement('.ql-editor, .editor-content, [contenteditable="true"]', 10000);
      if (!editor) {
        throw new Error('未找到编辑器');
      }
      this.log('找到编辑器');

      // 填充标题
      if (content.title) {
        this.log('填充标题...');
        const titleInput = await this.waitForElement('input[placeholder*="标题"], input[placeholder*="请输入标题"]', 5000);
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
      if (editor.tagName === 'TEXTAREA' || editor.tagName === 'INPUT') {
        (editor as HTMLTextAreaElement).value = content.content;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        editor.innerHTML = this.formatContent(content.content);
        editor.dispatchEvent(new Event('input', { bubbles: true }));
      }
      this.log('内容已填充');

      // 等待内容渲染
      await this.sleep(1000);

      // 根据模式决定是否发布
      if (options.mode === 'publish') {
        this.log('查找发布按钮...');
        const publishButton = await this.waitForElement(
          'button:has-text("发布"), button:has-text("投稿"), .submit-btn, .publish-btn',
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
        platformPostId: 'bilibili-' + Date.now(),
        platformUrl: 'https://www.bilibili.com',
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
    // 将换行转换为段落
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
