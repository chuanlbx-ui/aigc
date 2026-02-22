/**
 * 热点主服务
 * 整合所有抓取器，提供统一接口
 */

import { PrismaClient } from '@prisma/client';
import { WeiboFetcher } from './fetchers/weibo';
import { ToutiaoFetcher } from './fetchers/toutiao';
import { hotTopicCacheService } from './cache';
import { knowledgeMatcherService } from './matcher';
import { v4 as uuid } from 'uuid';

const prisma = new PrismaClient();

export interface HotTopicOptions {
  source?: 'weibo' | 'toutiao' | 'all';
  limit?: number;
  category?: string;
}

export class HotTopicService {
  private fetchers: Map<string, any>;

  constructor() {
    this.fetchers = new Map<string, any>([
      ['weibo', new WeiboFetcher()],
      ['toutiao', new ToutiaoFetcher()],
    ]);
  }

  /**
   * 获取热点列表（带缓存）
   */
  async fetchHotTopics(options: HotTopicOptions = {}): Promise<any[]> {
    const { source = 'all', limit = 20, category } = options;

    try {
      let allTopics: any[] = [];

      if (source === 'all') {
        // 获取所有来源
        for (const [sourceName, fetcher] of this.fetchers) {
          const topics = await this.fetchFromSource(sourceName, fetcher);
          allTopics.push(...topics);
        }
      } else {
        // 获取指定来源
        const fetcher = this.fetchers.get(source);
        if (fetcher) {
          allTopics = await this.fetchFromSource(source, fetcher);
        }
      }

      // 按热度排序
      allTopics.sort((a, b) => b.hotScore - a.hotScore);

      // 分类过滤
      if (category) {
        allTopics = allTopics.filter(t => t.category === category);
      }

      // 限制数量
      return allTopics.slice(0, limit);
    } catch (error) {
      console.error('获取热点失败:', error);
      return [];
    }
  }

  /**
   * 从指定来源获取热点（带缓存）
   */
  private async fetchFromSource(source: string, fetcher: any): Promise<any[]> {
    // 检查缓存
    const cached = hotTopicCacheService.get(source);
    if (cached) {
      return this.convertToDbFormat(cached, source);
    }

    // 调用抓取器
    const rawTopics = await fetcher.fetchTopics();

    // 存入缓存
    if (rawTopics.length > 0) {
      hotTopicCacheService.set(source, rawTopics);
    }

    return this.convertToDbFormat(rawTopics, source);
  }

  /**
   * 转换为数据库格式
   */
  private convertToDbFormat(rawTopics: any[], source: string) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24小时后过期

    return rawTopics.map(topic => ({
      id: uuid(),
      title: topic.title,
      description: topic.description || null,
      source,
      sourceUrl: topic.url || null,
      hotScore: topic.hotScore,
      category: topic.category || null,
      tags: JSON.stringify(topic.tags || []),
      matchedKnowledgeIds: '[]',
      relevanceScore: null,
      fetchedAt: now,
      expiresAt,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }));
  }

  /**
   * 刷新热点数据
   */
  async refreshHotTopics(source?: string): Promise<void> {
    if (source) {
      hotTopicCacheService.delete(source);
    } else {
      hotTopicCacheService.clear();
    }
    console.log(`[HotTopicService] 缓存已清除: ${source || 'all'}`);
  }

  /**
   * 匹配知识库
   */
  async matchKnowledge(topicId: string) {
    const topic = await prisma.hotTopic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new Error('热点不存在');
    }

    const result = await knowledgeMatcherService.matchKnowledge(
      topic.title,
      topic.description || undefined
    );

    // 更新热点的匹配结果
    await prisma.hotTopic.update({
      where: { id: topicId },
      data: {
        matchedKnowledgeIds: JSON.stringify(result.knowledgeDocs.map(d => d.id)),
        relevanceScore: result.relevanceScore,
      },
    });

    return result;
  }

  /**
   * 基于热点创建文章
   */
  async createArticleFromTopic(
    topicId: string,
    platform: string,
    column: string,
    userId?: string
  ) {
    const topic = await prisma.hotTopic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new Error('热点不存在');
    }

    // 生成文章slug
    const slug = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const filePath = `./articles/${slug}.md`;

    // 创建文章
    const article = await prisma.article.create({
      data: {
        title: topic.title,
        slug,
        summary: topic.description || undefined,
        filePath,
        platform,
        column,
        hotTopicId: topicId,
        userId,
        status: 'draft',
        workflowStep: 0,
      },
    });

    return article;
  }
}

// 导出单例
export const hotTopicService = new HotTopicService();
