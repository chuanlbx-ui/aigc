import { BaseSearcher } from './base';
import { SearchOptions, SearchResponse, SearchResult, MediaType } from './types';

/**
 * Pexels 搜索器
 * API 文档: https://www.pexels.com/api/documentation/
 */
export class PexelsSearcher extends BaseSearcher {
  readonly id = 'pexels';
  readonly name = 'Pexels';
  readonly supportedTypes: MediaType[] = ['image', 'video'];

  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://api.pexels.com';

  constructor() {
    super();
    this.apiKey = process.env.PEXELS_API_KEY;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async search(options: SearchOptions): Promise<SearchResponse> {
    if (!this.apiKey) {
      throw new Error('Pexels API Key 未配置');
    }

    const { query, type = 'image', page = 1, perPage = 20 } = options;
    const endpoint = type === 'video' ? '/videos/search' : '/v1/search';
    const url = `${this.baseUrl}${endpoint}?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;

    const response = await fetch(url, {
      headers: { Authorization: this.apiKey },
    });

    if (!response.ok) {
      throw new Error(`Pexels API 错误: ${response.status}`);
    }

    const data = await response.json();

    if (type === 'video') {
      return this.parseVideoResponse(data, page, perPage);
    }
    return this.parseImageResponse(data, page, perPage);
  }

  private parseImageResponse(data: any, page: number, perPage: number): SearchResponse {
    const results: SearchResult[] = (data.photos || []).map((photo: any) => ({
      id: String(photo.id),
      source: this.id,
      type: 'image' as MediaType,
      title: photo.alt || `Pexels Photo ${photo.id}`,
      thumbnailUrl: photo.src.small,
      previewUrl: photo.src.medium,
      downloadUrl: photo.src.original,
      width: photo.width,
      height: photo.height,
      author: photo.photographer,
      license: 'Pexels License',
    }));

    return {
      results,
      total: data.total_results || 0,
      page,
      perPage,
    };
  }

  private parseVideoResponse(data: any, page: number, perPage: number): SearchResponse {
    const results: SearchResult[] = (data.videos || []).map((video: any) => {
      // 优先选择 SD 质量用于预览，HD 用于下载
      const previewFile = video.video_files?.find((f: any) => f.quality === 'sd') || video.video_files?.[0];
      const hdFile = video.video_files?.find((f: any) => f.quality === 'hd') || previewFile;
      return {
        id: String(video.id),
        source: this.id,
        type: 'video' as MediaType,
        title: `Pexels Video ${video.id}`,
        thumbnailUrl: video.image,
        previewUrl: previewFile?.link || video.image,  // 使用视频链接作为预览
        downloadUrl: hdFile?.link || '',
        width: video.width,
        height: video.height,
        duration: video.duration,
        author: video.user?.name,
        license: 'Pexels License',
      };
    });

    return {
      results,
      total: data.total_results || 0,
      page,
      perPage,
    };
  }
}
