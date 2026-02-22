/**
 * 热点缓存服务
 * 使用 NodeCache 缓存热点数据，减少API调用
 */

import NodeCache from 'node-cache';
import { RawTopic } from './fetchers/base.js';

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
}

export class HotTopicCacheService {
  private cache: NodeCache;
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor() {
    // 缓存配置：30分钟过期
    this.cache = new NodeCache({
      stdTTL: 1800, // 30分钟
      checkperiod: 600, // 每10分钟检查一次过期项
      useClones: false,
    });

    this.cache.on('expired', (key) => {
      console.log(`[HotTopicCache] 缓存过期: ${key}`);
    });
  }

  /**
   * 生成缓存键
   */
  private generateKey(source: string): string {
    return `hot-topics:${source}`;
  }

  /**
   * 获取缓存
   */
  get(source: string): RawTopic[] | null {
    const key = this.generateKey(source);
    const cached = this.cache.get<RawTopic[]>(key);

    if (cached) {
      this.stats.hits++;
      console.log(`[HotTopicCache] 缓存命中: ${key}`);
      return cached;
    }

    this.stats.misses++;
    return null;
  }

  /**
   * 设置缓存
   */
  set(source: string, topics: RawTopic[]): void {
    const key = this.generateKey(source);
    this.cache.set(key, topics);
    console.log(`[HotTopicCache] 缓存设置: ${key}, 数量: ${topics.length}`);
  }

  /**
   * 清除特定缓存
   */
  delete(source: string): void {
    const key = this.generateKey(source);
    this.cache.del(key);
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.flushAll();
    console.log('[HotTopicCache] 所有缓存已清除');
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      totalRequests,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
  }
}

// 导出单例
export const hotTopicCacheService = new HotTopicCacheService();
