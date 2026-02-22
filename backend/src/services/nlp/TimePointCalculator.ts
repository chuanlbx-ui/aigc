/**
 * 时间点计算服务
 * 根据内容结构智能计算关键词出现的时间点
 */

import { Keyword } from './KeywordExtractor.js';

// 时间点结果
export interface TimePoint {
  keyword: string;
  time: number; // 秒
  weight: number;
  reason: string;
}

// 计算选项
export interface TimePointOptions {
  totalDuration: number; // 总时长（秒）
  minInterval?: number;  // 最小间隔（秒）
  maxPoints?: number;    // 最大时间点数
}

export class TimePointCalculator {
  /**
   * 计算时间点
   */
  calculate(keywords: Keyword[], options: TimePointOptions): TimePoint[] {
    const {
      totalDuration,
      minInterval = 2,
      maxPoints = 10,
    } = options;

    // 按权重排序
    const sorted = [...keywords].sort((a, b) => b.weight - a.weight);
    const selected = sorted.slice(0, maxPoints);

    // 计算时间点
    const timePoints = this.distributeTimePoints(selected, totalDuration, minInterval);

    return timePoints;
  }

  /**
   * 分布时间点
   */
  private distributeTimePoints(
    keywords: Keyword[],
    totalDuration: number,
    minInterval: number
  ): TimePoint[] {
    const results: TimePoint[] = [];

    // 按位置排序
    const byPosition = [...keywords].sort((a, b) => a.position - b.position);

    let lastTime = 0;

    for (const kw of byPosition) {
      // 基于位置计算时间
      let time = kw.position * totalDuration;

      // 确保最小间隔
      if (time - lastTime < minInterval) {
        time = lastTime + minInterval;
      }

      // 不超过总时长
      if (time >= totalDuration) break;

      results.push({
        keyword: kw.word,
        time: Math.round(time * 10) / 10,
        weight: kw.weight,
        reason: this.generateReason(kw),
      });

      lastTime = time;
    }

    return results;
  }

  /**
   * 生成时间点理由
   */
  private generateReason(kw: Keyword): string {
    const reasons: string[] = [];

    if (kw.frequency >= 3) {
      reasons.push('高频词');
    }

    if (kw.position < 0.3) {
      reasons.push('开篇关键');
    }

    if (kw.weight > 0.1) {
      reasons.push('核心概念');
    }

    return reasons.length > 0 ? reasons.join('、') : '内容关键词';
  }
}
