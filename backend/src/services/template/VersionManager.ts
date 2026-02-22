/**
 * 模板版本管理服务
 */

import { PrismaClient } from '@prisma/client';
import { TemplateType } from './types.js';

const prisma = new PrismaClient();

// 版本信息
export interface VersionInfo {
  id: string;
  version: number;
  changelog?: string;
  createdBy?: string;
  createdAt: Date;
}

// 版本详情
export interface VersionDetail extends VersionInfo {
  config: Record<string, any>;
}

export class VersionManager {
  /**
   * 创建版本
   */
  async createVersion(
    templateId: string,
    templateType: TemplateType,
    config: Record<string, any>,
    changelog?: string,
    createdBy?: string
  ): Promise<VersionInfo> {
    // 获取当前最大版本号
    const latest = await prisma.templateVersion.findFirst({
      where: { templateId, templateType },
      orderBy: { version: 'desc' },
    });

    const newVersion = (latest?.version || 0) + 1;

    const version = await prisma.templateVersion.create({
      data: {
        templateId,
        templateType,
        version: newVersion,
        config: JSON.stringify(config),
        changelog,
        createdBy,
      },
    });

    return {
      id: version.id,
      version: version.version,
      changelog: version.changelog || undefined,
      createdBy: version.createdBy || undefined,
      createdAt: version.createdAt,
    };
  }

  /**
   * 获取版本列表
   */
  async listVersions(
    templateId: string,
    templateType: TemplateType
  ): Promise<VersionInfo[]> {
    const versions = await prisma.templateVersion.findMany({
      where: { templateId, templateType },
      orderBy: { version: 'desc' },
      take: 10,
    });

    return versions.map(v => ({
      id: v.id,
      version: v.version,
      changelog: v.changelog || undefined,
      createdBy: v.createdBy || undefined,
      createdAt: v.createdAt,
    }));
  }

  /**
   * 获取版本详情
   */
  async getVersion(
    templateId: string,
    templateType: TemplateType,
    version: number
  ): Promise<VersionDetail | null> {
    const v = await prisma.templateVersion.findUnique({
      where: {
        templateId_templateType_version: {
          templateId,
          templateType,
          version,
        },
      },
    });

    if (!v) return null;

    return {
      id: v.id,
      version: v.version,
      config: JSON.parse(v.config),
      changelog: v.changelog || undefined,
      createdBy: v.createdBy || undefined,
      createdAt: v.createdAt,
    };
  }

  /**
   * 对比两个版本
   */
  async compareVersions(
    templateId: string,
    templateType: TemplateType,
    v1: number,
    v2: number
  ): Promise<{ added: string[]; removed: string[]; changed: string[] } | null> {
    const version1 = await this.getVersion(templateId, templateType, v1);
    const version2 = await this.getVersion(templateId, templateType, v2);

    if (!version1 || !version2) return null;

    const keys1 = new Set(Object.keys(version1.config));
    const keys2 = new Set(Object.keys(version2.config));

    const added: string[] = [];
    const removed: string[] = [];
    const changed: string[] = [];

    // 新增的键
    for (const key of keys2) {
      if (!keys1.has(key)) added.push(key);
    }

    // 删除的键
    for (const key of keys1) {
      if (!keys2.has(key)) removed.push(key);
    }

    // 变更的键
    for (const key of keys1) {
      if (keys2.has(key)) {
        const val1 = JSON.stringify(version1.config[key]);
        const val2 = JSON.stringify(version2.config[key]);
        if (val1 !== val2) changed.push(key);
      }
    }

    return { added, removed, changed };
  }
}
