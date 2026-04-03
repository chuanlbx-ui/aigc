import { PrismaClient, AIServiceConfig as PrismaAIServiceConfig } from '@prisma/client';

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
function toAIServiceConfig(dbConfig: PrismaAIServiceConfig): AIServiceConfig {
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
import { OpenAIService } from './openai.js';
import { ClaudeService } from './claude.js';
import { DeepSeekService } from './deepseek.js';
import { KimiService } from './kimi.js';
import { QwenService } from './qwen.js';
import { ZhipuService } from './zhipu.js';
import { GeminiService } from './gemini.js';
import { OpenRouterService } from './openrouter.js';

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

import { checkBudget, logAICall } from '../ai-logger.js';

/**
 * 创建带预算守卫的 AI 服务
 * 在每次调用前检查预算，调用后记录日志
 */
export async function createAIServiceWithBudget(
  config: AIServiceConfig,
  feature: string = 'general',
  tenantId?: string
): Promise<AIService> {
  const budgetCheck = await checkBudget(tenantId);
  if (!budgetCheck.allowed) {
    throw new Error(`AI 预算超限: ${budgetCheck.warning}`);
  }

  if (budgetCheck.warning) {
    console.warn(`[AI Budget] ${budgetCheck.warning}`);
  }

  const service = createAIService(config);

  // 包装 chat 方法，添加日志记录
  const originalChat = service.chat.bind(service);
  service.chat = async (messages) => {
    const startTime = Date.now();
    try {
      const result = await originalChat(messages);
      const latencyMs = Date.now() - startTime;
      // 估算 token 数（粗略：中文约 2 token/字，英文约 1.3 token/word）
      const inputText = messages.map(m => m.content).join('');
      const inputTokens = Math.ceil(inputText.length * 1.5);
      const outputTokens = Math.ceil(result.length * 1.5);

      await logAICall({
        provider: config.provider,
        model: config.model,
        endpoint: 'chat',
        feature,
        inputTokens,
        outputTokens,
        latencyMs,
        status: 'success',
      });

      return result;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      await logAICall({
        provider: config.provider,
        model: config.model,
        endpoint: 'chat',
        feature,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  // 包装 generateContent 方法
  const originalGenerate = service.generateContent.bind(service);
  service.generateContent = async (prompt, context) => {
    const startTime = Date.now();
    try {
      const result = await originalGenerate(prompt, context);
      const latencyMs = Date.now() - startTime;
      const inputTokens = Math.ceil((prompt.length + (context?.length || 0)) * 1.5);
      const outputTokens = Math.ceil(result.length * 1.5);

      await logAICall({
        provider: config.provider,
        model: config.model,
        endpoint: 'generateContent',
        feature,
        inputTokens,
        outputTokens,
        latencyMs,
        status: 'success',
      });

      return result;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      await logAICall({
        provider: config.provider,
        model: config.model,
        endpoint: 'generateContent',
        feature,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  return service;
}

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

// ========== SmartRouter：基于历史数据动态选择模型 ==========

interface ModelPerformance {
  provider: string;
  model: string;
  avgLatencyMs: number;
  errorRate: number;
  callCount: number;
}

/**
 * SmartRouter：基于 AICallLog 历史数据动态选择最优模型
 * 综合考虑：静态偏好 > 历史成功率 > 延迟 > 回退默认
 */
export class SmartRouter {
  /**
   * 获取指定任务类型的最优配置
   * 先按静态偏好筛选候选，再按历史数据排序，最后降级到默认
   */
  static async getBestConfig(taskType: AITaskType): Promise<AIServiceConfig | null> {
    const preferences = TASK_PROVIDER_PREFERENCES[taskType];
    const enabledConfigs = await prisma.aIServiceConfig.findMany({ where: { isEnabled: true } });

    // 候选列表：按静态偏好顺序筛选已启用的 provider
    const candidates = preferences.length > 0
      ? preferences
          .map(p => enabledConfigs.find(c => c.provider === p))
          .filter((c): c is NonNullable<typeof c> => !!c)
      : enabledConfigs;

    if (candidates.length === 0) return getDefaultAIConfig();
    if (candidates.length === 1) return toAIServiceConfig(candidates[0]);

    // 查询最近 7 天的历史表现
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const logs = await prisma.aICallLog.findMany({
      where: { createdAt: { gte: since } },
      select: { provider: true, model: true, latencyMs: true, status: true },
    });

    // 按 provider 聚合性能数据
    const perfMap = new Map<string, ModelPerformance>();
    for (const log of logs) {
      const key = log.provider;
      const existing = perfMap.get(key) || { provider: log.provider, model: log.model, avgLatencyMs: 0, errorRate: 0, callCount: 0 };
      const total = existing.callCount + 1;
      const errors = Math.round(existing.errorRate * existing.callCount) + (log.status === 'error' ? 1 : 0);
      perfMap.set(key, {
        provider: log.provider,
        model: log.model,
        avgLatencyMs: (existing.avgLatencyMs * existing.callCount + log.latencyMs) / total,
        errorRate: errors / total,
        callCount: total,
      });
    }

    // 对候选排序：错误率低 > 延迟低（历史数据不足时保持静态偏好顺序）
    const scored = candidates.map((c, idx) => {
      const perf = perfMap.get(c.provider);
      if (!perf || perf.callCount < 5) {
        // 历史数据不足，用静态偏好顺序作为分数（越靠前越好）
        return { config: c, score: 1000 - idx * 10 };
      }
      // 分数 = (1 - 错误率) * 100 - 延迟惩罚（每100ms扣1分）
      const score = (1 - perf.errorRate) * 100 - perf.avgLatencyMs / 100;
      return { config: c, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0].config;

    // 如果最优选错误率过高（>50%），降级到默认
    const bestPerf = perfMap.get(best.provider);
    if (bestPerf && bestPerf.callCount >= 5 && bestPerf.errorRate > 0.5) {
      console.warn(`[SmartRouter] ${best.provider} 错误率 ${(bestPerf.errorRate * 100).toFixed(0)}%，降级到默认模型`);
      return getDefaultAIConfig();
    }

    return toAIServiceConfig(best);
  }

  /**
   * 带自动降级的服务创建：首选失败时自动切换备选
   */
  static async createServiceWithFallback(
    taskType: AITaskType,
    feature: string,
    tenantId?: string
  ): Promise<AIService> {
    const primary = await SmartRouter.getBestConfig(taskType);
    if (!primary) throw new Error('未配置任何可用 AI 服务');

    try {
      return await createAIServiceWithBudget(primary, feature, tenantId);
    } catch (err) {
      // 首选失败，尝试默认模型
      console.warn(`[SmartRouter] 首选 ${primary.provider} 不可用，降级到默认模型`);
      const fallback = await getDefaultAIConfig();
      if (!fallback || fallback.provider === primary.provider) throw err;
      return await createAIServiceWithBudget(fallback, feature, tenantId);
    }
  }
}

