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
