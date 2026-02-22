import { create } from 'zustand';
import { api } from '../api/client';

// 类型定义
export interface Poster {
  id: string;
  name: string;
  quote: string;
  theme: string;
  brandText?: string;
  qrUrl?: string;
  filePath: string;
  articleId?: string;
  article?: { id: string; title: string; slug?: string };
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
}

// 主题风格配置
export const THEME_OPTIONS = [
  { value: 'light', label: '浅色经典' },
  { value: 'dark', label: '深色经典' },
  { value: 'elegant', label: '典雅金棕' },
  { value: 'tech', label: '科技霓虹' },
  { value: 'nature', label: '自然清新' },
  { value: 'warm', label: '温暖橙黄' },
  { value: 'minimal', label: '极简黑白' },
];

// Store 接口
interface PosterState {
  posters: Poster[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  currentPoster: Poster | null;

  // Actions
  fetchPosters: (params?: {
    theme?: string;
    search?: string;
    page?: number;
  }) => Promise<void>;
  fetchPoster: (id: string) => Promise<void>;
  createPoster: (data: {
    name: string;
    quote: string;
    theme?: string;
    brandText?: string;
    qrUrl?: string;
    articleId?: string;
  }) => Promise<Poster>;
  updatePoster: (id: string, data: Partial<Poster>) => Promise<Poster>;
  deletePoster: (id: string) => Promise<void>;
  clearCurrentPoster: () => void;
}

// 创建 Store
export const usePosterStore = create<PosterState>((set, get) => ({
  posters: [],
  total: 0,
  page: 1,
  pageSize: 20,
  loading: false,
  currentPoster: null,

  fetchPosters: async (params) => {
    set({ loading: true });
    try {
      const query = new URLSearchParams();
      if (params?.theme) query.set('theme', params.theme);
      if (params?.search) query.set('search', params.search);
      if (params?.page) query.set('page', String(params.page));
      query.set('pageSize', String(get().pageSize));

      const res = await api.get(`/posters?${query}`);
      set({
        posters: res.data.posters,
        total: res.data.total,
        page: res.data.page,
      });
    } finally {
      set({ loading: false });
    }
  },

  fetchPoster: async (id) => {
    const res = await api.get(`/posters/${id}`);
    set({ currentPoster: res.data });
  },

  createPoster: async (data) => {
    const res = await api.post('/posters', data);
    get().fetchPosters();
    return res.data;
  },

  updatePoster: async (id, data) => {
    const res = await api.put(`/posters/${id}`, data);
    get().fetchPosters();
    if (get().currentPoster?.id === id) {
      set({ currentPoster: res.data });
    }
    return res.data;
  },

  deletePoster: async (id) => {
    await api.delete(`/posters/${id}`);
    get().fetchPosters();
  },

  clearCurrentPoster: () => {
    set({ currentPoster: null });
  },
}));
