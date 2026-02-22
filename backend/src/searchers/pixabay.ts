import { BaseSearcher } from './base';
import { SearchOptions, SearchResponse, SearchResult, MediaType } from './types';

/**
 * Pixabay 搜索器
 * API 文档: https://pixabay.com/api/docs/
 */
export class PixabaySearcher extends BaseSearcher {
  readonly id = 'pixabay';
  readonly name = 'Pixabay';
  readonly supportedTypes: MediaType[] = ['image', 'video'];

  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://pixabay.com/api';

  constructor() {
    super();
    this.apiKey = process.env.PIXABAY_API_KEY;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async search(options: SearchOptions): Promise<SearchResponse> {
    if (!this.apiKey) {
      throw new Error('Pixabay API Key 未配置');
    }

    const { query, type = 'image', page = 1, perPage = 20 } = options;
    const endpoint = type === 'video' ? '/videos/' : '/';
    const url = `${this.baseUrl}${endpoint}?key=${this.apiKey}&q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Pixabay API 错误: ${response.status}`);
    }

    const data = await response.json();

    if (type === 'video') {
      return this.parseVideoResponse(data, page, perPage);
    }
    return this.parseImageResponse(data, page, perPage);
  }

  private parseImageResponse(data: any, page: number, perPage: number): SearchResponse {
    const results: SearchResult[] = (data.hits || []).map((hit: any) => ({
      id: String(hit.id),
      source: this.id,
      type: 'image' as MediaType,
      title: hit.tags || `Pixabay Image ${hit.id}`,
      thumbnailUrl: hit.previewURL,
      previewUrl: hit.webformatURL,
      downloadUrl: hit.largeImageURL,
      width: hit.imageWidth,
      height: hit.imageHeight,
      author: hit.user,
      license: 'Pixabay License',
    }));

    return {
      results,
      total: data.totalHits || 0,
      page,
      perPage,
    };
  }

  private parseVideoResponse(data: any, page: number, perPage: number): SearchResponse {
    const results: SearchResult[] = (data.hits || []).map((hit: any) => {
      // 优先选择 small/medium 质量用于预览，large 用于下载
      const previewVideo = hit.videos?.small || hit.videos?.medium || hit.videos?.tiny;
      const downloadVideo = hit.videos?.large || hit.videos?.medium || hit.videos?.small;
      return {
        id: String(hit.id),
        source: this.id,
        type: 'video' as MediaType,
        title: hit.tags || `Pixabay Video ${hit.id}`,
        thumbnailUrl: `https://i.vimeocdn.com/video/${hit.picture_id}_295x166.jpg`,
        previewUrl: previewVideo?.url || `https://i.vimeocdn.com/video/${hit.picture_id}_640x360.jpg`,
        downloadUrl: downloadVideo?.url || '',
        width: downloadVideo?.width,
        height: downloadVideo?.height,
        duration: hit.duration,
        author: hit.user,
        license: 'Pixabay License',
      };
    });

    return {
      results,
      total: data.totalHits || 0,
      page,
      perPage,
    };
  }
}
