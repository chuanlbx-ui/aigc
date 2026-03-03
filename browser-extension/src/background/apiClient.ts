/**
 * 后端 API 客户端
 * 负责与后端服务器通信
 */

const API_BASE_URL = 'http://localhost:3001/api/extension';

export interface ExtensionTask {
  id: string;
  publishRecordId: string;
  taskType: 'publish' | 'draft' | 'delete';
  priority: number;
  status: string;
  payload: string;
  queuedAt: string;
}

export class APIClient {
  /**
   * 发送心跳
   */
  async ping(): Promise<void> {
    try {
      console.log('发送心跳到:', `${API_BASE_URL}/ping`);

      const response = await fetch(`${API_BASE_URL}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extensionId: 'remotion-publisher-extension',
          version: chrome.runtime.getManifest().version,
          browserInfo: {
            browserType: this.getBrowserType(),
            browserVersion: navigator.userAgent,
          },
        }),
      });

      if (!response.ok) {
        console.error('心跳响应失败:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}`);
      }

      console.log('心跳成功');
    } catch (error) {
      console.error('心跳失败 - 详细错误:', error);
      if (error instanceof TypeError) {
        console.error('网络错误 - 可能是 CORS 或后端未运行');
      }
    }
  }

  /**
   * 获取待处理任务
   */
  async getPendingTasks(): Promise<ExtensionTask[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/pending`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.tasks || [];
    } catch (error) {
      console.error('获取任务失败:', error);
      return [];
    }
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(
    taskId: string,
    status: string,
    progress?: number,
    logs?: string[]
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, progress, logs }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('更新任务状态失败:', error);
    }
  }

  /**
   * 完成任务
   */
  async completeTask(
    taskId: string,
    result: any,
    logs: string[]
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, logs }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('完成任务失败:', error);
    }
  }

  /**
   * 任务失败
   */
  async failTask(taskId: string, error: string, logs: string[]): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/fail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error, logs }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('标记任务失败失败:', error);
    }
  }

  /**
   * 获取浏览器类型
   */
  private getBrowserType(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('edg')) return 'edge';
    if (userAgent.includes('chrome')) return 'chrome';
    if (userAgent.includes('firefox')) return 'firefox';
    return 'unknown';
  }
}
