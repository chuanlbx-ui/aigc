import { SearchOptions, SearchResponse, SearcherInfo, MediaType } from './types';

/**
 * 素材搜索器基类
 */
export abstract class BaseSearcher {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly supportedTypes: MediaType[];

  /**
   * 检查 API Key 是否已配置
   */
  abstract isConfigured(): boolean;

  /**
   * 执行搜索
   */
  abstract search(options: SearchOptions): Promise<SearchResponse>;

  /**
   * 获取搜索器信息
   */
  getInfo(): SearcherInfo {
    return {
      id: this.id,
      name: this.name,
      types: this.supportedTypes,
      configured: this.isConfigured(),
    };
  }
}
