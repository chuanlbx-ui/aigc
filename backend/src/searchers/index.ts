import { BaseSearcher } from './base';
import { PexelsSearcher } from './pexels';
import { PixabaySearcher } from './pixabay';
import { UnsplashSearcher } from './unsplash';
import { FreesoundSearcher } from './freesound';

// 导出类型
export * from './types';
export { BaseSearcher } from './base';

// 搜索器实例
const searchers: Map<string, BaseSearcher> = new Map();

// 注册所有搜索器
searchers.set('pexels', new PexelsSearcher());
searchers.set('pixabay', new PixabaySearcher());
searchers.set('unsplash', new UnsplashSearcher());
searchers.set('freesound', new FreesoundSearcher());

/**
 * 获取所有搜索器
 */
export function getAllSearchers(): BaseSearcher[] {
  return Array.from(searchers.values());
}

/**
 * 根据 ID 获取搜索器
 */
export function getSearcher(id: string): BaseSearcher | undefined {
  return searchers.get(id);
}

/**
 * 获取所有搜索器信息
 */
export function getSearchersInfo() {
  return getAllSearchers().map(s => s.getInfo());
}
