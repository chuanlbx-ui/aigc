// API 配置管理 - 支持本地和云端切换

// API 地址配置
const CLOUD_API_URL = ''; // 生产环境使用相对路径（同域名部署）
const LOCAL_API_URL = ''; // 空字符串表示使用相对路径（Vite 代理）

// 从 localStorage 获取用户选择的 API 地址
function getStoredApiUrl(): string | null {
  return localStorage.getItem('api-base-url');
}

// 获取当前使用的 API 地址
export function getApiBaseUrl(): string {
  const stored = getStoredApiUrl();
  if (stored !== null) return stored;
  
  // 默认：生产环境使用云端，开发环境使用本地
  if (import.meta.env.PROD) {
    return CLOUD_API_URL;
  }
  
  return LOCAL_API_URL;
}

// 切换 API 地址
export function switchApiUrl(type: 'local' | 'cloud' | 'custom', customUrl?: string): void {
  let url: string;
  
  switch (type) {
    case 'local':
      url = LOCAL_API_URL;
      break;
    case 'cloud':
      url = CLOUD_API_URL;
      break;
    case 'custom':
      url = customUrl || CLOUD_API_URL;
      break;
    default:
      url = LOCAL_API_URL;
  }
  
  localStorage.setItem('api-base-url', url);
  console.log(`[API] 已切换到: ${url || '本地代理 (http://localhost:3001)'}`);
  
  // 刷新页面使配置生效
  window.location.reload();
}

// 获取当前 API 类型
export function getCurrentApiType(): 'local' | 'cloud' | 'custom' {
  const url = getApiBaseUrl();
  if (!url) return 'local';
  if (url === CLOUD_API_URL) return 'cloud';
  return 'custom';
}

// 导出配置
export const API_CONFIG = {
  CLOUD_URL: CLOUD_API_URL,
  LOCAL_URL: LOCAL_API_URL,
  get baseUrl() { return getApiBaseUrl(); },
};
