/**
 * 浏览器扩展检测工具
 * 负责检测扩展安装状态、版本信息和在线状态
 */

export interface ExtensionStatus {
  installed: boolean;
  enabled: boolean;
  online: boolean;
  version: string | null;
  lastPingAt?: Date;
  browserType?: string;
  connectionType?: string;
}

type StatusChangeCallback = (status: ExtensionStatus) => void;

export class ExtensionDetector {
  private static instance: ExtensionDetector;
  private currentStatus: ExtensionStatus | null = null;
  private subscribers: Set<StatusChangeCallback> = new Set();
  private monitoringInterval: number | null = null;
  private readonly POLL_INTERVAL = 30000; // 30秒轮询一次

  private constructor() {}

  static getInstance(): ExtensionDetector {
    if (!ExtensionDetector.instance) {
      ExtensionDetector.instance = new ExtensionDetector();
    }
    return ExtensionDetector.instance;
  }

  /**
   * 检测扩展状态
   */
  async detect(): Promise<ExtensionStatus> {
    try {
      const response = await fetch('/api/extension/status');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      const status: ExtensionStatus = {
        installed: data.installed || false,
        enabled: data.enabled || false,
        online: data.online || false,
        version: data.version || null,
        lastPingAt: data.lastPingAt ? new Date(data.lastPingAt) : undefined,
        browserType: data.browserType,
        connectionType: data.connectionType,
      };

      this.updateStatus(status);
      return status;
    } catch (error) {
      console.error('检测扩展状态失败:', error);

      // 返回默认状态
      const defaultStatus: ExtensionStatus = {
        installed: false,
        enabled: false,
        online: false,
        version: null,
      };

      this.updateStatus(defaultStatus);
      return defaultStatus;
    }
  }

  /**
   * 开始监控扩展状态
   */
  startMonitoring(): void {
    if (this.monitoringInterval !== null) {
      console.warn('扩展监控已在运行中');
      return;
    }

    // 立即执行一次检测
    this.detect();

    // 启动定时轮询
    this.monitoringInterval = window.setInterval(() => {
      this.detect();
    }, this.POLL_INTERVAL);

    console.log('扩展状态监控已启动');
  }

  /**
   * 停止监控扩展状态
   */
  stopMonitoring(): void {
    if (this.monitoringInterval !== null) {
      window.clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('扩展状态监控已停止');
    }
  }

  /**
   * 订阅状态变化
   */
  subscribe(callback: StatusChangeCallback): () => void {
    this.subscribers.add(callback);

    // 如果已有状态，立即通知
    if (this.currentStatus) {
      callback(this.currentStatus);
    }

    // 返回取消订阅函数
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * 获取当前状态（缓存）
   */
  getCurrentStatus(): ExtensionStatus | null {
    return this.currentStatus;
  }

  /**
   * 更新状态并通知订阅者
   */
  private updateStatus(newStatus: ExtensionStatus): void {
    const hasChanged = !this.currentStatus ||
      this.currentStatus.installed !== newStatus.installed ||
      this.currentStatus.enabled !== newStatus.enabled ||
      this.currentStatus.online !== newStatus.online ||
      this.currentStatus.version !== newStatus.version;

    this.currentStatus = newStatus;

    if (hasChanged) {
      this.notifySubscribers(newStatus);
    }
  }

  /**
   * 通知所有订阅者
   */
  private notifySubscribers(status: ExtensionStatus): void {
    this.subscribers.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('通知订阅者失败:', error);
      }
    });
  }
}

// 导出单例实例
export const extensionDetector = ExtensionDetector.getInstance();
