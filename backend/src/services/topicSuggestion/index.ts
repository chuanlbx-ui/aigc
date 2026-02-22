import { PrismaClient } from '@prisma/client';
import { domainClassifier, DOMAIN_CONFIG, TopicDomain } from './domainClassifier.js';
import { qualityScorer } from './qualityScorer.js';
import { topicRecommender } from './recommender.js';
import { knowledgeTopicGenerator } from './generators/knowledgeGenerator.js';
import { KnowledgeMatcherService } from '../hotTopic/matcher.js';
import { zhihuFetcher } from './fetchers/zhihuFetcher.js';
import { WeiboFetcher } from '../hotTopic/fetchers/weibo.js';
import { ToutiaoFetcher } from '../hotTopic/fetchers/toutiao.js';

const prisma = new PrismaClient();
const knowledgeMatcher = new KnowledgeMatcherService();

export interface DomainGroup {
  domain: TopicDomain;
  domainName: string;
  color: string;
  icon: string;
  topics: any[];
  totalCount: number;
}

export class TopicSuggestionService {
  private fetchers: Map<string, any>;

  constructor() {
    this.fetchers = new Map<string, any>([
      ['weibo', new WeiboFetcher()],
      ['toutiao', new ToutiaoFetcher()],
      ['zhihu', zhihuFetcher],
    ]);
  }

  /**
   * 获取推荐选题(按领域分组)
   */
  async getRecommendations(options: {
    domains?: TopicDomain[];
    limit?: number;
    minRelevance?: number;
  } = {}): Promise<{ recommendations: DomainGroup[] }> {
    const { domains, limit = 5, minRelevance = 0 } = options;

    // 获取所有活跃的选题
    const topics = await prisma.hotTopic.findMany({
      where: {
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { fetchedAt: 'desc' },
      take: 100,
    });

    // 解析JSON字段
    const parsedTopics = topics.map(topic => ({
      ...topic,
      description: topic.description ?? undefined,
      relevanceScore: topic.relevanceScore ?? undefined,
      qualityScore: topic.qualityScore ?? undefined,
      tags: typeof topic.tags === 'string' ? JSON.parse(topic.tags) : topic.tags,
      matchedKnowledgeIds: typeof topic.matchedKnowledgeIds === 'string'
        ? JSON.parse(topic.matchedKnowledgeIds)
        : topic.matchedKnowledgeIds,
    }));

    // 使用推荐引擎计算评分
    const recommendations = topicRecommender.getRecommendations(parsedTopics, {
      minRelevance,
      limit: 50,
    });

    // 按领域分组
    const domainGroups = this.groupByDomain(recommendations, domains, limit);

    return { recommendations: domainGroups };
  }

  /**
   * 刷新选题数据
   */
  async refreshTopics(sources?: string[]): Promise<void> {
    const sourcesToRefresh = sources || ['weibo', 'toutiao', 'zhihu'];

    for (const source of sourcesToRefresh) {
      const fetcher = this.fetchers.get(source);
      if (!fetcher) continue;

      try {
        console.log(`正在抓取${source}热点...`);
        const rawTopics = await fetcher.fetchTopics();

        // 并发处理，每次最多5个
        const batchSize = 5;
        for (let i = 0; i < rawTopics.length; i += batchSize) {
          const batch = rawTopics.slice(i, i + batchSize);
          await Promise.allSettled(
            batch.map((rawTopic: any) =>
              this.saveOrUpdateTopic(rawTopic, source, 'social')
                .catch(err => console.error(`保存选题失败: ${rawTopic.title}`, err))
            )
          );
        }

        console.log(`${source}热点抓取完成: ${rawTopics.length}条`);
      } catch (error) {
        console.error(`${source}热点抓取失败:`, error);
      }
    }
  }

  /**
   * 基于知识库生成选题
   */
  async generateFromKnowledge(options: {
    limit?: number;
    topicsPerDoc?: number;
  } = {}): Promise<void> {
    const generatedTopics = await knowledgeTopicGenerator.generateForAllDocs(options);

    for (const topic of generatedTopics) {
      await this.saveOrUpdateTopic(
        {
          title: topic.title,
          description: topic.description,
          tags: topic.tags,
          hotScore: 0,
        },
        'knowledge',
        'knowledge',
        topic.sourceDocId
      );
    }

    console.log(`知识库延伸选题生成完成: ${generatedTopics.length}条`);
  }

  /**
   * 获取指定领域的选题
   */
  async getTopicsByDomain(domain: TopicDomain, limit: number = 10): Promise<any[]> {
    const topics = await prisma.hotTopic.findMany({
      where: {
        domain,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { recommendScore: 'desc' },
      take: limit,
    });

    return topics.map(topic => ({
      ...topic,
      tags: typeof topic.tags === 'string' ? JSON.parse(topic.tags) : topic.tags,
      matchedKnowledgeIds: typeof topic.matchedKnowledgeIds === 'string'
        ? JSON.parse(topic.matchedKnowledgeIds)
        : topic.matchedKnowledgeIds,
    }));
  }

  /**
   * 接受选题并创建文章
   */
  async acceptTopic(topicId: string, platform: string, column: string, userId?: string, categoryId?: string): Promise<any> {
    const topic = await prisma.hotTopic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new Error('选题不存在');
    }

    // 创建文章数据
    const articleData: any = {
      title: topic.title,
      slug: `article-${Date.now()}`,
      summary: topic.description || '',
      filePath: `articles/article-${Date.now()}.md`,
      platform,
      column,
      status: 'draft',
      workflowStep: 0,
    };

    // 只在有值时添加可选字段
    if (userId) {
      console.log('[接受选题] 添加 userId:', userId);
      articleData.userId = userId;
    }
    if (categoryId) {
      console.log('[接受选题] 添加 categoryId:', categoryId);
      articleData.categoryId = categoryId;
    }
    if (topicId) {
      console.log('[接受选题] 添加 hotTopicId:', topicId);
      articleData.hotTopicId = topicId;
    }

    console.log('[接受选题] 最终数据:', JSON.stringify(articleData, null, 2));

    // 创建文章
    const article = await prisma.article.create({
      data: articleData,
    });

    return article;
  }

  /**
   * 按领域分组
   */
  private groupByDomain(topics: any[], domains?: TopicDomain[], limit: number = 5): DomainGroup[] {
    const groups: DomainGroup[] = [];
    const targetDomains = domains || [TopicDomain.TECH, TopicDomain.FINANCE, TopicDomain.CULTURE, TopicDomain.LIFE];

    for (const domain of targetDomains) {
      const domainTopics = topics.filter(t => t.domain === domain);

      // 去重: 根据标题去重,保留推荐评分最高的
      const uniqueTopics = Array.from(
        domainTopics.reduce((map, topic) => {
          const existing = map.get(topic.title);
          if (!existing || (topic.recommendScore || 0) > (existing.recommendScore || 0)) {
            map.set(topic.title, topic);
          }
          return map;
        }, new Map()).values()
      );

      const config = DOMAIN_CONFIG[domain];

      groups.push({
        domain,
        domainName: config.name,
        color: config.color,
        icon: config.icon,
        topics: uniqueTopics.slice(0, limit),
        totalCount: uniqueTopics.length,
      });
    }

    return groups;
  }

  /**
   * 保存或更新选题
   */
  private async saveOrUpdateTopic(
    rawTopic: any,
    source: string,
    sourceType: string,
    generatedBy?: string
  ): Promise<void> {
    console.log(`[保存选题] 开始处理: ${rawTopic.title}`);

    // 领域分类
    const classification = await domainClassifier.classify(rawTopic.title, rawTopic.description);
    console.log(`[保存选题] 领域分类: ${classification.domain}`);

    // 质量评分
    const qualityResult = qualityScorer.score({
      title: rawTopic.title,
      description: rawTopic.description,
      tags: rawTopic.tags || [],
      source,
      sourceType,
    });

    // 知识库匹配
    const matchResult = await knowledgeMatcher.matchKnowledge(rawTopic.title, rawTopic.description);

    // 计算推荐评分
    const recommendScore = topicRecommender['calculateRecommendScore']({
      id: '',
      title: rawTopic.title,
      description: rawTopic.description,
      tags: rawTopic.tags || [],
      source,
      sourceType,
      hotScore: rawTopic.hotScore || 0,
      relevanceScore: matchResult.relevanceScore,
      qualityScore: qualityResult.overall,
      fetchedAt: new Date(),
    });

    // 保存到数据库
    console.log(`[保存选题] 准备保存到数据库: ${rawTopic.title}`);
    try {
      await prisma.hotTopic.create({
        data: {
          title: rawTopic.title,
          description: rawTopic.description,
          source,
          sourceUrl: rawTopic.url,
          hotScore: parseInt(String(rawTopic.hotScore || 0), 10),
          category: rawTopic.category,
          tags: JSON.stringify(rawTopic.tags || []),
          domain: classification.domain,
          sourceType,
          generatedBy,
          qualityScore: qualityResult.overall,
          recommendScore,
          matchedKnowledgeIds: JSON.stringify(matchResult.knowledgeDocs.map(d => d.id)),
          relevanceScore: matchResult.relevanceScore,
          fetchedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后过期
          isActive: true,
        },
      });
      console.log(`[保存选题] 保存成功: ${rawTopic.title}`);
    } catch (error) {
      console.error(`[保存选题] 保存失败: ${rawTopic.title}`, error);
      throw error;
    }
  }
}

export const topicSuggestionService = new TopicSuggestionService();