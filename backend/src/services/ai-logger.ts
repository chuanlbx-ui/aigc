/**
 * AI 调用日志服务
 * 记录所有 AI API 调用，用于成本统计和监控
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// AI 提供商定价（每 1000 tokens，美元）
const PRICING: Record<string, Record<string, { input: number; output: number }>> = {
  openai: {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  },
  claude: {
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'claude-3-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  },
  deepseek: {
    'deepseek-chat': { input: 0.0001, output: 0.0002 },
    'deepseek-coder': { input: 0.0001, output: 0.0002 },
  },
  kimi: {
    'moonshot-v1-8k': { input: 0.012, output: 0.012 },
    'moonshot-v1-32k': { input: 0.024, output: 0.024 },
    'moonshot-v1-128k': { input: 0.06, output: 0.06 },
  },
  qwen: {
    'qwen-turbo': { input: 0.002, output: 0.006 },
    'qwen-plus': { input: 0.004, output: 0.012 },
    'qwen-max': { input: 0.02, output: 0.06 },
    'qwen-long': { input: 0.0005, output: 0.002 },
  },
  zhipu: {
    'glm-4': { input: 0.014, output: 0.014 },
    'glm-4-flash': { input: 0.0001, output: 0.0001 },
    'glm-3-turbo': { input: 0.0007, output: 0.0007 },
  },
  gemini: {
    'gemini-pro': { input: 0.00025, output: 0.0005 },
    'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
    'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
  },
  openrouter: {
    'default': { input: 0.005, output: 0.015 },
  },
};

// 日志参数类型
export interface AILogParams {
  provider: string;
  model: string;
  endpoint: string;
  feature: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  status?: 'success' | 'error';
  errorMessage?: string;
  requestId?: string;
  requestType?: string;
}

// 计算成本
function calculateCost(provider: string, model: string, inputTokens: number, outputTokens: number): number {
  const providerPricing = PRICING[provider];
  if (!providerPricing) return 0;

  // 尝试精确匹配或前缀匹配
  let pricing = providerPricing[model];
  if (!pricing) {
    const matchedModel = Object.keys(providerPricing).find(m => model.startsWith(m));
    if (matchedModel) {
      pricing = providerPricing[matchedModel];
    }
  }

  if (!pricing) return 0;

  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;

  return inputCost + outputCost;
}

// 记录 AI 调用
export async function logAICall(params: AILogParams): Promise<void> {
  const totalTokens = params.inputTokens + params.outputTokens;
  const costUsd = calculateCost(params.provider, params.model, params.inputTokens, params.outputTokens);

  try {
    await prisma.aICallLog.create({
      data: {
        provider: params.provider,
        model: params.model,
        endpoint: params.endpoint,
        feature: params.feature,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        totalTokens,
        costUsd,
        latencyMs: params.latencyMs,
        status: params.status || 'success',
        errorMessage: params.errorMessage,
        requestId: params.requestId,
        requestType: params.requestType,
      },
    });

    // 更新每日统计
    await updateDailyStats(params, totalTokens, costUsd);
  } catch (error) {
    console.error('[AILogger] 记录失败:', error);
  }
}

// 更新每日统计
async function updateDailyStats(params: AILogParams, totalTokens: number, costUsd: number): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    await prisma.aIUsageDaily.upsert({
      where: {
        date_provider_model: {
          date: today,
          provider: params.provider,
          model: params.model,
        },
      },
      create: {
        date: today,
        provider: params.provider,
        model: params.model,
        callCount: 1,
        totalTokens,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        totalCostUsd: costUsd,
        avgLatencyMs: params.latencyMs,
        errorCount: params.status === 'error' ? 1 : 0,
      },
      update: {
        callCount: { increment: 1 },
        totalTokens: { increment: totalTokens },
        inputTokens: { increment: params.inputTokens },
        outputTokens: { increment: params.outputTokens },
        totalCostUsd: { increment: costUsd },
        errorCount: params.status === 'error' ? { increment: 1 } : undefined,
      },
    });
  } catch (error) {
    console.error('[AILogger] 更新每日统计失败:', error);
  }
}

// 获取统计数据
export async function getAIStats(days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const dailyStats = await prisma.aIUsageDaily.findMany({
    where: { date: { gte: startDate } },
    orderBy: { date: 'desc' },
  });

  // 汇总统计
  const summary = {
    totalCalls: 0,
    totalTokens: 0,
    totalCostUsd: 0,
    errorCount: 0,
    byProvider: {} as Record<string, { calls: number; tokens: number; cost: number }>,
  };

  for (const stat of dailyStats) {
    summary.totalCalls += stat.callCount;
    summary.totalTokens += stat.totalTokens;
    summary.totalCostUsd += stat.totalCostUsd;
    summary.errorCount += stat.errorCount;

    if (!summary.byProvider[stat.provider]) {
      summary.byProvider[stat.provider] = { calls: 0, tokens: 0, cost: 0 };
    }
    summary.byProvider[stat.provider].calls += stat.callCount;
    summary.byProvider[stat.provider].tokens += stat.totalTokens;
    summary.byProvider[stat.provider].cost += stat.totalCostUsd;
  }

  return { summary, dailyStats };
}

// 获取最近调用记录
export async function getRecentLogs(limit: number = 100) {
  return prisma.aICallLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

// 预算配置接口
export interface BudgetConfig {
  dailyLimitUsd: number;
  monthlyLimitUsd: number;
  perCallLimitUsd: number;
  warningThreshold: number; // 0-1，达到此比例时发出警告
}

// 默认预算配置
const DEFAULT_BUDGET: BudgetConfig = {
  dailyLimitUsd: 10,
  monthlyLimitUsd: 200,
  perCallLimitUsd: 1,
  warningThreshold: 0.8,
};

// 预算检查结果
export interface BudgetCheckResult {
  allowed: boolean;
  dailyUsed: number;
  dailyLimit: number;
  monthlyUsed: number;
  monthlyLimit: number;
  warning?: string;
}

/**
 * 检查预算是否允许继续调用
 */
export async function checkBudget(tenantId?: string): Promise<BudgetCheckResult> {
  const budget = await getBudgetConfig(tenantId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // 查询今日用量
  const dailyStats = await prisma.aIUsageDaily.aggregate({
    where: { date: { gte: today } },
    _sum: { totalCostUsd: true },
  });
  const dailyUsed = dailyStats._sum.totalCostUsd || 0;

  // 查询本月用量
  const monthlyStats = await prisma.aIUsageDaily.aggregate({
    where: { date: { gte: monthStart } },
    _sum: { totalCostUsd: true },
  });
  const monthlyUsed = monthlyStats._sum.totalCostUsd || 0;

  const result: BudgetCheckResult = {
    allowed: true,
    dailyUsed,
    dailyLimit: budget.dailyLimitUsd,
    monthlyUsed,
    monthlyLimit: budget.monthlyLimitUsd,
  };

  // 检查日预算
  if (dailyUsed >= budget.dailyLimitUsd) {
    result.allowed = false;
    result.warning = `已达到每日预算上限 $${budget.dailyLimitUsd}`;
    return result;
  }

  // 检查月预算
  if (monthlyUsed >= budget.monthlyLimitUsd) {
    result.allowed = false;
    result.warning = `已达到每月预算上限 $${budget.monthlyLimitUsd}`;
    return result;
  }

  // 预警
  if (dailyUsed >= budget.dailyLimitUsd * budget.warningThreshold) {
    result.warning = `今日 AI 费用已达 $${dailyUsed.toFixed(4)}，接近每日上限 $${budget.dailyLimitUsd}`;
  } else if (monthlyUsed >= budget.monthlyLimitUsd * budget.warningThreshold) {
    result.warning = `本月 AI 费用已达 $${monthlyUsed.toFixed(4)}，接近每月上限 $${budget.monthlyLimitUsd}`;
  }

  return result;
}

/**
 * 获取预算配置（从数据库或使用默认值）
 */
async function getBudgetConfig(tenantId?: string): Promise<BudgetConfig> {
  try {
    if (tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { config: true },
      });
      if (tenant?.config) {
        const config = typeof tenant.config === 'string'
          ? JSON.parse(tenant.config)
          : tenant.config;
        if ((config as Record<string, any>).aiBudget) {
          return { ...DEFAULT_BUDGET, ...(config as Record<string, any>).aiBudget };
        }
      }
    }
  } catch (error) {
    console.error('[AILogger] 获取预算配置失败:', error);
  }
  return DEFAULT_BUDGET;
}

/**
 * 估算单次调用成本
 */
export function estimateCallCost(provider: string, model: string, estimatedTokens: number): number {
  return calculateCost(provider, model, estimatedTokens * 0.7, estimatedTokens * 0.3);
}
