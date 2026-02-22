export interface QualityScoreResult {
  overall: number;  // 总分 0-1
  titleQuality: number;  // 标题质量 0-1
  descriptionQuality: number;  // 描述质量 0-1
  tagsRichness: number;  // 标签丰富度 0-1
  sourceCredibility: number;  // 来源可信度 0-1
}

export class QualityScorer {
  /**
   * 评估选题质量
   */
  score(topic: {
    title: string;
    description?: string;
    tags?: string[];
    source: string;
    sourceType?: string;
  }): QualityScoreResult {
    const titleQuality = this.scoreTitleQuality(topic.title);
    const descriptionQuality = this.scoreDescription(topic.description);
    const tagsRichness = this.scoreTagsRichness(topic.tags || []);
    const sourceCredibility = this.scoreSourceCredibility(topic.source, topic.sourceType);

    // 加权计算总分
    const overall =
      titleQuality * 0.4 +
      descriptionQuality * 0.3 +
      tagsRichness * 0.2 +
      sourceCredibility * 0.1;

    return {
      overall,
      titleQuality,
      descriptionQuality,
      tagsRichness,
      sourceCredibility,
    };
  }

  /**
   * 标题质量评分
   */
  private scoreTitleQuality(title: string): number {
    let score = 0;

    // 1. 长度评分 (10-50字为最佳)
    const length = title.length;
    if (length >= 10 && length <= 50) {
      score += 0.4;
    } else if (length >= 5 && length < 10) {
      score += 0.2;
    } else if (length > 50 && length <= 80) {
      score += 0.3;
    }

    // 2. 关键词密度 (包含实体词)
    const hasNumbers = /\d+/.test(title);
    const hasQuotes = /[「」『』""''《》]/.test(title);
    const hasQuestion = /[？?]/.test(title);
    const hasExclamation = /[！!]/.test(title);

    if (hasNumbers) score += 0.15;  // 包含数字
    if (hasQuotes) score += 0.1;    // 包含引号
    if (hasQuestion) score += 0.1;  // 包含疑问
    if (hasExclamation) score += 0.05; // 包含感叹

    // 3. 避免标题党
    const clickbaitPatterns = [
      /震惊/,
      /不看后悔/,
      /必看/,
      /绝对/,
      /竟然/,
      /居然/,
    ];
    const isClickbait = clickbaitPatterns.some(pattern => pattern.test(title));
    if (isClickbait) {
      score -= 0.2;
    }

    // 4. 清晰度 (避免过多标点符号)
    const punctuationCount = (title.match(/[，。！？、；：""''（）【】《》]/g) || []).length;
    if (punctuationCount <= 3) {
      score += 0.2;
    } else if (punctuationCount > 5) {
      score -= 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * 描述完整性评分
   */
  private scoreDescription(description?: string): number {
    if (!description) {
      return 0.3;  // 无描述给基础分
    }

    let score = 0.5;  // 有描述基础分

    const length = description.length;

    // 长度评分
    if (length >= 50 && length <= 300) {
      score += 0.3;
    } else if (length >= 20 && length < 50) {
      score += 0.2;
    } else if (length > 300) {
      score += 0.1;
    }

    // 结构评分
    const hasPunctuation = /[。！？]/.test(description);
    if (hasPunctuation) {
      score += 0.1;
    }

    // 信息丰富度
    const hasNumbers = /\d+/.test(description);
    const hasEntities = /[A-Z][a-z]+|[一-龥]{2,}公司|[一-龥]{2,}大学/.test(description);
    if (hasNumbers) score += 0.05;
    if (hasEntities) score += 0.05;

    return Math.min(1, score);
  }

  /**
   * 标签丰富度评分
   */
  private scoreTagsRichness(tags: string[]): number {
    if (tags.length === 0) {
      return 0.2;  // 无标签给基础分
    }

    let score = 0.4;  // 有标签基础分

    // 数量评分
    if (tags.length >= 3 && tags.length <= 5) {
      score += 0.4;
    } else if (tags.length >= 2) {
      score += 0.3;
    } else if (tags.length > 5) {
      score += 0.2;
    }

    // 质量评分 (标签长度合理)
    const avgLength = tags.reduce((sum, tag) => sum + tag.length, 0) / tags.length;
    if (avgLength >= 2 && avgLength <= 6) {
      score += 0.2;
    }

    return Math.min(1, score);
  }

  /**
   * 来源可信度评分
   */
  private scoreSourceCredibility(source: string, sourceType?: string): number {
    // 来源评分
    const sourceScores: Record<string, number> = {
      'weibo': 0.7,
      'toutiao': 0.7,
      'zhihu': 0.8,
      'reddit': 0.75,
      'knowledge': 0.9,  // 知识库延伸
      'report': 0.85,    // 行业报告
    };

    let score = sourceScores[source] || 0.6;

    // 来源类型加成
    if (sourceType === 'knowledge') {
      score = Math.min(1, score + 0.1);
    } else if (sourceType === 'report') {
      score = Math.min(1, score + 0.05);
    }

    return score;
  }
}

export const qualityScorer = new QualityScorer();
