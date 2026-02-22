/**
 * 模板市场服务
 */

import { PrismaClient } from '@prisma/client';
import { TemplateType } from './types.js';

const prisma = new PrismaClient();

// 市场模板状态
export type MarketplaceStatus = 'pending' | 'approved' | 'rejected';

// 市场模板信息
export interface MarketplaceItem {
  id: string;
  templateId: string;
  templateType: TemplateType;
  title: string;
  description?: string;
  thumbnail?: string;
  category?: string;
  tags: string[];
  publisherId: string;
  publisherName?: string;
  status: MarketplaceStatus;
  downloads: number;
  rating: number;
  ratingCount: number;
  price: number;
  createdAt: Date;
}

// 发布参数
export interface PublishParams {
  templateId: string;
  templateType: TemplateType;
  title: string;
  description?: string;
  thumbnail?: string;
  category?: string;
  tags?: string[];
  price?: number;
}

export class TemplateMarketplace {
  /**
   * 发布模板到市场
   */
  async publish(
    params: PublishParams,
    publisherId: string,
    publisherName?: string
  ): Promise<MarketplaceItem> {
    const item = await prisma.marketplaceTemplate.create({
      data: {
        templateId: params.templateId,
        templateType: params.templateType,
        title: params.title,
        description: params.description,
        thumbnail: params.thumbnail,
        category: params.category,
        tags: JSON.stringify(params.tags || []),
        price: params.price || 0,
        publisherId,
        publisherName,
      },
    });

    return this.toMarketplaceItem(item);
  }

  /**
   * 获取市场模板列表
   */
  async list(filters: {
    category?: string;
    search?: string;
    status?: MarketplaceStatus;
  } = {}): Promise<MarketplaceItem[]> {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    } else {
      where.status = 'approved';
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.search) {
      where.title = { contains: filters.search };
    }

    const items = await prisma.marketplaceTemplate.findMany({
      where,
      orderBy: { downloads: 'desc' },
      take: 50,
    });

    return items.map(i => this.toMarketplaceItem(i));
  }

  /**
   * 获取单个市场模板
   */
  async get(id: string): Promise<MarketplaceItem | null> {
    const item = await prisma.marketplaceTemplate.findUnique({
      where: { id },
    });
    if (!item) return null;
    return this.toMarketplaceItem(item);
  }

  /**
   * 下载模板（增加下载计数）
   */
  async download(id: string): Promise<void> {
    await prisma.marketplaceTemplate.update({
      where: { id },
      data: { downloads: { increment: 1 } },
    });
  }

  /**
   * 添加评分
   */
  async addReview(
    marketplaceId: string,
    userId: string,
    rating: number,
    comment?: string,
    userName?: string
  ): Promise<void> {
    await prisma.marketplaceReview.create({
      data: {
        marketplaceId,
        userId,
        rating,
        comment,
        userName,
      },
    });

    // 更新平均评分
    const reviews = await prisma.marketplaceReview.findMany({
      where: { marketplaceId },
    });

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await prisma.marketplaceTemplate.update({
      where: { id: marketplaceId },
      data: {
        rating: avgRating,
        ratingCount: reviews.length,
      },
    });
  }

  /**
   * 转换为 MarketplaceItem
   */
  private toMarketplaceItem(item: any): MarketplaceItem {
    return {
      id: item.id,
      templateId: item.templateId,
      templateType: item.templateType as TemplateType,
      title: item.title,
      description: item.description || undefined,
      thumbnail: item.thumbnail || undefined,
      category: item.category || undefined,
      tags: JSON.parse(item.tags || '[]'),
      publisherId: item.publisherId,
      publisherName: item.publisherName || undefined,
      status: item.status as MarketplaceStatus,
      downloads: item.downloads,
      rating: item.rating,
      ratingCount: item.ratingCount,
      price: item.price,
      createdAt: item.createdAt,
    };
  }
}
