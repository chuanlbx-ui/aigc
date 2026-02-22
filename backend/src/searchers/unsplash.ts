import { BaseSearcher } from './base';
import { SearchOptions, SearchResponse, SearchResult, MediaType } from './types';

/**
 * Unsplash 搜索器
 * API 文档: https://unsplash.com/documentation
 */
export class UnsplashSearcher extends BaseSearcher {
  readonly id = 'unsplash';
  readonly name = 'Unsplash';
  readonly supportedTypes: MediaType[] = ['image'];

  private readonly accessKey: string | undefined;
  private readonly baseUrl = 'https://api.unsplash.com';

  constructor() {
    super();
    this.accessKey = process.env.UNSPLASH_ACCESS_KEY;
  }

  isConfigured(): boolean {
    return !!this.accessKey;
  }

  async search(options: SearchOptions): Promise<SearchResponse> {
    if (!this.accessKey) {
      throw new Error('Unsplash Access Key 未配置');
    }

    const { query, page = 1, perPage = 20 } = options;
    const url = `${this.baseUrl}/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;

    const response = await fetch(url, {
      headers: { Authorization: `Client-ID ${this.accessKey}` },
    });

    if (!response.ok) {
      throw new Error(`Unsplash API 错误: ${response.status}`);
    }

    const data = await response.json();
    return this.parseResponse(data, page, perPage);
  }

  private parseResponse(data: any, page: number, perPage: number): SearchResponse {
    const results: SearchResult[] = (data.results || []).map((photo: any) => ({
      id: photo.id,
      source: this.id,
      type: 'image' as MediaType,
      title: photo.alt_description || photo.description || `Unsplash Photo`,
      thumbnailUrl: photo.urls.thumb,
      previewUrl: photo.urls.small,
      downloadUrl: photo.urls.full,
      width: photo.width,
      height: photo.height,
      author: photo.user?.name,
      license: 'Unsplash License',
    }));

    return {
      results,
      total: data.total || 0,
      page,
      perPage,
    };
  }
}
