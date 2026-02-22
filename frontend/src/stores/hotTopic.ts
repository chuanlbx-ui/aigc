import { create } from 'zustand';
import { api } from '../api/client';

// 类型定义
export interface HotTopic {
  id: string;
  title: string;
  description?: string;
  source: 'weibo' | 'toutiao';
  sourceUrl?: string;
  hotScore: number;
  category?: string;
  tags: string[];
  matchedKnowledgeIds: string[];
  relevanceScore?: number;
  fetchedAt: string;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeMatch {
  id: string;
  title: string;
  summary: string | null;
  relevanceScore: number;
}

export interface MatchResult {
  knowledgeDocs: KnowledgeMatch[];
  relevanceScore: number;
}

// 来源配置
export const HOT_TOPIC_SOURCES = {
  weibo: '微博热搜',
  toutiao: '今日头条',
  all: '全部来源',
} as const;

// Store 接口
interface HotTopicState {
  topics: HotTopic[];
  loading: boolean;
  selectedTopic: HotTopic | null;
  matchResult: MatchResult | null;
  filters: {
    source?: 'weibo' | 'toutiao' | 'all';
    category?: string;
    limit?: number;
  };

  // Actions
  fetchHotTopics: (params?: {
    source?: 'weibo' | 'toutiao' | 'all';
    limit?: number;
    category?: string;
  }) => Promise<void>;
  refreshHotTopics: (source?: string) => Promise<void>;
  matchKnowledge: (topicId: string) => Promise<MatchResult>;
  createArticleFromTopic: (
    topicId: string,
    platform: string,
    column: string,
    userId?: string
  ) => Promise<any>;
  setSelectedTopic: (topic: HotTopic | null) => void;
  setFilters: (filters: Partial<HotTopicState['filters']>) => void;
  clearMatchResult: () => void;
}

// 创建 Store
export const useHotTopicStore = create<HotTopicState>((set, get) => ({
  topics: [],
  loading: false,
  selectedTopic: null,
  matchResult: null,
  filters: {
    source: 'all',
    limit: 20,
  },

  // 获取热点列表
  fetchHotTopics: async (params) => {
    set({ loading: true });
    try {
      const filters = { ...get().filters, ...params };
      const queryParams = new URLSearchParams();

      if (filters.source && filters.source !== 'all') {
        queryParams.append('source', filters.source);
      }
      if (filters.limit) {
        queryParams.append('limit', filters.limit.toString());
      }
      if (filters.category) {
        queryParams.append('category', filters.category);
      }

      const response = await api.get(`/hot-topics?${queryParams.toString()}`);

      // 解析JSON字符串字段
      const topics = response.data.topics.map((topic: any) => ({
        ...topic,
        tags: typeof topic.tags === 'string' ? JSON.parse(topic.tags) : topic.tags,
        matchedKnowledgeIds: typeof topic.matchedKnowledgeIds === 'string'
          ? JSON.parse(topic.matchedKnowledgeIds)
          : topic.matchedKnowledgeIds,
      }));

      set({ topics, filters, loading: false });
    } catch (error) {
      console.error('获取热点失败:', error);
      set({ loading: false });
      throw error;
    }
  },

  // 刷新热点数据
  refreshHotTopics: async (source) => {
    set({ loading: true });
    try {
      await api.post('/hot-topics/refresh', { source });
      await get().fetchHotTopics();
    } catch (error) {
      console.error('刷新热点失败:', error);
      set({ loading: false });
      throw error;
    }
  },

  // 匹配知识库
  matchKnowledge: async (topicId) => {
    try {
      const response = await api.post(`/hot-topics/${topicId}/match-knowledge`);
      set({ matchResult: response.data });
      return response.data;
    } catch (error) {
      console.error('匹配知识库失败:', error);
      throw error;
    }
  },

  // 基于热点创建文章
  createArticleFromTopic: async (topicId, platform, column, userId) => {
    try {
      const response = await api.post(`/hot-topics/${topicId}/create-article`, {
        platform,
        column,
        userId,
      });
      return response.data.article;
    } catch (error) {
      console.error('创建文章失败:', error);
      throw error;
    }
  },

  // 设置选中的热点
  setSelectedTopic: (topic) => {
    set({ selectedTopic: topic });
  },

  // 设置筛选条件
  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } });
  },

  // 清除匹配结果
  clearMatchResult: () => {
    set({ matchResult: null });
  },
}));

