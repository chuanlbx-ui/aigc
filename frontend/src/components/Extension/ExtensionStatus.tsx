import { useEffect, useState } from 'react';
import { extensionDetector, ExtensionStatus as IExtensionStatus } from '../../utils/extensionDetector';
import './ExtensionStatus.css';

/**
 * 扩展状态组件
 * 显示浏览器扩展的安装和连接状态
 */
export function ExtensionStatus() {
  const [status, setStatus] = useState<IExtensionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 订阅状态变化
    const unsubscribe = extensionDetector.subscribe((newStatus) => {
      setStatus(newStatus);
      setLoading(false);
    });

    // 启动监控
    extensionDetector.startMonitoring();

    // 清理函数
    return () => {
      unsubscribe();
      extensionDetector.stopMonitoring();
    };
  }, []);

  if (loading) {
    return (
      <div className="extension-status loading">
        <span className="status-icon">⏳</span>
        <span className="status-text">检测扩展状态中...</span>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <div className={`extension-status ${getStatusClass(status)}`}>
      <span className="status-icon">{getStatusIcon(status)}</span>
      <div className="status-info">
        <div className="status-main">
          <span className="status-text">{getStatusText(status)}</span>
          {status.version && (
            <span className="status-version">v{status.version}</span>
          )}
        </div>
        {status.browserType && (
          <div className="status-detail">
            浏览器: {getBrowserName(status.browserType)}
          </div>
        )}
      </div>
      {!status.installed && (
        <button className="install-button" onClick={handleInstall}>
          安装扩展
        </button>
      )}
    </div>
  );
}

/**
 * 获取状态样式类名
 */
function getStatusClass(status: IExtensionStatus): string {
  if (!status.installed) return 'not-installed';
  if (!status.enabled) return 'disabled';
  if (!status.online) return 'offline';
  return 'online';
}

/**
 * 获取状态图标
 */
function getStatusIcon(status: IExtensionStatus): string {
  if (!status.installed) return '❌';
  if (!status.enabled) return '⚠️';
  if (!status.online) return '🔴';
  return '🟢';
}

/**
 * 获取状态文本
 */
function getStatusText(status: IExtensionStatus): string {
  if (!status.installed) return '扩展未安装';
  if (!status.enabled) return '扩展已禁用';
  if (!status.online) return '扩展离线';
  return '扩展在线';
}

/**
 * 获取浏览器名称
 */
function getBrowserName(browserType: string): string {
  const browserNames: Record<string, string> = {
    chrome: 'Chrome',
    edge: 'Edge',
    firefox: 'Firefox',
  };
  return browserNames[browserType] || browserType;
}

/**
 * 处理安装扩展
 */
function handleInstall(): void {
  // TODO: 打开扩展商店页面
  alert('请前往浏览器扩展商店安装 Remotion Publisher 扩展');
}
