import { create } from 'zustand';
import { api } from '../api/client';

// 领域枚举
export enum TopicDomain {
  TECH = 'tech',
  FINANCE = 'finance',
  CULTURE = 'culture',
  LIFE = 'life',
}

// 领域配置
export const DOMAIN_CONFIG = {
  tech: {
    name: '科技/AI/编程',
    color: '#1890ff',
    icon: 'CodeOutlined',
  },
  finance: {
    name: '财经/商业',
    color: '#52c41a',
    icon: 'DollarOutlined',
  },
  culture: {
    name: '文化/教育',
    color: '#722ed1',
    icon: 'BookOutlined',
  },
  life: {
    name: '生活/健康',
    color: '#fa8c16',
    icon: 'HeartOutlined',
  },
};

// 选题类型
export interface TopicSuggestion {
  id: string;
  title: string;
  description?: string;
  domain: TopicDomain;
  source: string;
  sourceType: string;
  sourceUrl?: string;
  hotScore: number;
  qualityScore?: number;
  recommendScore?: number;
  relevanceScore?: number;
  matchedKnowledgeIds: string[];
  tags: string[];
  category?: string;
  fetchedAt: string;
  createdAt: string;
}

// 领域分组
export interface DomainGroup {
  domain: TopicDomain;
  domainName: string;
  color: string;
  icon: string;
  topics: TopicSuggestion[];
  totalCount: number;
}

// Store 接口
interface TopicSuggestionState {
  domainGroups: DomainGroup[];
  loading: boolean;
  selectedTopic: TopicSuggestion | null;
  acceptedTopicData: TopicSuggestion | null;
  filters: {
    domains?: TopicDomain[];
    limit?: number;
    minRelevance?: number;
  };

  // Actions
  fetchRecommendations: (params?: {
    domains?: TopicDomain[];
    limit?: number;
    minRelevance?: number;
  }) => Promise<void>;
  refreshTopics: (sources?: string[]) => Promise<void>;
  generateFromKnowledge: (options?: {
    limit?: number;
    topicsPerDoc?: number;
  }) => Promise<void>;
  acceptTopic: (topicId: string, platform: string, column: string, userId?: string, categoryId?: string) => Promise<any>;
  setSelectedTopic: (topic: TopicSuggestion | null) => void;
  setAcceptedTopicData: (data: TopicSuggestion | null) => void;
  clearAcceptedTopicData: () => void;
  setFilters: (filters: Partial<TopicSuggestionState['filters']>) => void;
}

// 创建 Store
export const useTopicSuggestionStore = create<TopicSuggestionState>((set, get) => ({
  domainGroups: [],
  loading: false,
  selectedTopic: null,
  acceptedTopicData: null,
  filters: {
    limit: 5,
    minRelevance: 0,
  },

  // 获取推荐选题
  fetchRecommendations: async (params) => {
    set({ loading: true });
    try {
      const filters = { ...get().filters, ...params };
      const queryParams = new URLSearchParams();

      if (filters.domains && filters.domains.length > 0) {
        filters.domains.forEach(d => queryParams.append('domains', d));
      }
      if (filters.limit) {
        queryParams.append('limit', filters.limit.toString());
      }
      if (filters.minRelevance !== undefined && filters.minRelevance !== null) {
        queryParams.append('minRelevance', filters.minRelevance.toString());
      }

      const response = await api.get(`/topic-suggestions?${queryParams.toString()}`);

      set({
        domainGroups: response.data.recommendations,
        filters,
        loading: false
      });
    } catch (error) {
      console.error('获取推荐选题失败:', error);
      set({ loading: false });
      throw error;
    }
  },

  // 刷新选题数据
  refreshTopics: async (sources) => {
    set({ loading: true });
    try {
      await api.post('/topic-suggestions/refresh', { sources });
      await get().fetchRecommendations();
    } catch (error) {
      console.error('刷新选题失败:', error);
      set({ loading: false });
      throw error;
    }
  },

  // 基于知识库生成选题
  generateFromKnowledge: async (options) => {
    set({ loading: true });
    try {
      await api.post('/topic-suggestions/generate-from-knowledge', options);
      await get().fetchRecommendations();
    } catch (error) {
      console.error('生成知识库选题失败:', error);
      set({ loading: false });
      throw error;
    }
  },

  // 接受选题并创建文章
  acceptTopic: async (topicId, platform, column, userId, categoryId) => {
    try {
      const response = await api.post(`/topic-suggestions/${topicId}/accept`, {
        platform,
        column,
        userId,
        categoryId,
      });
      return response.data.article;
    } catch (error) {
      console.error('接受选题失败:', error);
      throw error;
    }
  },

  // 设置选中的选题
  setSelectedTopic: (topic) => {
    set({ selectedTopic: topic });
  },

  // 设置接受的选题数据
  setAcceptedTopicData: (data) => {
    set({ acceptedTopicData: data });
  },

  // 清除接受的选题数据
  clearAcceptedTopicData: () => {
    set({ acceptedTopicData: null });
  },

  // 设置筛选条件
  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } });
  },
}));
