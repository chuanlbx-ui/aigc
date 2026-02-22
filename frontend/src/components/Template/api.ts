/**
 * 统一模板 API 客户端
 */

import axios from 'axios';
import { API_CONFIG } from '../../api/config';

const api = axios.create({
  baseURL: API_CONFIG.baseUrl ? `${API_CONFIG.baseUrl}/api/unified-templates` : '/api/unified-templates',
});

// 模板类型
export type TemplateType = 'popup' | 'workflow' | 'general' | 'layout';
export type TemplateCategory = 'system' | 'custom';

// 统一模板接口
export interface UnifiedTemplate {
  id: string;
  type: TemplateType;
  name: string;
  description?: string;
  category: TemplateCategory;
  isSystem: boolean;
  config: Record<string, any>;
  thumbnail?: string;
  platform?: string;
  column?: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

// 筛选条件
export interface TemplateFilters {
  type?: TemplateType;
  category?: TemplateCategory;
  platform?: string;
  column?: string;
  search?: string;
  isSystem?: boolean;
}

// 分页参数
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// 列表响应
export interface TemplateListResponse {
  templates: UnifiedTemplate[];
  total: number;
  page: number;
  pageSize: number;
}

// 获取模板列表
export async function getTemplates(
  filters: TemplateFilters = {},
  pagination: PaginationParams = {}
): Promise<TemplateListResponse> {
  const params = { ...filters, ...pagination };
  const { data } = await api.get('/', { params });
  return data;
}

// 获取单个模板
export async function getTemplate(
  type: TemplateType,
  id: string
): Promise<UnifiedTemplate> {
  const { data } = await api.get(`/${type}/${id}`);
  return data;
}

// 创建模板
export async function createTemplate(
  templateData: Partial<UnifiedTemplate>
): Promise<UnifiedTemplate> {
  const { data } = await api.post('/', templateData);
  return data;
}

// 更新模板
export async function updateTemplate(
  type: TemplateType,
  id: string,
  templateData: Partial<UnifiedTemplate>
): Promise<UnifiedTemplate> {
  const { data } = await api.put(`/${type}/${id}`, templateData);
  return data;
}

// 删除模板
export async function deleteTemplate(
  type: TemplateType,
  id: string
): Promise<void> {
  await api.delete(`/${type}/${id}`);
}

// 克隆模板
export async function cloneTemplate(
  type: TemplateType,
  id: string
): Promise<UnifiedTemplate> {
  const { data } = await api.post(`/${type}/${id}/clone`);
  return data;
}

// 推荐结果
export interface RecommendationResult {
  template: UnifiedTemplate;
  score: number;
  reason: string;
}

// 推荐上下文
export interface RecommendContext {
  platform?: string;
  column?: string;
  contentType?: string;
}

// 获取推荐模板
export async function getRecommendations(
  type: TemplateType,
  context: RecommendContext = {},
  limit: number = 5
): Promise<RecommendationResult[]> {
  const params = { ...context, limit };
  const { data } = await api.get(`/recommend/${type}`, { params });
  return data.recommendations;
}
