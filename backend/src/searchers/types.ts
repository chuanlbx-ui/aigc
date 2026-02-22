/**
 * 素材搜索器类型定义
 */

// 素材类型
export type MediaType = 'image' | 'video' | 'audio';

// 搜索结果项
export interface SearchResult {
  id: string;
  source: string;           // pexels, pixabay, unsplash, freesound
  type: MediaType;
  title: string;
  thumbnailUrl: string;
  previewUrl: string;
  downloadUrl: string;
  width?: number;
  height?: number;
  duration?: number;        // 音视频时长（秒）
  author?: string;
  license?: string;
}

// 搜索选项
export interface SearchOptions {
  query: string;
  type?: MediaType;
  page?: number;
  perPage?: number;
}

// 搜索响应
export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  perPage: number;
}

// 搜索器信息
export interface SearcherInfo {
  id: string;
  name: string;
  types: MediaType[];
  configured: boolean;      // API Key 是否已配置
}

// 批量下载项
export interface BatchDownloadItem {
  source: string;
  downloadUrl: string;
  type: MediaType;
  title: string;
  width?: number;
  height?: number;
  duration?: number;
}

// 批量下载请求
export interface BatchDownloadRequest {
  items: BatchDownloadItem[];
  categoryId?: string;
}

// 批量下载响应
export interface BatchDownloadResponse {
  success: number;
  failed: number;
  assets: Array<{
    id: string;
    name: string;
    url: string;
  }>;
  errors?: string[];
}
