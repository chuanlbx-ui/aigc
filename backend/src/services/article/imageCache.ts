/**
 * 图片搜索缓存服务
 * 使用内存缓存减少 API 调用次数
 */

import NodeCache from 'node-cache';
import fs from 'fs';
import path from 'path';

interface CachedSearchResult {
  photos: any[];
  timestamp: number;
  source: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
}

export class ImageCacheService {
  private cache: NodeCache;
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor() {
    // 缓存配置：24小时过期
    this.cache = new NodeCache({
      stdTTL: 86400, // 24小时
      checkperiod: 3600, // 每小时检查一次过期项
      useClones: false, // 不克隆对象，提升性能
    });

    // 监听缓存事件
    this.cache.on('expired', (key) => {
      console.log(`[ImageCache] 缓存过期: ${key}`);
    });
  }

  /**
   * 生成缓存键
   */
  private generateKey(keywords: string[], orientation: string, source: string): string {
    const keywordsStr = keywords.sort().join('-').toLowerCase();
    return `${source}:${keywordsStr}:${orientation}`;
  }

  /**
   * 获取缓存
   */
  get(keywords: string[], orientation: string, source: string): any[] | null {
    const key = this.generateKey(keywords, orientation, source);
    const cached = this.cache.get<CachedSearchResult>(key);

    if (cached) {
      this.stats.hits++;
      console.log(`[ImageCache] 缓存命中: ${key}`);
      return cached.photos;
    }

    this.stats.misses++;
    return null;
  }

  /**
   * 设置缓存
   */
  set(keywords: string[], orientation: string, source: string, photos: any[]): void {
    const key = this.generateKey(keywords, orientation, source);
    const data: CachedSearchResult = {
      photos,
      timestamp: Date.now(),
      source,
    };

    this.cache.set(key, data);
    console.log(`[ImageCache] 缓存设置: ${key}, 图片数量: ${photos.length}`);
  }

  /**
   * 清除特定缓存
   */
  delete(keywords: string[], orientation: string, source: string): void {
    const key = this.generateKey(keywords, orientation, source);
    this.cache.del(key);
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.flushAll();
    console.log('[ImageCache] 所有缓存已清除');
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

  /**
   * 获取缓存键列表
   */
  getKeys(): string[] {
    return this.cache.keys();
  }

  /**
   * 获取缓存大小
   */
  getSize(): number {
    return this.cache.keys().length;
  }
}

// 导出单例
export const imageCacheService = new ImageCacheService();
