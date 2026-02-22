/**
 * 统一模板服务
 * 整合弹窗模板、工作流模板、通用模板的统一管理
 */

import { PrismaClient } from '@prisma/client';
import {
  TemplateType,
  UnifiedTemplate,
  TemplateFilters,
  CreateTemplateData,
  UpdateTemplateData,
  TemplateListResponse,
  PaginationParams,
} from './types.js';

const prisma = new PrismaClient();

export class UnifiedTemplateService {
  /**
   * 获取模板列表
   */
  async listTemplates(
    filters: TemplateFilters = {},
    pagination: PaginationParams = {}
  ): Promise<TemplateListResponse> {
    const { page = 1, pageSize = 20 } = pagination;
    const skip = (page - 1) * pageSize;

    // 根据类型分别查询
    const results = await this.queryByType(filters, skip, pageSize);

    return {
      templates: results.templates,
      total: results.total,
      page,
      pageSize,
    };
  }

  /**
   * 根据类型查询模板
   */
  private async queryByType(
    filters: TemplateFilters,
    skip: number,
    take: number
  ): Promise<{ templates: UnifiedTemplate[]; total: number }> {
    const { type, search, category, platform, column, isSystem, userId } = filters;

    // 如果指定了类型，只查询该类型
    if (type) {
      return this.querySingleType(type, filters, skip, take);
    }

    // 否则查询所有类型并合并
    const [popupResult, workflowResult, generalResult, layoutResult] = await Promise.all([
      this.querySingleType('popup', filters, 0, 1000),
      this.querySingleType('workflow', filters, 0, 1000),
      this.querySingleType('general', filters, 0, 1000),
      this.querySingleType('layout', filters, 0, 1000),
    ]);

    const allTemplates = [
      ...popupResult.templates,
      ...workflowResult.templates,
      ...generalResult.templates,
      ...layoutResult.templates,
    ];

    // 排序：系统模板优先，然后按更新时间
    allTemplates.sort((a, b) => {
      if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

    const total = allTemplates.length;
    const templates = allTemplates.slice(skip, skip + take);

    return { templates, total };
  }

  /**
   * 查询单一类型的模板
   */
  private async querySingleType(
    type: TemplateType,
    filters: TemplateFilters,
    skip: number,
    take: number
  ): Promise<{ templates: UnifiedTemplate[]; total: number }> {
    switch (type) {
      case 'popup':
        return this.queryPopupTemplates(filters, skip, take);
      case 'workflow':
        return this.queryWorkflowTemplates(filters, skip, take);
      case 'general':
        return this.queryGeneralTemplates(filters, skip, take);
      case 'layout':
        return this.queryLayoutTemplates(filters, skip, take);
      default:
        return { templates: [], total: 0 };
    }
  }

  /**
   * 查询弹窗模板
   */
  private async queryPopupTemplates(
    filters: TemplateFilters,
    skip: number,
    take: number
  ): Promise<{ templates: UnifiedTemplate[]; total: number }> {
    const where: any = {};

    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.isSystem !== undefined) {
      where.isSystem = filters.isSystem;
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const [templates, total] = await Promise.all([
      prisma.popupTemplate.findMany({
        where,
        skip,
        take,
        orderBy: [{ isSystem: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.popupTemplate.count({ where }),
    ]);

    return {
      templates: templates.map(t => this.transformPopupTemplate(t)),
      total,
    };
  }

  /**
   * 转换弹窗模板为统一格式
   */
  private transformPopupTemplate(template: any): UnifiedTemplate {
    return {
      id: template.id,
      type: 'popup',
      name: template.name,
      description: template.description,
      category: template.category,
      isSystem: template.isSystem,
      config: JSON.parse(template.config),
      usageCount: 0,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  /**
   * 查询工作流模板
   */
  private async queryWorkflowTemplates(
    filters: TemplateFilters,
    skip: number,
    take: number
  ): Promise<{ templates: UnifiedTemplate[]; total: number }> {
    const where: any = { isEnabled: true };

    if (filters.isSystem !== undefined) {
      where.isSystem = filters.isSystem;
    }
    if (filters.platform) {
      where.platform = filters.platform;
    }
    if (filters.column) {
      where.column = filters.column;
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const [templates, total] = await Promise.all([
      prisma.workflowTemplate.findMany({
        where,
        skip,
        take,
        orderBy: [{ isSystem: 'desc' }, { usageCount: 'desc' }],
      }),
      prisma.workflowTemplate.count({ where }),
    ]);

    return {
      templates: templates.map(t => this.transformWorkflowTemplate(t)),
      total,
    };
  }

  /**
   * 转换工作流模板为统一格式
   */
  private transformWorkflowTemplate(template: any): UnifiedTemplate {
    return {
      id: template.id,
      type: 'workflow',
      name: template.name,
      description: template.description,
      category: template.isSystem ? 'system' : 'custom',
      isSystem: template.isSystem,
      config: JSON.parse(template.config),
      platform: template.platform,
      column: template.column,
      usageCount: template.usageCount,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      userId: template.userId,
    };
  }

  /**
   * 查询通用模板
   */
  private async queryGeneralTemplates(
    filters: TemplateFilters,
    skip: number,
    take: number
  ): Promise<{ templates: UnifiedTemplate[]; total: number }> {
    const where: any = { isEnabled: true, type: { not: 'layout' } };

    if (filters.isSystem !== undefined) {
      where.isSystem = filters.isSystem;
    }
    if (filters.userId) {
      where.OR = [{ isSystem: true }, { userId: filters.userId }];
    }
    if (filters.search) {
      where.AND = [
        {
          OR: [
            { name: { contains: filters.search } },
            { description: { contains: filters.search } },
          ],
        },
      ];
    }

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        skip,
        take,
        orderBy: [{ isSystem: 'desc' }, { sortOrder: 'asc' }],
      }),
      prisma.template.count({ where }),
    ]);

    return {
      templates: templates.map(t => this.transformGeneralTemplate(t)),
      total,
    };
  }

  /**
   * 转换通用模板为统一格式
   */
  private transformGeneralTemplate(template: any): UnifiedTemplate {
    return {
      id: template.id,
      type: 'general',
      name: template.name,
      description: template.description,
      category: template.isSystem ? 'system' : 'custom',
      isSystem: template.isSystem,
      config: JSON.parse(template.config),
      thumbnail: template.thumbnail,
      usageCount: 0,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      userId: template.userId,
    };
  }

  /**
   * 查询排版模板
   */
  private async queryLayoutTemplates(
    filters: TemplateFilters,
    skip: number,
    take: number
  ): Promise<{ templates: UnifiedTemplate[]; total: number }> {
    const where: any = { type: 'layout', isEnabled: true };

    if (filters.isSystem !== undefined) {
      where.isSystem = filters.isSystem;
    }
    if (filters.userId) {
      where.OR = [{ isSystem: true }, { userId: filters.userId }];
    }
    if (filters.search) {
      where.AND = [
        {
          OR: [
            { name: { contains: filters.search } },
            { description: { contains: filters.search } },
          ],
        },
      ];
    }

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        skip,
        take,
        orderBy: [{ isSystem: 'desc' }, { sortOrder: 'asc' }],
      }),
      prisma.template.count({ where }),
    ]);

    return {
      templates: templates.map(t => this.transformLayoutTemplate(t)),
      total,
    };
  }

  /**
   * 转换排版模板为统一格式
   */
  private transformLayoutTemplate(template: any): UnifiedTemplate {
    return {
      id: template.id,
      type: 'layout',
      name: template.name,
      description: template.description,
      category: template.isSystem ? 'system' : 'custom',
      isSystem: template.isSystem,
      config: JSON.parse(template.config),
      thumbnail: template.thumbnail,
      usageCount: 0,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      userId: template.userId,
    };
  }

  /**
   * 获取单个模板
   */
  async getTemplate(type: TemplateType, id: string): Promise<UnifiedTemplate | null> {
    switch (type) {
      case 'popup': {
        const t = await prisma.popupTemplate.findUnique({ where: { id } });
        return t ? this.transformPopupTemplate(t) : null;
      }
      case 'workflow': {
        const t = await prisma.workflowTemplate.findUnique({ where: { id } });
        return t ? this.transformWorkflowTemplate(t) : null;
      }
      case 'general': {
        const t = await prisma.template.findUnique({ where: { id } });
        return t ? this.transformGeneralTemplate(t) : null;
      }
      case 'layout': {
        const t = await prisma.template.findFirst({ where: { id, type: 'layout' } });
        return t ? this.transformLayoutTemplate(t) : null;
      }
      default:
        return null;
    }
  }

  /**
   * 创建模板
   */
  async createTemplate(data: CreateTemplateData, userId?: string): Promise<UnifiedTemplate> {
    const { type, name, description, config, thumbnail, platform, column } = data;

    switch (type) {
      case 'popup': {
        const t = await prisma.popupTemplate.create({
          data: {
            name,
            description,
            category: 'custom',
            isSystem: false,
            config: JSON.stringify(config),
          },
        });
        return this.transformPopupTemplate(t);
      }
      case 'workflow': {
        const t = await prisma.workflowTemplate.create({
          data: {
            name,
            description,
            type: 'custom',
            isSystem: false,
            platform,
            column,
            config: JSON.stringify(config),
            userId,
          },
        });
        return this.transformWorkflowTemplate(t);
      }
      case 'general': {
        const t = await prisma.template.create({
          data: {
            type: 'article',
            name,
            description,
            config: JSON.stringify(config),
            thumbnail,
            userId,
          },
        });
        return this.transformGeneralTemplate(t);
      }
      case 'layout': {
        const t = await prisma.template.create({
          data: {
            type: 'layout',
            name,
            description,
            config: JSON.stringify(config),
            thumbnail,
            userId,
          },
        });
        return this.transformLayoutTemplate(t);
      }
      default:
        throw new Error(`不支持的模板类型: ${type}`);
    }
  }

  /**
   * 更新模板
   */
  async updateTemplate(
    type: TemplateType,
    id: string,
    data: UpdateTemplateData
  ): Promise<UnifiedTemplate> {
    const { name, description, config } = data;

    switch (type) {
      case 'popup': {
        const existing = await prisma.popupTemplate.findUnique({ where: { id } });
        if (!existing) throw new Error('模板不存在');
        if (existing.isSystem) throw new Error('系统模板不可修改');

        const t = await prisma.popupTemplate.update({
          where: { id },
          data: {
            name: name ?? existing.name,
            description: description ?? existing.description,
            config: config ? JSON.stringify(config) : existing.config,
          },
        });
        return this.transformPopupTemplate(t);
      }
      case 'workflow': {
        const existing = await prisma.workflowTemplate.findUnique({ where: { id } });
        if (!existing) throw new Error('模板不存在');
        if (existing.isSystem) throw new Error('系统模板不可修改');

        const t = await prisma.workflowTemplate.update({
          where: { id },
          data: {
            name: name ?? existing.name,
            description: description ?? existing.description,
            config: config ? JSON.stringify(config) : existing.config,
            platform: data.platform ?? existing.platform,
            column: data.column ?? existing.column,
          },
        });
        return this.transformWorkflowTemplate(t);
      }
      case 'general': {
        const existing = await prisma.template.findUnique({ where: { id } });
        if (!existing) throw new Error('模板不存在');
        if (existing.isSystem) throw new Error('系统模板不可修改');

        const t = await prisma.template.update({
          where: { id },
          data: {
            name: name ?? existing.name,
            description: description ?? existing.description,
            config: config ? JSON.stringify(config) : existing.config,
            thumbnail: data.thumbnail ?? existing.thumbnail,
          },
        });
        return this.transformGeneralTemplate(t);
      }
      case 'layout': {
        const existing = await prisma.template.findFirst({ where: { id, type: 'layout' } });
        if (!existing) throw new Error('模板不存在');
        if (existing.isSystem) throw new Error('系统模板不可修改');

        const t = await prisma.template.update({
          where: { id },
          data: {
            name: name ?? existing.name,
            description: description ?? existing.description,
            config: config ? JSON.stringify(config) : existing.config,
            thumbnail: data.thumbnail ?? existing.thumbnail,
          },
        });
        return this.transformLayoutTemplate(t);
      }
      default:
        throw new Error(`不支持的模板类型: ${type}`);
    }
  }

  /**
   * 删除模板
   */
  async deleteTemplate(type: TemplateType, id: string): Promise<void> {
    switch (type) {
      case 'popup': {
        const t = await prisma.popupTemplate.findUnique({ where: { id } });
        if (!t) throw new Error('模板不存在');
        if (t.isSystem) throw new Error('系统模板不可删除');
        await prisma.popupTemplate.delete({ where: { id } });
        break;
      }
      case 'workflow': {
        const t = await prisma.workflowTemplate.findUnique({ where: { id } });
        if (!t) throw new Error('模板不存在');
        if (t.isSystem) throw new Error('系统模板不可删除');
        await prisma.workflowTemplate.delete({ where: { id } });
        break;
      }
      case 'general': {
        const t = await prisma.template.findUnique({ where: { id } });
        if (!t) throw new Error('模板不存在');
        if (t.isSystem) throw new Error('系统模板不可删除');
        await prisma.template.delete({ where: { id } });
        break;
      }
      case 'layout': {
        const t = await prisma.template.findFirst({ where: { id, type: 'layout' } });
        if (!t) throw new Error('模板不存在');
        if (t.isSystem) throw new Error('系统模板不可删除');
        await prisma.template.delete({ where: { id } });
        break;
      }
      default:
        throw new Error(`不支持的模板类型: ${type}`);
    }
  }

  /**
   * 克隆模板
   */
  async cloneTemplate(
    type: TemplateType,
    id: string,
    userId?: string
  ): Promise<UnifiedTemplate> {
    const original = await this.getTemplate(type, id);
    if (!original) {
      throw new Error('模板不存在');
    }

    return this.createTemplate(
      {
        type,
        name: `${original.name} (副本)`,
        description: original.description,
        config: original.config,
        thumbnail: original.thumbnail,
        platform: original.platform,
        column: original.column,
      },
      userId
    );
  }
}