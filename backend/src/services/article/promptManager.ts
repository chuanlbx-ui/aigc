/**
 * Prompt 版本管理服务
 * 支持从数据库读取自定义 prompt，回退到代码默认值
 * 每次 AI 调用记录使用的 prompt 版本到 AICallLog
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PromptTemplateRecord {
  id: string;
  key: string;           // 唯一标识，如 'topic_discussion' | 'outline' | 'draft'
  name: string;
  content: string;       // prompt 内容，支持 {{变量}} 占位符
  version: number;
  platform?: string | null;
  column?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 内置默认 prompt key 列表
export type PromptKey =
  | 'topic_discussion'
  | 'outline'
  | 'draft'
  | 'review'
  | 'hkr_evaluate'
  | 'hkr_improve'
  | 'style_analysis'
  | 'keyword_extract'
  | 'seo_analysis'
  | 'adapt_content';

/**
 * 获取指定 key 的 prompt 模板
 * 优先返回数据库中 isActive=true 的版本，找不到则返回 null（调用方回退到代码默认值）
 */
export async function getPromptTemplate(
  key: PromptKey,
  platform?: string,
  column?: string
): Promise<{ content: string; version: number; id: string } | null> {
  try {
    // 优先匹配平台+栏目特化版本
    if (platform && column) {
      const specific = await prisma.promptTemplate.findFirst({
        where: { key, platform, column, isActive: true },
        orderBy: { version: 'desc' },
      });
      if (specific) return { content: specific.content, version: specific.version, id: specific.id };
    }

    // 其次匹配平台通用版本
    if (platform) {
      const platformLevel = await prisma.promptTemplate.findFirst({
        where: { key, platform, column: null, isActive: true },
        orderBy: { version: 'desc' },
      });
      if (platformLevel) return { content: platformLevel.content, version: platformLevel.version, id: platformLevel.id };
    }

    // 最后匹配全局版本
    const global = await prisma.promptTemplate.findFirst({
      where: { key, platform: null, column: null, isActive: true },
      orderBy: { version: 'desc' },
    });
    if (global) return { content: global.content, version: global.version, id: global.id };

    return null;
  } catch {
    // 数据库不可用时静默回退
    return null;
  }
}

/**
 * 渲染 prompt 模板，替换 {{变量}} 占位符
 */
export function renderPrompt(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
}

/**
 * 保存新版本的 prompt 模板
 * 自动递增版本号，旧版本保留（不删除，便于回滚）
 */
export async function savePromptTemplate(params: {
  key: PromptKey;
  name: string;
  content: string;
  platform?: string;
  column?: string;
}): Promise<PromptTemplateRecord> {
  const { key, name, content, platform, column } = params;

  // 查询当前最高版本
  const latest = await prisma.promptTemplate.findFirst({
    where: { key, platform: platform ?? null, column: column ?? null },
    orderBy: { version: 'desc' },
  });
  const nextVersion = (latest?.version ?? 0) + 1;

  // 将旧版本设为非活跃
  if (latest) {
    await prisma.promptTemplate.updateMany({
      where: { key, platform: platform ?? null, column: column ?? null, isActive: true },
      data: { isActive: false },
    });
  }

  // 创建新版本
  const created = await prisma.promptTemplate.create({
    data: { key, name, content, version: nextVersion, platform: platform ?? null, column: column ?? null, isActive: true },
  });

  return created as PromptTemplateRecord;
}

/**
 * 列出指定 key 的所有历史版本
 */
export async function listPromptVersions(key: PromptKey, platform?: string, column?: string) {
  return prisma.promptTemplate.findMany({
    where: { key, platform: platform ?? null, column: column ?? null },
    orderBy: { version: 'desc' },
    select: { id: true, version: true, name: true, isActive: true, createdAt: true },
  });
}

/**
 * 回滚到指定版本
 */
export async function rollbackPromptVersion(id: string): Promise<void> {
  const target = await prisma.promptTemplate.findUnique({ where: { id } });
  if (!target) throw new Error(`Prompt 版本 ${id} 不存在`);

  await prisma.promptTemplate.updateMany({
    where: { key: target.key, platform: target.platform, column: target.column, isActive: true },
    data: { isActive: false },
  });

  await prisma.promptTemplate.update({ where: { id }, data: { isActive: true } });
}
