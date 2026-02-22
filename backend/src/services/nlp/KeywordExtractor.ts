/**
 * 关键词提取服务
 * 基于 TF-IDF 算法和中文分词进行智能关键词提取
 */

// 停用词列表
const STOP_WORDS = new Set([
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '那', '他', '她', '它', '们', '这个', '那个', '什么', '怎么',
  '可以', '没', '把', '让', '被', '给', '从', '向', '对', '与', '为', '以',
  '及', '等', '但', '而', '或', '如果', '因为', '所以', '虽然', '但是',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
  'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'and', 'or', 'but', 'if', 'because', 'until', 'while', 'although',
]);

// 关键词接口
export interface Keyword {
  word: string;
  weight: number;
  frequency: number;
  position: number; // 首次出现位置（0-1）
}

// 提取选项
export interface ExtractOptions {
  maxKeywords?: number;
  minWordLength?: number;
  includeEnglish?: boolean;
}

// 关键词聚类
export interface KeywordCluster {
  theme: string;
  keywords: Keyword[];
  totalWeight: number;
}

export class KeywordExtractor {
  /**
   * 提取关键词
   */
  extractKeywords(text: string, options: ExtractOptions = {}): Keyword[] {
    const {
      maxKeywords = 10,
      minWordLength = 2,
      includeEnglish = true,
    } = options;

    // 分词
    const words = this.tokenize(text, includeEnglish);

    // 计算词频
    const wordFreq = this.calculateFrequency(words);

    // 计算 TF-IDF 权重
    const keywords = this.calculateTFIDF(wordFreq, text, minWordLength);

    // 排序并返回
    return keywords
      .sort((a, b) => b.weight - a.weight)
      .slice(0, maxKeywords);
  }

  /**
   * 中文分词（简单实现）
   */
  private tokenize(text: string, includeEnglish: boolean): string[] {
    const words: string[] = [];

    // 中文分词：按标点和空格分割，然后提取连续中文
    const chinesePattern = /[\u4e00-\u9fa5]+/g;
    const chineseMatches = text.match(chinesePattern) || [];

    for (const match of chineseMatches) {
      // 简单的 n-gram 分词（2-4字）
      for (let len = 2; len <= Math.min(4, match.length); len++) {
        for (let i = 0; i <= match.length - len; i++) {
          words.push(match.substring(i, i + len));
        }
      }
    }

    // 英文分词
    if (includeEnglish) {
      const englishPattern = /[a-zA-Z]+/g;
      const englishMatches = text.match(englishPattern) || [];
      words.push(...englishMatches.map(w => w.toLowerCase()));
    }

    return words;
  }

  /**
   * 计算词频
   */
  private calculateFrequency(words: string[]): Map<string, number> {
    const freq = new Map<string, number>();

    for (const word of words) {
      if (!STOP_WORDS.has(word) && !STOP_WORDS.has(word.toLowerCase())) {
        freq.set(word, (freq.get(word) || 0) + 1);
      }
    }

    return freq;
  }

  /**
   * 计算 TF-IDF 权重
   */
  private calculateTFIDF(
    wordFreq: Map<string, number>,
    text: string,
    minWordLength: number
  ): Keyword[] {
    const keywords: Keyword[] = [];
    const totalWords = Array.from(wordFreq.values()).reduce((a, b) => a + b, 0);

    for (const [word, freq] of wordFreq) {
      if (word.length < minWordLength) continue;

      // TF: 词频 / 总词数
      const tf = freq / totalWords;

      // IDF: 简化版，基于词长度和是否为专有名词
      const idf = this.calculateIDF(word);

      // 位置权重
      const position = this.findFirstPosition(text, word);

      const weight = tf * idf * (1 + 0.2 * (1 - position));

      keywords.push({ word, weight, frequency: freq, position });
    }

    return keywords;
  }

  /**
   * 计算 IDF（简化版）
   */
  private calculateIDF(word: string): number {
    // 基础 IDF
    let idf = 1.0;

    // 长词加权
    if (word.length >= 4) idf *= 1.5;
    if (word.length >= 6) idf *= 1.3;

    // 英文专有名词（首字母大写）
    if (/^[A-Z][a-z]+/.test(word)) idf *= 1.4;

    // 全大写（缩写）
    if (/^[A-Z]+$/.test(word) && word.length >= 2) idf *= 1.6;

    return idf;
  }

  /**
   * 查找词在文本中的首次出现位置（0-1）
   */
  private findFirstPosition(text: string, word: string): number {
    const index = text.indexOf(word);
    if (index === -1) return 1;
    return index / text.length;
  }

  /**
   * 关键词聚类
   */
  clusterKeywords(keywords: Keyword[]): KeywordCluster[] {
    const clusters: KeywordCluster[] = [];
    const used = new Set<string>();

    for (const kw of keywords) {
      if (used.has(kw.word)) continue;

      const cluster: KeywordCluster = {
        theme: kw.word,
        keywords: [kw],
        totalWeight: kw.weight,
      };

      // 查找相似词
      for (const other of keywords) {
        if (used.has(other.word)) continue;
        if (other.word === kw.word) continue;

        if (this.isSimilar(kw.word, other.word)) {
          cluster.keywords.push(other);
          cluster.totalWeight += other.weight;
          used.add(other.word);
        }
      }

      used.add(kw.word);
      clusters.push(cluster);
    }

    return clusters.sort((a, b) => b.totalWeight - a.totalWeight);
  }

  /**
   * 判断两个词是否相似
   */
  private isSimilar(word1: string, word2: string): boolean {
    // 包含关系
    if (word1.includes(word2) || word2.includes(word1)) {
      return true;
    }
    return false;
  }
}
