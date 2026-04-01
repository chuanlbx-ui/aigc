/**
 * 图片相关性评估服务
 * 使用 AI 模型计算图片与关键词的语义相似度
 */

import { getDefaultAIConfig, createAIService } from '../ai/index.js';

export interface RelevanceScore {
  score: number; // 0-1 之间的相关性分数
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
}

export interface ImageWithRelevance {
  imageUrl: string;
  relevanceScore: RelevanceScore;
  width: number;
  height: number;
  source: string;
  [key: string]: any;
}

export class ImageRelevanceService {
  /**
   * 本地轻量级相关性评估（不调用 AI）
   * 基于关键词匹配、图片元数据（alt text/tags/description）打分
   */
  evaluateRelevanceLocal(
    imageMetadata: { alt?: string; tags?: string[]; description?: string; source?: string },
    keywords: string[]
  ): RelevanceScore {
    if (keywords.length === 0) {
      return { score: 0.5, confidence: 'low' };
    }

    const searchText = [
      imageMetadata.alt || '',
      imageMetadata.description || '',
      ...(imageMetadata.tags || []),
    ].join(' ').toLowerCase();

    if (!searchText.trim()) {
      return { score: 0.5, confidence: 'low' };
    }

    let matchCount = 0;
    let totalWeight = 0;

    for (const keyword of keywords) {
      const kw = keyword.toLowerCase();
      // 精确匹配权重更高
      if (searchText.includes(kw)) {
        matchCount++;
        // alt text 中匹配权重最高
        if ((imageMetadata.alt || '').toLowerCase().includes(kw)) {
          totalWeight += 3;
        }
        // tags 中匹配
        if ((imageMetadata.tags || []).some(t => t.toLowerCase().includes(kw))) {
          totalWeight += 2;
        }
        // description 中匹配
        if ((imageMetadata.description || '').toLowerCase().includes(kw)) {
          totalWeight += 1;
        }
      }
    }

    const matchRatio = matchCount / keywords.length;
    const maxPossibleWeight = keywords.length * 6; // 每个关键词最多 3+2+1=6
    const weightRatio = totalWeight / maxPossibleWeight;

    // 综合评分：匹配率 60% + 权重率 40%
    const score = Math.min(1, matchRatio * 0.6 + weightRatio * 0.4);

    let confidence: 'high' | 'medium' | 'low';
    if (matchRatio >= 0.7 && totalWeight > 0) {
      confidence = 'high';
    } else if (matchRatio >= 0.3) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    return {
      score: Math.round(score * 100) / 100,
      confidence,
      reason: `本地匹配: ${matchCount}/${keywords.length} 关键词命中`,
    };
  }

  /**
   * 使用 AI 评估图片与关键词的相关性
   * 通过视觉理解模型分析图片内容
   */
  async evaluateRelevance(
    imageUrl: string,
    keywords: string[],
    context?: string
  ): Promise<RelevanceScore> {
    try {
      const config = await getDefaultAIConfig();
      if (!config) {
        console.warn('未配置 AI 服务，跳过相关性评估');
        return { score: 0.5, confidence: 'low' };
      }

      const service = createAIService(config);

      // 构建评估提示词
      const prompt = this.buildEvaluationPrompt(keywords, context);

      // 调用 AI 服务分析图片
      const result = await service.generateContent(prompt, imageUrl);

      return this.parseRelevanceResult(result);
    } catch (error) {
      console.error('图片相关性评估失败:', error);
      return { score: 0.5, confidence: 'low' };
    }
  }

  /**
   * 批量评估多张图片的相关性
   * @param useLocalFirst 是否先用本地评估筛选，只对 top 候选调用 AI
   */
  async evaluateBatch(
    images: Array<{ url: string; alt?: string; tags?: string[]; description?: string; [key: string]: any }>,
    keywords: string[],
    context?: string,
    useLocalFirst: boolean = true
  ): Promise<ImageWithRelevance[]> {
    if (!useLocalFirst) {
      // 原有逻辑：全部调用 AI 评估
      const results: ImageWithRelevance[] = [];
      for (const image of images) {
        const relevanceScore = await this.evaluateRelevance(image.url, keywords, context);
        results.push({
          imageUrl: image.url,
          width: image.width || 0,
          height: image.height || 0,
          source: image.source || '',
          relevanceScore,
        });
      }
      return results.sort((a, b) => b.relevanceScore.score - a.relevanceScore.score);
    }

    // 优化逻辑：先本地评估，再对 top 候选 AI 评估
    const localResults = images.map(image => ({
      image,
      localScore: this.evaluateRelevanceLocal(
        { alt: image.alt, tags: image.tags, description: image.description },
        keywords
      ),
    }));

    // 按本地评分排序
    localResults.sort((a, b) => b.localScore.score - a.localScore.score);

    const AI_EVALUATE_COUNT = 2; // 只对 top-2 调用 AI
    const results: ImageWithRelevance[] = [];

    for (let i = 0; i < localResults.length; i++) {
      const { image, localScore } = localResults[i];
      let finalScore: RelevanceScore;

      if (i < AI_EVALUATE_COUNT && localScore.confidence !== 'high') {
        // top 候选且本地评估不够确信，调用 AI 精确评估
        finalScore = await this.evaluateRelevance(image.url, keywords, context);
      } else {
        // 使用本地评估结果
        finalScore = localScore;
      }

      results.push({
        imageUrl: image.url,
        width: image.width || 0,
        height: image.height || 0,
        source: image.source || '',
        relevanceScore: finalScore,
      });
    }

    return results.sort((a, b) => b.relevanceScore.score - a.relevanceScore.score);
  }

  /**
   * 构建评估提示词
   */
  private buildEvaluationPrompt(keywords: string[], context?: string): string {
    const keywordText = keywords.join('、');

    let prompt = `请分析这张图片与以下关键词的相关性：${keywordText}\n\n`;

    if (context) {
      prompt += `上下文：${context}\n\n`;
    }

    prompt += `请从以下维度评估：
1. 图片内容是否直接展示了关键词相关的主题
2. 图片风格是否适合文章配图
3. 图片是否能帮助读者理解内容

请以 JSON 格式返回评估结果：
{
  "score": 0.85,  // 0-1 之间的分数，1 表示完全相关
  "confidence": "high",  // high/medium/low
  "reason": "图片清晰展示了 AI 技术的应用场景，与关键词高度相关"
}`;

    return prompt;
  }

  /**
   * 解析 AI 返回的评估结果
   */
  private parseRelevanceResult(result: string): RelevanceScore {
    try {
      // 尝试提取 JSON
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('无法解析相关性评估结果');
        return { score: 0.5, confidence: 'low' };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        score: Math.max(0, Math.min(1, parsed.score || 0.5)),
        confidence: parsed.confidence || 'medium',
        reason: parsed.reason,
      };
    } catch (error) {
      console.error('解析相关性评估结果失败:', error);
      return { score: 0.5, confidence: 'low' };
    }
  }

  /**
   * 根据相关性分数过滤图片
   * @param threshold 最低分数阈值（0-1）
   */
  filterByRelevance(
    images: ImageWithRelevance[],
    threshold: number = 0.6
  ): ImageWithRelevance[] {
    return images.filter(img => img.relevanceScore.score >= threshold);
  }

  /**
   * 选择最佳图片（综合考虑相关性和质量）
   */
  selectBestImage(
    images: ImageWithRelevance[],
    orientation: 'landscape' | 'portrait' | 'square'
  ): ImageWithRelevance | null {
    if (images.length === 0) return null;

    const idealRatio = orientation === 'portrait' ? 0.75 : 1.5;

    // 综合评分：相关性 (70%) + 比例匹配度 (20%) + 分辨率 (10%)
    const scored = images.map(img => {
      const ratio = img.width / img.height;
      const ratioDiff = Math.abs(ratio - idealRatio);
      const ratioScore = Math.max(0, 1 - ratioDiff / 2);
      const resolutionScore = Math.min(1, img.width / 2000);

      const totalScore =
        img.relevanceScore.score * 0.7 +
        ratioScore * 0.2 +
        resolutionScore * 0.1;

      return { ...img, totalScore };
    });

    // 返回综合评分最高的图片
    return scored.reduce((best, current) =>
      current.totalScore > best.totalScore ? current : best
    );
  }
}

// 导出单例
export const imageRelevanceService = new ImageRelevanceService();
