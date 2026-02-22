import { api } from '../../../api/client';

export interface PopupTemplateConfig {
  contentType: 'text' | 'image' | 'video';
  textContent?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: number;
  textColor?: string;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  width: number;
  height: number;
  position: string;
  customX?: number;
  customY?: number;
  offsetX?: number;
  offsetY?: number;
  enterAnimation: string;
  exitAnimation: string;
  animationDuration?: number;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  boxShadow?: string;
  padding?: number;
  zIndex?: number;
  mediaFit?: 'cover' | 'contain' | 'fill';
  videoMuted?: boolean;
}

export interface PopupTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'system' | 'custom';
  isSystem: boolean;
  config: PopupTemplateConfig;
  createdAt: string;
  updatedAt: string;
}

// 获取模板列表
export async function getTemplates(category?: 'system' | 'custom'): Promise<PopupTemplate[]> {
  const params = category ? `?category=${category}` : '';
  const res = await api.get(`/popup-templates${params}`);
  return res.data;
}

// 获取单个模板
export async function getTemplate(id: string): Promise<PopupTemplate> {
  const res = await api.get(`/popup-templates/${id}`);
  return res.data;
}

// 创建自定义模板
export async function createTemplate(
  name: string,
  config: PopupTemplateConfig,
  description?: string
): Promise<PopupTemplate> {
  const res = await api.post('/popup-templates', { name, description, config });
  return res.data;
}

// 更新模板
export async function updateTemplate(
  id: string,
  data: { name?: string; description?: string; config?: PopupTemplateConfig }
): Promise<PopupTemplate> {
  const res = await api.put(`/popup-templates/${id}`, data);
  return res.data;
}

// 删除模板
export async function deleteTemplate(id: string): Promise<void> {
  await api.delete(`/popup-templates/${id}`);
}

// ========== 自动生成弹窗 API ==========

export interface ExtractedKeyword {
  text: string;
  position: number;
  importance: number;
  suggestedTime: number;
}

export interface PosterStyle {
  id: string;
  name: string;
  description: string;
  config: PopupTemplateConfig;
}

// 关键词提取配置
export interface KeywordExtractConfig {
  minLength: number;      // 最小关键词长度 (2-4)
  maxLength: number;      // 最大关键词长度 (4-10)
  density: number;        // 密度 (1-10)
  maxCount: number;       // 最大数量 (5-30)
}

// 提取弹窗关键词
export async function extractPopupKeywords(
  text: string,
  estimatedDurationMs: number,
  config?: Partial<KeywordExtractConfig>
): Promise<{ keywords: ExtractedKeyword[]; suggestedCount: number }> {
  const res = await api.post('/popup-templates/extract-keywords', {
    text,
    estimatedDurationMs,
    config,
  });
  return res.data;
}

// 获取大字报样式列表
export async function getPosterStyles(): Promise<PosterStyle[]> {
  const res = await api.get('/popup-templates/poster-styles');
  return res.data;
}

// ========== 图片搜索 API ==========

export interface ImageInfo {
  id: string;
  url: string;
  thumbUrl: string;
  source: 'pexels' | 'unsplash' | 'pixabay';
  photographer?: string;
  width?: number;
  height?: number;
}

// 搜索图片
export async function searchImages(
  keyword: string,
  count?: number,
  source?: 'all' | 'pexels' | 'unsplash' | 'pixabay'
): Promise<{ images: ImageInfo[]; keyword: string; searchQuery: string }> {
  const res = await api.post('/popup-templates/search-images', { keyword, count, source });
  return res.data;
}
