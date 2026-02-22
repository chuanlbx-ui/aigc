import { BaseSearcher } from './base.js';
import { SearchOptions, SearchResponse, SearchResult, MediaType } from './types.js';

/**
 * Freesound 搜索器
 * API 文档: https://freesound.org/docs/api/
 */
export class FreesoundSearcher extends BaseSearcher {
  readonly id = 'freesound';
  readonly name = 'Freesound';
  readonly supportedTypes: MediaType[] = ['audio'];

  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://freesound.org/apiv2';

  constructor() {
    super();
    this.apiKey = process.env.FREESOUND_API_KEY;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async search(options: SearchOptions): Promise<SearchResponse> {
    if (!this.apiKey) {
      throw new Error('Freesound API Key 未配置');
    }

    const { query, page = 1, perPage = 20 } = options;
    const fields = 'id,name,duration,username,previews,images,license';
    const url = `${this.baseUrl}/search/text/?query=${encodeURIComponent(query)}&page=${page}&page_size=${perPage}&fields=${fields}&token=${this.apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Freesound API 错误: ${response.status}`);
    }

    const data = await response.json();
    return this.parseResponse(data, page, perPage);
  }

  private parseResponse(data: any, page: number, perPage: number): SearchResponse {
    const results: SearchResult[] = (data.results || []).map((sound: any) => ({
      id: String(sound.id),
      source: this.id,
      type: 'audio' as MediaType,
      title: sound.name || `Freesound ${sound.id}`,
      thumbnailUrl: sound.images?.waveform_m || '',
      previewUrl: sound.previews?.['preview-lq-mp3'] || '',
      downloadUrl: sound.previews?.['preview-hq-mp3'] || '',
      duration: sound.duration,
      author: sound.username,
      license: sound.license,
    }));

    return {
      results,
      total: data.count || 0,
      page,
      perPage,
    };
  }
}
