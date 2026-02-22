/**
 * 知识库匹配服务
 * 使用AI评估热点与知识库的相关性
 */

import { PrismaClient } from '@prisma/client';
import { getDefaultAIConfig, createAIService } from '../ai/index.js';

const prisma = new PrismaClient();

export interface MatchResult {
  knowledgeDocs: Array<{
    id: string;
    title: string;
    summary: string | null;
    relevanceScore: number;
  }>;
  relevanceScore: number;
}

export class KnowledgeMatcherService {
  /**
   * 匹配知识库文档
   */
  async matchKnowledge(topicTitle: string, topicDescription?: string): Promise<MatchResult> {
    try {
      // 1. 提取关键词
      const keywords = this.extractKeywords(topicTitle);

      // 2. 在知识库中搜索
      const docs = await this.searchKnowledge(keywords);

      if (docs.length === 0) {
        return { knowledgeDocs: [], relevanceScore: 0 };
      }

      // 3. 使用AI评估相关性
      const scoredDocs = await this.scoreRelevance(topicTitle, topicDescription, docs);

      // 4. 过滤低相关性文档
      const filteredDocs = scoredDocs.filter(doc => doc.relevanceScore > 0.6);

      // 5. 计算整体相关性
      const avgScore = filteredDocs.length > 0
        ? filteredDocs.reduce((sum, doc) => sum + doc.relevanceScore, 0) / filteredDocs.length
        : 0;

      return {
        knowledgeDocs: filteredDocs.slice(0, 5), // 最多返回5个
        relevanceScore: avgScore,
      };
    } catch (error) {
      console.error('知识库匹配失败:', error);
      return { knowledgeDocs: [], relevanceScore: 0 };
    }
  }

  /**
   * 提取关键词
   */
  private extractKeywords(text: string): string[] {
    // 简单的关键词提取（可以使用更复杂的分词算法）
    const words = text.split(/[\s,，。！？、]+/).filter(w => w.length > 1);
    return [...new Set(words)].slice(0, 5);
  }

  /**
   * 搜索知识库
   */
  private async searchKnowledge(keywords: string[]) {
    const docs = await prisma.knowledgeDoc.findMany({
      where: {
        OR: keywords.map(keyword => ({
          OR: [
            { title: { contains: keyword } },
            { summary: { contains: keyword } },
            { tags: { contains: keyword } },
          ],
        })),
      },
      take: 10,
      select: {
        id: true,
        title: true,
        summary: true,
      },
    });

    return docs;
  }

  /**
   * 使用AI评估相关性
   */
  private async scoreRelevance(
    topicTitle: string,
    topicDescription: string | undefined,
    docs: Array<{ id: string; title: string; summary: string | null }>
  ) {
    const config = await getDefaultAIConfig();
    if (!config) {
      // 如果没有AI配置，使用简单的关键词匹配评分
      return docs.map(doc => ({
        ...doc,
        relevanceScore: this.simpleScore(topicTitle, doc.title),
      }));
    }

    const aiService = createAIService(config);
    const scoredDocs = [];

    for (const doc of docs) {
      const prompt = `评估以下热点话题与知识库文档的相关性，返回0-1之间的分数。

热点话题：${topicTitle}
${topicDescription ? `描述：${topicDescription}` : ''}

知识库文档：${doc.title}
${doc.summary ? `摘要：${doc.summary}` : ''}

请只返回一个0-1之间的数字，表示相关性评分。`;

      try {
        const result = await aiService.generateContent(prompt);
        const score = parseFloat(result.trim());
        scoredDocs.push({
          ...doc,
          relevanceScore: isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score)),
        });
      } catch (error) {
        console.error(`AI评分失败 [${doc.id}]:`, error);
        scoredDocs.push({
          ...doc,
          relevanceScore: this.simpleScore(topicTitle, doc.title),
        });
      }
    }

    return scoredDocs.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * 简单的关键词匹配评分
   */
  private simpleScore(topicTitle: string, docTitle: string): number {
    const topicWords = new Set(this.extractKeywords(topicTitle));
    const docWords = new Set(this.extractKeywords(docTitle));

    let matchCount = 0;
    topicWords.forEach(word => {
      if (docWords.has(word)) matchCount++;
    });

    return topicWords.size > 0 ? matchCount / topicWords.size : 0;
  }
}

// 导出单例
export const knowledgeMatcherService = new KnowledgeMatcherService();
