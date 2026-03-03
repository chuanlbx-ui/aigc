/**
 * 平台适配器基类
 * 定义统一的发布接口
 */

export interface PublishContent {
  title: string;
  content: string;
  images?: string[];
  video?: string;           // 视频文件URL或路径
  coverImage?: string;      // 封面图片URL或路径
  tags?: string[];
  summary?: string;
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  platformUrl?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface PublishOptions {
  mode: 'draft' | 'publish';
  visibility?: 'public' | 'private' | 'followers';  // 可见性
  allowComment?: boolean;                            // 是否允许评论
  allowShare?: boolean;                              // 是否允许分享
  scheduledTime?: Date;                              // 定时发布时间
}

/**
 * 平台适配器基类
 */
export abstract class PlatformAdapter {
  protected logs: string[] = [];

  abstract get platformName(): string;
  abstract get platformDomain(): string;

  isOnPlatform(): boolean {
    return window.location.hostname.includes(this.platformDomain);
  }

  abstract publish(
    content: PublishContent,
    options: PublishOptions
  ): Promise<PublishResult>;

  protected log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    this.logs.push(logMessage);
    console.log(`[${this.platformName}] ${message}`);
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  protected async waitForElement(
    selector: string,
    timeout: number = 10000
  ): Promise<Element | null> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) return element;
      await this.sleep(100);
    }
    return null;
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 上传文件到指定的 input 元素
   */
  protected async uploadFile(
    inputSelector: string,
    fileUrl: string,
    timeout: number = 30000
  ): Promise<boolean> {
    try {
      this.log(`查找文件上传输入框: ${inputSelector}`);
      const input = await this.waitForElement(inputSelector, timeout);

      if (!input || input.tagName !== 'INPUT') {
        this.log('未找到文件上传输入框');
        return false;
      }

      this.log(`找到文件上传输入框，准备上传: ${fileUrl}`);

      // 获取文件
      const file = await this.fetchFileAsBlob(fileUrl);
      if (!file) {
        this.log('获取文件失败');
        return false;
      }

      // 创建 DataTransfer 对象
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      // 设置文件到 input
      (input as HTMLInputElement).files = dataTransfer.files;

      // 触发 change 事件
      input.dispatchEvent(new Event('change', { bubbles: true }));

      this.log('文件上传成功');
      return true;
    } catch (error: any) {
      this.log(`文件上传失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 从 URL 获取文件作为 Blob
   */
  private async fetchFileAsBlob(url: string): Promise<File | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }

      const blob = await response.blob();
      const filename = url.split('/').pop() || 'file';

      return new File([blob], filename, { type: blob.type });
    } catch (error) {
      return null;
    }
  }
}
