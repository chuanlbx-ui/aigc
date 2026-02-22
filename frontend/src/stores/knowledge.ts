import { create } from 'zustand';
import { api } from '../api/client';

// 类型定义
export interface KnowledgeCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  parentId?: string;
  children?: KnowledgeCategory[];
  _count?: { docs: number };
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  filePath: string;
  source: 'manual' | 'ai-search' | 'import';
  sourceUrl?: string;
  categoryId?: string;
  category?: KnowledgeCategory;
  tags: string;
  version: number;
  wordCount: number;
  readTime: number;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeVersion {
  id: string;
  docId: string;
  version: number;
  filePath: string;
  changeNote?: string;
  createdAt: string;
}

export interface TagStat {
  name: string;
  count: number;
}

export interface AIServiceConfig {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
  isDefault: boolean;
  isEnabled: boolean;
}

// Store 接口
interface KnowledgeState {
  docs: KnowledgeDoc[];
  categories: KnowledgeCategory[];
  tags: TagStat[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  currentDoc: KnowledgeDoc | null;
  currentContent: string;
  versions: KnowledgeVersion[];
  aiServices: AIServiceConfig[];

  // Actions
  fetchDocs: (params?: { categoryId?: string; tag?: string; search?: string; page?: number }) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchTags: () => Promise<void>;
  fetchDoc: (id: string) => Promise<void>;
  fetchDocContent: (id: string) => Promise<void>;
  createDoc: (data: { title: string; content: string; summary?: string; categoryId?: string; tags?: string[] }) => Promise<KnowledgeDoc>;
  updateDoc: (id: string, data: Partial<KnowledgeDoc>) => Promise<void>;
  updateDocContent: (id: string, content: string, changeNote?: string) => Promise<void>;
  deleteDoc: (id: string) => Promise<void>;
  fetchVersions: (id: string) => Promise<void>;
  rollbackVersion: (id: string, version: number) => Promise<void>;
  createCategory: (data: { name: string; icon?: string; color?: string; parentId?: string }) => Promise<void>;
  updateCategory: (id: string, data: Partial<KnowledgeCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  importDirectory: (dirPath: string, categoryId?: string) => Promise<{ count: number }>;
  fetchAIServices: () => Promise<void>;
  // 批量操作
  batchDelete: (ids: string[]) => Promise<void>;
  batchUpdateCategory: (ids: string[], categoryId: string | null) => Promise<void>;
  batchUpdateTags: (ids: string[], tags: string[], mode: 'add' | 'replace') => Promise<void>;
  reset: () => void;
}

const initialState = {
  docs: [],
  categories: [],
  tags: [],
  total: 0,
  page: 1,
  pageSize: 20,
  loading: false,
  currentDoc: null,
  currentContent: '',
  versions: [],
  aiServices: [],
};

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  ...initialState,

  fetchDocs: async (params) => {
    set({ loading: true });
    try {
      const query = new URLSearchParams();
      if (params?.categoryId) query.set('categoryId', params.categoryId);
      if (params?.tag) query.set('tag', params.tag);
      if (params?.search) query.set('search', params.search);
      if (params?.page) query.set('page', String(params.page));
      query.set('pageSize', String(get().pageSize));

      const res = await api.get(`/knowledge/docs?${query}`);
      set({ docs: res.data.docs, total: res.data.total, page: res.data.page });
    } finally {
      set({ loading: false });
    }
  },

  fetchCategories: async () => {
    const res = await api.get('/knowledge/categories');
    set({ categories: res.data });
  },

  fetchTags: async () => {
    const res = await api.get('/knowledge/tags');
    set({ tags: res.data });
  },

  fetchDoc: async (id) => {
    try {
      const res = await api.get(`/knowledge/docs/${id}`);
      set({ currentDoc: res.data });
    } catch (error) {
      console.error('获取文档失败:', error);
      set({ currentDoc: null });
    }
  },

  fetchDocContent: async (id) => {
    try {
      const res = await api.get(`/knowledge/docs/${id}/content`);
      set({ currentContent: res.data.content });
    } catch (error) {
      console.error('获取文档内容失败:', error);
      set({ currentContent: '' });
    }
  },

  createDoc: async (data) => {
    const res = await api.post('/knowledge/docs', data);
    get().fetchDocs();
    return res.data;
  },

  updateDoc: async (id, data) => {
    await api.put(`/knowledge/docs/${id}`, data);
    get().fetchDocs();
  },

  updateDocContent: async (id, content, changeNote) => {
    await api.put(`/knowledge/docs/${id}/content`, { content, changeNote });
    set({ currentContent: content });
  },

  deleteDoc: async (id) => {
    await api.delete(`/knowledge/docs/${id}`);
    get().fetchDocs();
  },

  fetchVersions: async (id) => {
    const res = await api.get(`/knowledge/docs/${id}/versions`);
    set({ versions: res.data });
  },

  rollbackVersion: async (id, version) => {
    await api.post(`/knowledge/docs/${id}/rollback`, { version });
    get().fetchDocContent(id);
  },

  createCategory: async (data) => {
    await api.post('/knowledge/categories', data);
    get().fetchCategories();
  },

  updateCategory: async (id, data) => {
    await api.put(`/knowledge/categories/${id}`, data);
    get().fetchCategories();
  },

  deleteCategory: async (id) => {
    await api.delete(`/knowledge/categories/${id}`);
    get().fetchCategories();
  },

  importDirectory: async (dirPath, categoryId) => {
    const res = await api.post('/knowledge/import/directory', { dirPath, categoryId });
    get().fetchDocs();
    return { count: res.data.count };
  },

  fetchAIServices: async () => {
    const res = await api.get('/knowledge/config/services');
    set({ aiServices: res.data });
  },

  batchDelete: async (ids) => {
    await api.post('/knowledge/docs/batch-delete', { ids });
    get().fetchDocs();
  },

  batchUpdateCategory: async (ids, categoryId) => {
    await api.post('/knowledge/docs/batch-category', { ids, categoryId });
    get().fetchDocs();
  },

  batchUpdateTags: async (ids, tags, mode) => {
    await api.post('/knowledge/docs/batch-tags', { ids, tags, mode });
    get().fetchDocs();
    get().fetchTags();
  },

  reset: () => set(initialState),
}));
