import { qualityScorer } from './qualityScorer.js';

export interface TopicForRecommendation {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  source: string;
  sourceType: string;
  hotScore: number;
  relevanceScore?: number;
  qualityScore?: number;
  fetchedAt: Date;
}

export interface RecommendationResult extends TopicForRecommendation {
  recommendScore: number;
  freshnessScore: number;
}

export class TopicRecommender {
  /**
   * 获取推荐选题
   */
  getRecommendations(
    topics: TopicForRecommendation[],
    options: {
      minRelevance?: number;
      limit?: number;
    } = {}
  ): RecommendationResult[] {
    const { minRelevance = 0.6, limit = 20 } = options;

    // 计算推荐评分
    const scoredTopics = topics.map(topic => {
      const recommendScore = this.calculateRecommendScore(topic);
      const freshnessScore = this.calculateFreshnessScore(topic.fetchedAt);

      return {
        ...topic,
        recommendScore,
        freshnessScore,
      };
    });

    // 过滤低相关性
    const filtered = scoredTopics.filter(topic => {
      if (topic.relevanceScore !== undefined && topic.relevanceScore !== null) {
        return topic.relevanceScore >= minRelevance;
      }
      return true;
    });

    // 按推荐评分排序
    const sorted = filtered.sort((a, b) => b.recommendScore - a.recommendScore);

    // 限制数量
    return sorted.slice(0, limit);
  }

  /**
   * 计算推荐评分
   * 公式: 0.4 × 知识库匹配度 + 0.3 × 热度分数 + 0.2 × 质量评分 + 0.1 × 时效性评分
   */
  private calculateRecommendScore(topic: TopicForRecommendation): number {
    const knowledgeRelevance = topic.relevanceScore || 0;
    const hotScoreNormalized = this.normalizeHotScore(topic.hotScore, topic.source);
    const qualityScore = topic.qualityScore || 0.5;
    const freshnessScore = this.calculateFreshnessScore(topic.fetchedAt);

    const score =
      knowledgeRelevance * 0.4 +
      hotScoreNormalized * 0.3 +
      qualityScore * 0.2 +
      freshnessScore * 0.1;

    return Math.min(1, Math.max(0, score));
  }

  /**
   * 归一化热度分数 (0-1)
   */
  private normalizeHotScore(hotScore: number, source: string): number {
    // 不同来源的热度范围不同
    const ranges: Record<string, { min: number; max: number }> = {
      weibo: { min: 0, max: 10000000 },      // 微博: 0-1000万
      toutiao: { min: 0, max: 5000000 },     // 头条: 0-500万
      zhihu: { min: 0, max: 1000000 },       // 知乎: 0-100万
      reddit: { min: 0, max: 100000 },       // Reddit: 0-10万
      knowledge: { min: 0, max: 1 },         // 知识库: 固定0.6
      report: { min: 0, max: 1 },            // 报告: 固定0.6
    };

    const range = ranges[source] || { min: 0, max: 1000000 };

    // 知识库和报告类型给固定中等热度
    if (source === 'knowledge' || source === 'report') {
      return 0.6;
    }

    // 线性归一化
    const normalized = (hotScore - range.min) / (range.max - range.min);
    return Math.min(1, Math.max(0, normalized));
  }

  /**
   * 计算时效性评分 (0-1)
   */
  private calculateFreshnessScore(fetchedAt: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - new Date(fetchedAt).getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours <= 24) {
      return 1.0;
    } else if (diffHours <= 48) {
      return 0.8;
    } else if (diffHours <= 72) {
      return 0.6;
    } else {
      return 0.4;
    }
  }
}

export const topicRecommender = new TopicRecommender();
