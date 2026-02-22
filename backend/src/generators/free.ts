/**
 * 免费素材库生成器 (Pexels + Pixabay)
 */

import {
  MediaGenerator,
  GenerateOptions,
  GeneratedMedia,
  ProviderInfo,
} from './base';

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  src: { original: string; large2x: string };
  photographer: string;
}

interface PixabayHit {
  id: number;
  webformatURL: string;
  largeImageURL: string;
  imageWidth: number;
  imageHeight: number;
  user: string;
}

export class FreeLibraryGenerator extends MediaGenerator {
  readonly info: ProviderInfo = {
    id: 'free',
    name: '免费素材库',
    description: 'Pexels + Pixabay 免费图片库',
    supportedTypes: ['image', 'video'],
    requiresApiKey: false,
  };

  private pexelsKey = process.env.PEXELS_API_KEY;
  private pixabayKey = process.env.PIXABAY_API_KEY;

  checkApiKey(): boolean {
    return true; // 免费库不强制要求 API Key
  }

  async generate(options: GenerateOptions): Promise<GeneratedMedia> {
    const query = options.keywords.join(' ');
    const orientation = options.orientation;

    // 并行搜索两个库
    const [pexelsResult, pixabayResult] = await Promise.allSettled([
      this.searchPexels(query, orientation),
      this.searchPixabay(query, orientation),
    ]);

    // 合并结果
    const results: GeneratedMedia[] = [];

    if (pexelsResult.status === 'fulfilled' && pexelsResult.value) {
      results.push(pexelsResult.value);
    }
    if (pixabayResult.status === 'fulfilled' && pixabayResult.value) {
      results.push(pixabayResult.value);
    }

    if (results.length === 0) {
      throw new Error('未找到匹配的免费素材');
    }

    // 随机返回一个结果
    return results[Math.floor(Math.random() * results.length)];
  }

  private async searchPexels(
    query: string,
    orientation: 'landscape' | 'portrait'
  ): Promise<GeneratedMedia | null> {
    if (!this.pexelsKey) return null;

    try {
      const url = new URL('https://api.pexels.com/v1/search');
      url.searchParams.set('query', query);
      url.searchParams.set('orientation', orientation);
      url.searchParams.set('per_page', '15'); // 增加结果数量

      const res = await fetch(url.toString(), {
        headers: { Authorization: this.pexelsKey },
      });

      if (!res.ok) return null;

      const data = await res.json();
      const photos: PexelsPhoto[] = data.photos || [];

      if (photos.length === 0) return null;

      // 按宽高比匹配度排序，选择最佳图片
      const targetRatio = orientation === 'portrait' ? 9 / 16 : 16 / 9;
      const sortedPhotos = photos.sort((a, b) => {
        const aRatio = a.width / a.height;
        const bRatio = b.width / b.height;
        return Math.abs(aRatio - targetRatio) - Math.abs(bRatio - targetRatio);
      });

      const photo = sortedPhotos[0];

      return {
        id: `pexels-${photo.id}`,
        type: 'image',
        url: photo.src.large2x || photo.src.original,
        width: photo.width,
        height: photo.height,
        provider: 'pexels',
        keywords: query.split(' '),
        createdAt: new Date(),
      };
    } catch {
      return null;
    }
  }

  private async searchPixabay(
    query: string,
    orientation: 'landscape' | 'portrait'
  ): Promise<GeneratedMedia | null> {
    if (!this.pixabayKey) return null;

    try {
      const url = new URL('https://pixabay.com/api/');
      url.searchParams.set('key', this.pixabayKey);
      url.searchParams.set('q', query);
      url.searchParams.set('orientation', orientation === 'portrait' ? 'vertical' : 'horizontal');
      url.searchParams.set('per_page', '15'); // 增加结果数量
      url.searchParams.set('safesearch', 'true');

      const res = await fetch(url.toString());
      if (!res.ok) return null;

      const data = await res.json();
      const hits: PixabayHit[] = data.hits || [];

      if (hits.length === 0) return null;

      // 按宽高比匹配度排序，选择最佳图片
      const targetRatio = orientation === 'portrait' ? 9 / 16 : 16 / 9;
      const sortedHits = hits.sort((a, b) => {
        const aRatio = a.imageWidth / a.imageHeight;
        const bRatio = b.imageWidth / b.imageHeight;
        return Math.abs(aRatio - targetRatio) - Math.abs(bRatio - targetRatio);
      });

      const hit = sortedHits[0];

      return {
        id: `pixabay-${hit.id}`,
        type: 'image',
        url: hit.largeImageURL,
        width: hit.imageWidth,
        height: hit.imageHeight,
        provider: 'pixabay',
        keywords: query.split(' '),
        createdAt: new Date(),
      };
    } catch {
      return null;
    }
  }
}
