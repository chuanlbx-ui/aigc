import { create } from 'zustand';
import { api } from '../api/client';

// 类型定义
export interface ArticleCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  _count?: { articles: number };
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  filePath: string;
  coverImage?: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  platform: string;
  column: string;
  templateId?: string;
  layoutTheme?: string;
  workflowStep: number;
  workflowData: string;
  categoryId?: string;
  category?: ArticleCategory;
  tags: string;
  knowledgeRefs: string;
  hkrScore?: string;
  aiReviewStatus: string;
  wordCount: number;
  readTime: number;
  viewCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleVersion {
  id: string;
  articleId: string;
  version: number;
  filePath: string;
  changeNote?: string;
  createdAt: string;
}

// 平台栏目配置
export const PLATFORM_COLUMNS: Record<string, string[]> = {
  wechat: ['深度', '速递', '体验', '教程', '对话'],
  xiaohongshu: ['种草', '教程', '观点'],
  video: ['演示', '教程', '观点'],
};

export const PLATFORM_NAMES: Record<string, string> = {
  wechat: '公众号',
  xiaohongshu: '小红书',
  video: '视频',
};

// Store 接口
interface ArticleState {
  articles: Article[];
  categories: ArticleCategory[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  currentArticle: Article | null;
  currentContent: string;

  // Actions
  fetchArticles: (params?: {
    categoryId?: string;
    status?: string;
    platform?: string;
    search?: string;
    page?: number;
  }) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchArticle: (id: string) => Promise<void>;
  fetchArticleContent: (id: string) => Promise<void>;
  createArticle: (data: {
    title: string;
    platform: string;
    column: string;
    content?: string;
    categoryId?: string;
    tags?: string[];
  }) => Promise<Article>;
  updateArticle: (id: string, data: Partial<Article>) => Promise<void>;
  updateArticleContent: (id: string, content: string, changeNote?: string) => Promise<void>;
  deleteArticle: (id: string) => Promise<void>;
  publishArticle: (id: string) => Promise<void>;
  unpublishArticle: (id: string) => Promise<void>;
  createCategory: (data: { name: string; icon?: string; color?: string }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  updateWorkflow: (id: string, step: number, data?: any) => Promise<void>;
}

// 创建 Store
export const useArticleStore = create<ArticleState>((set, get) => ({
  articles: [],
  categories: [],
  total: 0,
  page: 1,
  pageSize: 20,
  loading: false,
  currentArticle: null,
  currentContent: '',

  fetchArticles: async (params) => {
    set({ loading: true });
    try {
      const query = new URLSearchParams();
      if (params?.categoryId) query.set('categoryId', params.categoryId);
      if (params?.status) query.set('status', params.status);
      if (params?.platform) query.set('platform', params.platform);
      if (params?.search) query.set('search', params.search);
      if (params?.page) query.set('page', String(params.page));
      query.set('pageSize', String(get().pageSize));

      const res = await api.get(`/articles?${query}`);
      set({
        articles: res.data.articles,
        total: res.data.total,
        page: res.data.page,
      });
    } finally {
      set({ loading: false });
    }
  },

  fetchCategories: async () => {
    const res = await api.get('/articles/categories/list');
    set({ categories: res.data });
  },

  fetchArticle: async (id) => {
    const res = await api.get(`/articles/${id}`);
    set({ currentArticle: res.data });
  },

  fetchArticleContent: async (id) => {
    const res = await api.get(`/articles/${id}/content`);
    set({ currentContent: res.data.content });
  },

  createArticle: async (data) => {
    const res = await api.post('/articles', data);
    get().fetchArticles();
    return res.data;
  },

  updateArticle: async (id, data) => {
    await api.put(`/articles/${id}`, data);
    get().fetchArticles();
    if (get().currentArticle?.id === id) {
      get().fetchArticle(id);
    }
  },

  updateArticleContent: async (id, content, changeNote) => {
    await api.put(`/articles/${id}/content`, { content, changeNote });
    set({ currentContent: content });
    if (get().currentArticle?.id === id) {
      get().fetchArticle(id);
    }
  },

  deleteArticle: async (id) => {
    await api.delete(`/articles/${id}`);
    get().fetchArticles();
  },

  publishArticle: async (id) => {
    await api.post(`/articles/${id}/publish`);
    get().fetchArticles();
    if (get().currentArticle?.id === id) {
      get().fetchArticle(id);
    }
  },

  unpublishArticle: async (id) => {
    await api.post(`/articles/${id}/unpublish`);
    get().fetchArticles();
    if (get().currentArticle?.id === id) {
      get().fetchArticle(id);
    }
  },

  createCategory: async (data) => {
    await api.post('/articles/categories', data);
    get().fetchCategories();
  },

  deleteCategory: async (id) => {
    await api.delete(`/articles/categories/${id}`);
    get().fetchCategories();
  },

  updateWorkflow: async (id, step, data) => {
    await api.put(`/articles/${id}/workflow`, { step, data });
    if (get().currentArticle?.id === id) {
      get().fetchArticle(id);
    }
  },
}))
