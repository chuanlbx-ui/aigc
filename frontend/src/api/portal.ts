import axios from 'axios';
import { API_CONFIG } from './config';

const api = axios.create({
  baseURL: API_CONFIG.baseUrl ? `${API_CONFIG.baseUrl}/api/portal` : '/api/portal',
});

export interface ContentItem {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  coverImage?: string;
  category?: { id: string; name: string; color?: string };
  readTime?: number;
  duration?: number;
  publishedAt: string;
}

export interface Section {
  id: string;
  type: string;
  title?: string;
  showTitle: boolean;
  layoutConfig: string;
  items: ContentItem[];
}

export interface TopicPage {
  id: string;
  name: string;
  slug: string;
  title: string;
  description?: string;
  coverImage?: string;
  template: string;
  sections: Section[];
}

export interface Category {
  id: string;
  name: string;
  color?: string;
  articleCount: number;
}

// 获取公开页面列表
export async function getPages() {
  const res = await api.get<TopicPage[]>('/pages');
  return res.data;
}

// 获取页面详情（含区块内容）
export async function getPageBySlug(slug: string) {
  const res = await api.get<TopicPage>(`/pages/${slug}`);
  return res.data;
}

// 获取文章列表
export async function getArticles(params?: {
  categoryId?: string;
  page?: number;
  pageSize?: number;
}) {
  const res = await api.get<{
    items: ContentItem[];
    total: number;
    page: number;
    pageSize: number;
  }>('/articles', { params });
  return res.data;
}

// 获取文章详情
export async function getArticleBySlug(slug: string) {
  const res = await api.get<ContentItem & { content: string }>(`/articles/${slug}`);
  return res.data;
}

// 获取分类列表
export async function getCategories() {
  const res = await api.get<Category[]>('/categories');
  return res.data;
}
