/**
 * 模板推荐服务
 * 根据使用场景、历史记录、平台等因素智能推荐模板
 */

import { PrismaClient } from '@prisma/client';
import { TemplateType, UnifiedTemplate } from './types.js';

const prisma = new PrismaClient();

// 推荐结果
export interface RecommendationResult {
  template: UnifiedTemplate;
  score: number;
  reason: string;
}

// 推荐上下文
export interface RecommendContext {
  platform?: string;
  column?: string;
  contentType?: string;
  userId?: string;
}

// 权重配置
const WEIGHTS = {
  platformMatch: 0.4,
  usageFrequency: 0.3,
  recentUsage: 0.2,
  userRating: 0.1,
};

export class TemplateRecommender {
  /**
   * 获取推荐模板
   */
  async recommend(
    type: TemplateType,
    context: RecommendContext,
    limit: number = 5
  ): Promise<RecommendationResult[]> {
    const candidates = await this.getCandidates(type, context);
    const scored = await this.scoreTemplates(candidates, context);

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * 获取候选模板
   */
  private async getCandidates(
    type: TemplateType,
    context: RecommendContext
  ): Promise<any[]> {
    switch (type) {
      case 'workflow':
        return this.getWorkflowCandidates(context);
      case 'popup':
        return this.getPopupCandidates();
      case 'general':
        return this.getGeneralCandidates(context);
      default:
        return [];
    }
  }

  /**
   * 获取工作流模板候选
   */
  private async getWorkflowCandidates(context: RecommendContext): Promise<any[]> {
    const where: any = {};

    // 平台筛选
    if (context.platform) {
      where.platform = context.platform;
    }

    // 栏目筛选
    if (context.column) {
      where.column = context.column;
    }

    return prisma.workflowTemplate.findMany({
      where,
      orderBy: { usageCount: 'desc' },
      take: 20,
    });
  }

  /**
   * 获取弹窗模板候选
   */
  private async getPopupCandidates(): Promise<any[]> {
    return prisma.popupTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  /**
   * 获取通用模板候选
   */
  private async getGeneralCandidates(context: RecommendContext): Promise<any[]> {
    const where: any = {};

    if (context.contentType) {
      where.type = context.contentType;
    }

    return prisma.template.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  /**
   * 对模板进行评分
   */
  private async scoreTemplates(
    candidates: any[],
    context: RecommendContext
  ): Promise<RecommendationResult[]> {
    const results: RecommendationResult[] = [];

    for (const candidate of candidates) {
      const scores = this.calculateScores(candidate, context);
      const totalScore = this.calculateTotalScore(scores);
      const reason = this.generateReason(scores, candidate);

      results.push({
        template: this.transformToUnified(candidate),
        score: totalScore,
        reason,
      });
    }

    return results;
  }

  /**
   * 计算各维度分数
   */
  private calculateScores(
    candidate: any,
    context: RecommendContext
  ): Record<string, number> {
    const scores: Record<string, number> = {
      platformMatch: 0,
      usageFrequency: 0,
      recentUsage: 0,
      userRating: 0,
    };

    // 平台匹配度
    if (context.platform && candidate.platform === context.platform) {
      scores.platformMatch = 1;
    } else if (context.platform && candidate.platform) {
      scores.platformMatch = 0.3;
    } else {
      scores.platformMatch = 0.5;
    }

    // 使用频率（归一化到 0-1）
    const maxUsage = 100;
    scores.usageFrequency = Math.min((candidate.usageCount || 0) / maxUsage, 1);

    // 最近使用时间
    if (candidate.updatedAt) {
      const daysSinceUpdate = this.daysSince(new Date(candidate.updatedAt));
      scores.recentUsage = Math.max(0, 1 - daysSinceUpdate / 30);
    }

    // 用户评分（如果有）
    scores.userRating = candidate.rating ? candidate.rating / 5 : 0.5;

    return scores;
  }

  /**
   * 计算总分
   */
  private calculateTotalScore(scores: Record<string, number>): number {
    return (
      scores.platformMatch * WEIGHTS.platformMatch +
      scores.usageFrequency * WEIGHTS.usageFrequency +
      scores.recentUsage * WEIGHTS.recentUsage +
      scores.userRating * WEIGHTS.userRating
    );
  }

  /**
   * 生成推荐理由
   */
  private generateReason(scores: Record<string, number>, candidate: any): string {
    const reasons: string[] = [];

    if (scores.platformMatch >= 0.8) {
      reasons.push('平台匹配');
    }
    if (scores.usageFrequency >= 0.5) {
      reasons.push('热门模板');
    }
    if (scores.recentUsage >= 0.7) {
      reasons.push('近期活跃');
    }
    if (candidate.isSystem) {
      reasons.push('系统推荐');
    }

    return reasons.length > 0 ? reasons.join('、') : '综合推荐';
  }

  /**
   * 计算距今天数
   */
  private daysSince(date: Date): number {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * 转换为统一模板格式
   */
  private transformToUnified(candidate: any): UnifiedTemplate {
    // 根据候选模板的字段判断类型
    let type: TemplateType = 'general';
    if (candidate.platform !== undefined && candidate.column !== undefined) {
      type = 'workflow';
    } else if (candidate.category !== undefined && candidate.config?.style) {
      type = 'popup';
    }

    return {
      id: candidate.id,
      type,
      name: candidate.name,
      description: candidate.description || '',
      category: candidate.isSystem ? 'system' : 'custom',
      isSystem: candidate.isSystem || false,
      config: candidate.config || {},
      thumbnail: candidate.thumbnail,
      platform: candidate.platform,
      column: candidate.column,
      usageCount: candidate.usageCount || 0,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
    };
  }
}
