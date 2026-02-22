/**
 * 模板组合服务
 */

import { PrismaClient } from '@prisma/client';
import { TemplateType } from './types.js';

const prisma = new PrismaClient();

// 组合类型
export type BundleType = 'sequential' | 'parallel' | 'conditional';

// 组合项
export interface BundleItem {
  id?: string;
  templateId: string;
  templateType: TemplateType;
  sortOrder: number;
  condition?: string;
  paramMapping?: Record<string, string>;
}

// 组合包信息
export interface BundleInfo {
  id: string;
  name: string;
  description?: string;
  bundleType: BundleType;
  config: Record<string, any>;
  isSystem: boolean;
  usageCount: number;
  items: BundleItem[];
  createdAt: Date;
  updatedAt: Date;
}

// 创建组合包参数
export interface CreateBundleParams {
  name: string;
  description?: string;
  bundleType?: BundleType;
  config?: Record<string, any>;
  items: BundleItem[];
}

export class TemplateComposer {
  /**
   * 创建组合包
   */
  async createBundle(
    params: CreateBundleParams,
    userId?: string
  ): Promise<BundleInfo> {
    const bundle = await prisma.templateBundle.create({
      data: {
        name: params.name,
        description: params.description,
        bundleType: params.bundleType || 'sequential',
        config: JSON.stringify(params.config || {}),
        userId,
        items: {
          create: params.items.map((item, index) => ({
            templateId: item.templateId,
            templateType: item.templateType,
            sortOrder: item.sortOrder ?? index,
            condition: item.condition,
            paramMapping: JSON.stringify(item.paramMapping || {}),
          })),
        },
      },
      include: { items: true },
    });

    return this.toBundleInfo(bundle);
  }

  /**
   * 获取组合包
   */
  async getBundle(id: string): Promise<BundleInfo | null> {
    const bundle = await prisma.templateBundle.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!bundle) return null;
    return this.toBundleInfo(bundle);
  }

  /**
   * 获取组合包列表
   */
  async listBundles(userId?: string): Promise<BundleInfo[]> {
    const bundles = await prisma.templateBundle.findMany({
      where: {
        OR: [{ isSystem: true }, { userId }],
        isEnabled: true,
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return bundles.map(b => this.toBundleInfo(b));
  }

  /**
   * 更新组合包
   */
  async updateBundle(
    id: string,
    data: Partial<CreateBundleParams>
  ): Promise<BundleInfo> {
    // 先删除旧的 items
    if (data.items) {
      await prisma.templateBundleItem.deleteMany({
        where: { bundleId: id },
      });
    }

    const bundle = await prisma.templateBundle.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        bundleType: data.bundleType,
        config: data.config ? JSON.stringify(data.config) : undefined,
        items: data.items ? {
          create: data.items.map((item, index) => ({
            templateId: item.templateId,
            templateType: item.templateType,
            sortOrder: item.sortOrder ?? index,
            condition: item.condition,
            paramMapping: JSON.stringify(item.paramMapping || {}),
          })),
        } : undefined,
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    return this.toBundleInfo(bundle);
  }

  /**
   * 删除组合包
   */
  async deleteBundle(id: string): Promise<void> {
    await prisma.templateBundle.delete({
      where: { id },
    });
  }

  /**
   * 增加使用次数
   */
  async incrementUsage(id: string): Promise<void> {
    await prisma.templateBundle.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }

  /**
   * 转换为 BundleInfo
   */
  private toBundleInfo(bundle: any): BundleInfo {
    return {
      id: bundle.id,
      name: bundle.name,
      description: bundle.description || undefined,
      bundleType: bundle.bundleType as BundleType,
      config: JSON.parse(bundle.config || '{}'),
      isSystem: bundle.isSystem,
      usageCount: bundle.usageCount,
      items: bundle.items.map((item: any) => ({
        id: item.id,
        templateId: item.templateId,
        templateType: item.templateType as TemplateType,
        sortOrder: item.sortOrder,
        condition: item.condition || undefined,
        paramMapping: JSON.parse(item.paramMapping || '{}'),
      })),
      createdAt: bundle.createdAt,
      updatedAt: bundle.updatedAt,
    };
  }
}