/**
 * 智能配图服务
 * 分析文章内容，自动获取并插入配图
 */

import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import { PrismaClient } from '@prisma/client';
import { getDefaultAIConfig, createAIService } from '../ai/index';
import { buildImagePositionPrompt } from './prompts';
import { imageRelevanceService, ImageWithRelevance } from './imageRelevance';
import { imageCacheService } from './imageCache';
import { TongyiGenerator } from '../../generators/tongyi';

const prisma = new PrismaClient();

// 配图位置信息
export interface ImagePosition {
  id: string;
  lineNumber: number;
  afterText: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  suggestedKeywords: string[];
}

// 生成的图片信息
export interface GeneratedImage {
  positionId: string;
  url: string;
  localPath: string;
  source: string;
  keywords: string[];
  width: number;
  height: number;
  alt: string;
  relevanceScore?: number; // 相关性评分 (0-1)
  relevanceConfidence?: 'high' | 'medium' | 'low';
}

// 上传目录
const UPLOAD_DIR = './uploads/smart-images';
const CACHE_DIR = './cache/article-images';

// 确保目录存在
[UPLOAD_DIR, CACHE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

export class SmartImageService {
  private aiGenerator: TongyiGenerator;

  constructor() {
    this.aiGenerator = new TongyiGenerator();
  }

  /**
   * 从数据库获取启用的图片服务配置
   */
  private async getEnabledConfigs() {
    return prisma.imageServiceConfig.findMany({
      where: { isEnabled: true },
      orderBy: { priority: 'desc' },
    });
  }

  /**
   * 根据 provider 获取 API Key
   */
  private async getApiKey(provider: string): Promise<string | undefined> {
    const config = await prisma.imageServiceConfig.findFirst({
      where: { provider, isEnabled: true },
    });
    return config?.apiKey;
  }

  /**
   * 分析文章内容，识别适合配图的位置
   */
  async analyzeImagePositions(
    content: string,
    platform: string,
    column: string,
    maxImages: number = 5,
    serviceId?: string
  ): Promise<ImagePosition[]> {
    const { getAIConfigOrDefault } = await import('../ai/index');
    const config = await getAIConfigOrDefault(serviceId);
    if (!config) {
      throw new Error('请先配置 AI 服务');
    }

    const prompt = buildImagePositionPrompt({ content, platform, column, maxImages });
    const service = createAIService(config);
    const result = await service.generateContent(prompt);

    return this.parsePositionResult(result);
  }

  /**
   * 解析 AI 返回的位置分析结果
   */
  private parsePositionResult(result: string): ImagePosition[] {
    try {
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn('无法解析配图位置结果');
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((item: any, index: number) => ({
        id: uuid(),
        lineNumber: item.lineNumber || index + 1,
        afterText: item.afterText || '',
        reason: item.reason || '',
        priority: item.priority || 'medium',
        suggestedKeywords: item.suggestedKeywords || [],
      }));
    } catch (error) {
      console.error('解析配图位置失败:', error);
      return [];
    }
  }

  /**
   * 根据位置信息批量获取图片
   */
  async fetchImagesForPositions(
    positions: ImagePosition[],
    platform: string,
    imageServiceIds?: string[]
  ): Promise<GeneratedImage[]> {
    const results: GeneratedImage[] = [];
    const orientation = this.getOrientationByPlatform(platform);

    for (const pos of positions) {
      try {
        const image = await this.fetchImage(pos.suggestedKeywords, orientation, imageServiceIds);
        if (image) {
          results.push({
            ...image,
            positionId: pos.id,
            keywords: pos.suggestedKeywords,
            alt: this.generateAlt(pos.suggestedKeywords),
          });
        }
      } catch (error) {
        console.error(`获取图片失败 [${pos.id}]:`, error);
      }
    }

    return results;
  }

  /**
   * 获取单张图片
   */
  async fetchSingleImage(
    keywords: string[],
    orientation: 'landscape' | 'portrait' | 'square' = 'landscape'
  ): Promise<GeneratedImage | null> {
    const image = await this.fetchImage(keywords, orientation);
    if (image) {
      return {
        ...image,
        positionId: '',
        keywords,
        alt: this.generateAlt(keywords),
      };
    }
    return null;
  }

  /**
   * 从免费图库获取图片（带相关性评估），失败时回退到 AI 生成
   */
  private async fetchImage(
    keywords: string[],
    orientation: 'landscape' | 'portrait' | 'square',
    imageServiceIds?: string[]
  ): Promise<Omit<GeneratedImage, 'positionId' | 'keywords' | 'alt'> | null> {
    const query = keywords.join(' ');
    const candidates: Array<Omit<GeneratedImage, 'positionId' | 'keywords' | 'alt'>> = [];

    // 从数据库获取启用的图片服务配置
    let configs = await this.getEnabledConfigs();

    // 如果指定了图片服务 ID，则只使用指定的服务
    if (imageServiceIds && imageServiceIds.length > 0) {
      configs = configs.filter(c => imageServiceIds.includes(c.id));
    }

    // 按优先级尝试各个图库
    for (const config of configs) {
      if (config.provider === 'dashscope') continue; // AI 生成单独处理

      try {
        let images: Array<Omit<GeneratedImage, 'positionId' | 'keywords' | 'alt'>> = [];

        if (config.provider === 'unsplash') {
          images = await this.searchUnsplashMultiple(query, orientation, config.apiKey);
        } else if (config.provider === 'pexels') {
          images = await this.searchPexelsMultiple(query, orientation, config.apiKey);
        } else if (config.provider === 'pixabay') {
          images = await this.searchPixabayMultiple(query, orientation, config.apiKey);
        }

        candidates.push(...images);
      } catch (error) {
        console.error(`${config.provider} 搜索失败:`, error);
      }
    }

    // 如果没有候选图片，尝试 AI 生成
    if (candidates.length === 0) {
      console.log('图库搜索无结果，尝试 AI 生成图片...');
      const aiImage = await this.generateImageWithAI(keywords, orientation);
      if (aiImage) {
        return aiImage;
      }
      return this.getPlaceholderImage();
    }

    // 使用相关性评估选择最佳图片
    const bestImage = await this.selectBestImageWithRelevance(
      candidates,
      keywords,
      orientation
    );

    return bestImage || candidates[0];
  }

  /**
   * 搜索 Unsplash 返回多张候选图片（带缓存）
   */
  private async searchUnsplashMultiple(
    query: string,
    orientation: string,
    apiKey: string
  ): Promise<Array<Omit<GeneratedImage, 'positionId' | 'keywords' | 'alt'>>> {
    try {
      // 检查缓存
      const cached = imageCacheService.get([query], orientation, 'unsplash');
      if (cached && cached.length > 0) {
        return cached;
      }

      const url = new URL('https://api.unsplash.com/search/photos');
      url.searchParams.set('query', query);
      url.searchParams.set('per_page', '5');
      url.searchParams.set('orientation', orientation);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Client-ID ${apiKey}` },
      });

      if (!res.ok) return [];

      const data = await res.json();
      const photos = data.results || [];
      if (photos.length === 0) return [];

      // 下载所有候选图片
      const results = [];
      for (const photo of photos.slice(0, 3)) {
        try {
          const imageUrl = photo.urls.regular;
          const localPath = await this.downloadImage(imageUrl, 'unsplash');

          results.push({
            url: `/uploads/smart-images/${path.basename(localPath)}`,
            localPath,
            source: 'unsplash',
            width: photo.width,
            height: photo.height,
          });
        } catch (err) {
          console.error('下载 Unsplash 图片失败:', err);
        }
      }

      // 存入缓存
      if (results.length > 0) {
        imageCacheService.set([query], orientation, 'unsplash', results);
      }

      return results;
    } catch (error) {
      console.error('Unsplash 搜索失败:', error);
      return [];
    }
  }

  /**
   * 搜索 Pexels 返回多张候选图片（带缓存）
   */
  private async searchPexelsMultiple(
    query: string,
    orientation: string,
    apiKey: string
  ): Promise<Array<Omit<GeneratedImage, 'positionId' | 'keywords' | 'alt'>>> {
    try {
      // 检查缓存
      const cached = imageCacheService.get([query], orientation, 'pexels');
      if (cached && cached.length > 0) {
        return cached;
      }

      const url = new URL('https://api.pexels.com/v1/search');
      url.searchParams.set('query', query);
      url.searchParams.set('per_page', '5');
      url.searchParams.set('orientation', orientation);

      const res = await fetch(url.toString(), {
        headers: { Authorization: apiKey },
      });

      if (!res.ok) return [];

      const data = await res.json();
      const photos = data.photos || [];
      if (photos.length === 0) return [];

      const results = [];
      for (const photo of photos.slice(0, 3)) {
        try {
          const imageUrl = photo.src.large2x || photo.src.large;
          const localPath = await this.downloadImage(imageUrl, 'pexels');

          results.push({
            url: `/uploads/smart-images/${path.basename(localPath)}`,
            localPath,
            source: 'pexels',
            width: photo.width,
            height: photo.height,
          });
        } catch (err) {
          console.error('下载 Pexels 图片失败:', err);
        }
      }

      // 存入缓存
      if (results.length > 0) {
        imageCacheService.set([query], orientation, 'pexels', results);
      }

      return results;
    } catch (error) {
      console.error('Pexels 搜索失败:', error);
      return [];
    }
  }

  /**
   * 搜索 Pixabay 返回多张候选图片（带缓存）
   */
  private async searchPixabayMultiple(
    query: string,
    orientation: string,
    apiKey: string
  ): Promise<Array<Omit<GeneratedImage, 'positionId' | 'keywords' | 'alt'>>> {
    try {
      // 检查缓存
      const cached = imageCacheService.get([query], orientation, 'pixabay');
      if (cached && cached.length > 0) {
        return cached;
      }

      const url = new URL('https://pixabay.com/api/');
      url.searchParams.set('key', apiKey);
      url.searchParams.set('q', query);
      url.searchParams.set('per_page', '5');
      url.searchParams.set('orientation', orientation === 'portrait' ? 'vertical' : 'horizontal');

      const res = await fetch(url.toString());
      if (!res.ok) return [];

      const data = await res.json();
      const hits = data.hits || [];
      if (hits.length === 0) return [];

      const results = [];
      for (const hit of hits.slice(0, 3)) {
        try {
          const imageUrl = hit.largeImageURL;
          const localPath = await this.downloadImage(imageUrl, 'pixabay');

          results.push({
            url: `/uploads/smart-images/${path.basename(localPath)}`,
            localPath,
            source: 'pixabay',
            width: hit.imageWidth,
            height: hit.imageHeight,
          });
        } catch (err) {
          console.error('下载 Pixabay 图片失败:', err);
        }
      }

      // 存入缓存
      if (results.length > 0) {
        imageCacheService.set([query], orientation, 'pixabay', results);
      }

      return results;
    } catch (error) {
      console.error('Pixabay 搜索失败:', error);
      return [];
    }
  }

  /**
   * 使用相关性评估选择最佳图片
   */
  private async selectBestImageWithRelevance(
    candidates: Array<Omit<GeneratedImage, 'positionId' | 'keywords' | 'alt'>>,
    keywords: string[],
    orientation: 'landscape' | 'portrait' | 'square'
  ): Promise<Omit<GeneratedImage, 'positionId' | 'keywords' | 'alt'> | null> {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    try {
      // 限制只评估前 3 张候选图片，避免 AI 调用过多导致超时
      const MAX_EVALUATE_COUNT = 3;
      const toEvaluate = candidates.slice(0, MAX_EVALUATE_COUNT);

      // 为每张图片评估相关性
      const evaluatedImages = [];
      for (const candidate of toEvaluate) {
        const relevance = await imageRelevanceService.evaluateRelevance(
          candidate.url,
          keywords
        );

        evaluatedImages.push({
          ...candidate,
          relevanceScore: relevance.score,
          relevanceConfidence: relevance.confidence,
        });
      }

      // 使用相关性服务选择最佳图片
      const withRelevance: ImageWithRelevance[] = evaluatedImages.map(img => ({
        imageUrl: img.url,
        relevanceScore: {
          score: img.relevanceScore || 0.5,
          confidence: img.relevanceConfidence || 'medium',
        },
        width: img.width,
        height: img.height,
        source: img.source,
        url: img.url,
        localPath: img.localPath,
      }));

      const best = imageRelevanceService.selectBestImage(withRelevance, orientation);

      if (best) {
        return {
          url: best.url,
          localPath: best.localPath,
          source: best.source,
          width: best.width,
          height: best.height,
          relevanceScore: best.relevanceScore.score,
          relevanceConfidence: best.relevanceScore.confidence,
        };
      }

      return candidates[0];
    } catch (error) {
      console.error('相关性评估失败，使用默认选择:', error);
      return candidates[0];
    }
  }

  /**
   * 下载图片到本地
   */
  private async downloadImage(imageUrl: string, source: string): Promise<string> {
    const filename = `${source}-${uuid()}.jpg`;
    const localPath = path.join(UPLOAD_DIR, filename);

    const res = await fetch(imageUrl);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(localPath, buffer);

    return localPath;
  }

  /**
   * 使用 AI 生成图片
   */
  private async generateImageWithAI(
    keywords: string[],
    orientation: 'landscape' | 'portrait' | 'square'
  ): Promise<Omit<GeneratedImage, 'positionId' | 'keywords' | 'alt'> | null> {
    // 从数据库获取 DashScope API Key
    const dashscopeKey = await this.getApiKey('dashscope');
    if (!dashscopeKey) {
      console.warn('AI 图片生成器未配置 (dashscope)');
      return null;
    }

    // 临时设置环境变量供 TongyiGenerator 使用
    const originalKey = process.env.DASHSCOPE_API_KEY;
    process.env.DASHSCOPE_API_KEY = dashscopeKey;

    try {
      console.log('正在使用 AI 生成图片，关键词:', keywords.join(', '));

      // 构建更好的提示词
      const prompt = this.buildAIImagePrompt(keywords);
      const aiOrientation = orientation === 'portrait' ? 'portrait' : 'landscape';

      const result = await this.aiGenerator.generate({
        keywords,
        prompt,
        orientation: aiOrientation as 'landscape' | 'portrait',
      });

      // 检查是否成功获取到 URL
      if (!result.url) {
        console.error('AI 图片生成未返回 URL');
        return null;
      }

      // 下载 AI 生成的图片到本地
      const localPath = await this.downloadImage(result.url, 'ai-generated');

      console.log('AI 图片生成成功:', result.url);

      return {
        url: `/uploads/smart-images/${path.basename(localPath)}`,
        localPath,
        source: 'ai-generated',
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      console.error('AI 图片生成失败:', error);
      return null;
    } finally {
      // 恢复原始环境变量
      if (originalKey) {
        process.env.DASHSCOPE_API_KEY = originalKey;
      } else {
        delete process.env.DASHSCOPE_API_KEY;
      }
    }
  }

  /**
   * 构建 AI 图片生成的提示词
   */
  private buildAIImagePrompt(keywords: string[]): string {
    const keywordStr = keywords.join(', ');
    return `高质量专业摄影风格图片，主题：${keywordStr}。要求：清晰、美观、适合文章配图，无文字水印。`;
  }

  /**
   * 获取占位图
   */
  private getPlaceholderImage(): Omit<GeneratedImage, 'positionId' | 'keywords' | 'alt'> {
    return {
      url: 'https://via.placeholder.com/800x600?text=No+Image',
      localPath: '',
      source: 'placeholder',
      width: 800,
      height: 600,
    };
  }

  /**
   * 将图片插入到 Markdown 内容
   */
  insertImagesToContent(
    content: string,
    images: GeneratedImage[],
    positions: ImagePosition[]
  ): string {
    const lines = content.split('\n');

    const sortedImages = [...images].sort((a, b) => {
      const posA = positions.find(p => p.id === a.positionId);
      const posB = positions.find(p => p.id === b.positionId);
      return (posB?.lineNumber || 0) - (posA?.lineNumber || 0);
    });

    for (const img of sortedImages) {
      const pos = positions.find(p => p.id === img.positionId);
      if (pos && pos.lineNumber > 0 && pos.lineNumber <= lines.length) {
        const imgMarkdown = `\n![${img.alt}](${img.url})\n`;
        lines.splice(pos.lineNumber, 0, imgMarkdown);
      }
    }

    return lines.join('\n');
  }

  /**
   * 根据平台获取推荐的图片方向
   */
  private getOrientationByPlatform(platform: string): 'landscape' | 'portrait' | 'square' {
    switch (platform) {
      case 'xiaohongshu':
        return 'portrait';
      default:
        return 'landscape';
    }
  }

  /**
   * 生成图片 alt 文本
   */
  private generateAlt(keywords: string[]): string {
    return keywords.slice(0, 3).join(' - ');
  }

  /**
   * 选择最佳 Unsplash 图片
   */
  private selectBestPhoto(photos: any[], orientation: string): any {
    if (photos.length === 1) return photos[0];

    // 根据方向计算理想比例
    const idealRatio = orientation === 'portrait' ? 0.75 : 1.5;

    return photos.reduce((best, photo) => {
      const ratio = photo.width / photo.height;
      const bestRatio = best.width / best.height;
      const ratioDiff = Math.abs(ratio - idealRatio);
      const bestRatioDiff = Math.abs(bestRatio - idealRatio);

      // 优先选择比例更接近理想值的图片
      if (ratioDiff < bestRatioDiff) return photo;
      // 比例相同时选择分辨率更高的
      if (ratioDiff === bestRatioDiff && photo.width > best.width) return photo;
      return best;
    }, photos[0]);
  }

  /**
   * 选择最佳 Pexels 图片
   */
  private selectBestPexelsPhoto(photos: any[], orientation: string): any {
    if (photos.length === 1) return photos[0];

    const idealRatio = orientation === 'portrait' ? 0.75 : 1.5;

    return photos.reduce((best, photo) => {
      const ratio = photo.width / photo.height;
      const bestRatio = best.width / best.height;
      const ratioDiff = Math.abs(ratio - idealRatio);
      const bestRatioDiff = Math.abs(bestRatio - idealRatio);

      if (ratioDiff < bestRatioDiff) return photo;
      if (ratioDiff === bestRatioDiff && photo.width > best.width) return photo;
      return best;
    }, photos[0]);
  }
}

// 导出单例
export const smartImageService = new SmartImageService();
