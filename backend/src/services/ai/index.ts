import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// AI 服务接口
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface SearchResult {
  title: string;
  content: string;
  source?: string;
}

// 联网搜索结果
export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

// 带搜索的聊天响应
export interface ChatWithSearchResponse {
  content: string;
  searchResults?: WebSearchResult[];
}

export interface AIService {
  chat(messages: ChatMessage[]): Promise<string>;
  generateContent(prompt: string, context?: string): Promise<string>;
  summarize(content: string): Promise<string>;
  // 新增: 联网搜索能力
  supportsWebSearch(): boolean;
  chatWithSearch?(messages: ChatMessage[]): Promise<ChatWithSearchResponse>;
}

// AI 服务配置
export interface AIServiceConfig {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
}

// 转换数据库配置为接口类型
function toAIServiceConfig(dbConfig: any): AIServiceConfig {
  return {
    provider: dbConfig.provider,
    apiKey: dbConfig.apiKey,
    baseUrl: dbConfig.baseUrl || undefined,
    model: dbConfig.model,
  };
}

// 获取默认 AI 服务配置
export async function getDefaultAIConfig(): Promise<AIServiceConfig | null> {
  const config = await prisma.aIServiceConfig.findFirst({
    where: { isDefault: true, isEnabled: true },
  });
  if (!config) {
    const anyConfig = await prisma.aIServiceConfig.findFirst({
      where: { isEnabled: true },
    });
    return anyConfig ? toAIServiceConfig(anyConfig) : null;
  }
  return toAIServiceConfig(config);
}

// 获取指定 AI 服务配置
export async function getAIConfig(id: string): Promise<AIServiceConfig | null> {
  const config = await prisma.aIServiceConfig.findUnique({ where: { id } });
  return config ? toAIServiceConfig(config) : null;
}

// 获取指定或默认的 AI 服务配置
export async function getAIConfigOrDefault(serviceId?: string): Promise<AIServiceConfig | null> {
  if (serviceId) {
    return getAIConfig(serviceId);
  }
  return getDefaultAIConfig();
}

// 获取所有启用的 AI 服务配置列表
export async function getAllAIConfigs(): Promise<Array<{
  id: string;
  name: string;
  provider: string;
  model: string;
  supportsWebSearch: boolean;
  isDefault: boolean;
}>> {
  const configs = await prisma.aIServiceConfig.findMany({
    where: { isEnabled: true },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  const webSearchProviders = ['kimi', 'qwen', 'zhipu', 'gemini'];

  return configs.map(c => ({
    id: c.id,
    name: c.name,
    provider: c.provider,
    model: c.model,
    supportsWebSearch: webSearchProviders.includes(c.provider),
    isDefault: c.isDefault,
  }));
}

// 导入具体实现
import { OpenAIService } from './openai';
import { ClaudeService } from './claude';
import { DeepSeekService } from './deepseek';
import { KimiService } from './kimi';
import { QwenService } from './qwen';
import { ZhipuService } from './zhipu';
import { GeminiService } from './gemini';
import { OpenRouterService } from './openrouter';

// AI 服务工厂
export function createAIService(config: AIServiceConfig): AIService {
  switch (config.provider) {
    case 'openai':
      return new OpenAIService(config);
    case 'claude':
      return new ClaudeService(config);
    case 'deepseek':
      return new DeepSeekService(config);
    case 'kimi':
      return new KimiService(config);
    case 'qwen':
      return new QwenService(config);
    case 'zhipu':
      return new ZhipuService(config);
    case 'gemini':
      return new GeminiService(config);
    case 'openrouter':
      return new OpenRouterService(config);
    default:
      throw new Error(`不支持的 AI 服务: ${config.provider}`);
  }
}

// 导出默认 AI 服务实例（用于向后兼容）
export const aiService = {
  async getDefaultService(): Promise<AIService> {
    const config = await getDefaultAIConfig();
    if (!config) throw new Error('未配置默认 AI 服务');
    return createAIService(config);
  }
};

// ========== 任务级智能路由 ==========

export type AITaskType =
  | 'news_writing'    // 时事文章 → 优先联网搜索模型
  | 'deep_analysis'   // 深度分析 → 强推理模型
  | 'summarize'       // 快速摘要 → 性价比模型
  | 'hkr_review'      // HKR 审校 → 中文理解强的模型
  | 'keyword_extract'  // 关键词提取 → 快速便宜模型
  | 'draft_writing'   // 初稿写作 → 默认模型
  | 'general';        // 通用 → 默认模型

// 任务类型对应的 provider 偏好（按优先级排序）
const TASK_PROVIDER_PREFERENCES: Record<AITaskType, string[]> = {
  news_writing: ['kimi', 'qwen', 'zhipu', 'gemini'],  // 联网搜索优先
  deep_analysis: ['claude', 'openai', 'openrouter'],
  summarize: ['deepseek', 'openai', 'openrouter', 'qwen'],
  hkr_review: ['claude', 'openai', 'openrouter'],
  keyword_extract: ['deepseek', 'openai', 'openrouter', 'qwen'],
  draft_writing: [],  // 空 = 用默认
  general: [],
};

/**
 * 根据任务类型获取最优 AI 服务配置
 * 优先匹配偏好 provider，找不到则回退到默认
 */
export async function getAIConfigByTaskType(taskType: AITaskType): Promise<AIServiceConfig | null> {
  const preferences = TASK_PROVIDER_PREFERENCES[taskType];

  if (preferences.length > 0) {
    const configs = await prisma.aIServiceConfig.findMany({
      where: { isEnabled: true },
    });

    for (const preferred of preferences) {
      const match = configs.find(c => c.provider === preferred);
      if (match) return toAIServiceConfig(match);
    }
  }

  // 回退到默认
  return getDefaultAIConfig();
}

/**
 * 获取支持联网搜索的 AI 服务配置
 */
export async function getWebSearchAIConfig(): Promise<AIServiceConfig | null> {
  return getAIConfigByTaskType('news_writing');
}

