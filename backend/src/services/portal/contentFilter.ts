import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const ARTICLES_DIR = './articles';

// 内容筛选配置接口
export interface FilterConfig {
  contentType?: 'article' | 'video' | 'mixed';
  categoryIds?: string[];
  tags?: string[];
  platforms?: string[];
  columns?: string[];
  sortBy?: 'publishedAt' | 'viewCount' | 'createdAt';
  sortOrder?: 'desc' | 'asc';
  limit?: number;
  excludeIds?: string[];  // 排除的内容ID列表
  excludePrevious?: boolean;  // 是否排除前面区块已使用的内容
}

// 内容项接口
export interface ContentItem {
  id: string;
  type: 'article' | 'video';
  title: string;
  slug: string;
  summary?: string;
  coverImage?: string;
  platform?: string;
  column?: string;
  category?: { id: string; name: string; color?: string };
  tags?: string[];
  wordCount?: number;
  readTime?: number;
  viewCount: number;
  publishedAt: string;
}

/**
 * 从文章内容中提取第一张图片URL
 */
function extractFirstImage(filePath: string | null): string | undefined {
  if (!filePath) return undefined;

  // 将 Windows 反斜杠转换为正斜杠，确保路径正确
  const normalizedPath = filePath.replace(/\\/g, '/');
  const fullPath = path.resolve(normalizedPath);
  if (!fs.existsSync(fullPath)) return undefined;

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    // 匹配 Markdown 图片语法 ![alt](url) 或 HTML img 标签
    const mdMatch = content.match(/!\[.*?\]\((.*?)\)/);
    if (mdMatch && mdMatch[1]) {
      return mdMatch[1];
    }

    const htmlMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (htmlMatch && htmlMatch[1]) {
      return htmlMatch[1];
    }
  } catch {
    // 忽略读取错误
  }

  return undefined;
}

/**
 * 根据筛选配置获取内容列表
 */
export async function filterContent(config: FilterConfig): Promise<ContentItem[]> {
  const {
    contentType = 'article',
    categoryIds,
    tags,
    platforms,
    columns,
    sortBy = 'publishedAt',
    sortOrder = 'desc',
    limit = 10,
    excludeIds,
  } = config;

  // 构建查询条件
  const where: any = {
    status: 'published',
  };

  // 排除已使用的内容ID
  if (excludeIds && excludeIds.length > 0) {
    where.id = { notIn: excludeIds };
  }

  if (categoryIds && categoryIds.length > 0) {
    where.categoryId = { in: categoryIds };
  }

  if (platforms && platforms.length > 0) {
    where.platform = { in: platforms };
  }

  if (columns && columns.length > 0) {
    where.column = { in: columns };
  }

  // 标签筛选（JSON数组包含）
  if (tags && tags.length > 0) {
    where.OR = tags.map(tag => ({
      tags: { contains: tag }
    }));
  }

  // 排序
  const orderBy: any = {};
  orderBy[sortBy] = sortOrder;

  // 查询文章
  const articles = await prisma.article.findMany({
    where,
    include: {
      category: true,
    },
    orderBy,
    take: limit,
  });

  // 转换为统一格式
  return articles.map(article => ({
    id: article.id,
    type: 'article' as const,
    title: article.title,
    slug: article.slug,
    summary: article.summary || undefined,
    coverImage: article.coverImage || extractFirstImage(article.filePath) || undefined,
    platform: article.platform,
    column: article.column,
    category: article.category ? {
      id: article.category.id,
      name: article.category.name,
      color: article.category.color || undefined,
    } : undefined,
    tags: safeParseJSON(article.tags, []),
    wordCount: article.wordCount,
    readTime: article.readTime,
    viewCount: article.viewCount,
    publishedAt: article.publishedAt?.toISOString() || article.createdAt.toISOString(),
  }));
}

/**
 * 根据ID列表获取内容
 */
export async function getContentByIds(ids: string[]): Promise<ContentItem[]> {
  if (!ids || ids.length === 0) return [];

  const articles = await prisma.article.findMany({
    where: {
      id: { in: ids },
      status: 'published',
    },
    include: { category: true },
  });

  // 按传入的ID顺序排序
  const articleMap = new Map(articles.map(a => [a.id, a]));
  const orderedArticles = ids
    .map(id => articleMap.get(id))
    .filter(Boolean);

  return orderedArticles.map(article => ({
    id: article!.id,
    type: 'article' as const,
    title: article!.title,
    slug: article!.slug,
    summary: article!.summary || undefined,
    coverImage: article!.coverImage || extractFirstImage(article!.filePath) || undefined,
    platform: article!.platform,
    column: article!.column,
    category: article!.category ? {
      id: article!.category.id,
      name: article!.category.name,
      color: article!.category.color || undefined,
    } : undefined,
    tags: safeParseJSON(article!.tags, []),
    wordCount: article!.wordCount,
    readTime: article!.readTime,
    viewCount: article!.viewCount,
    publishedAt: article!.publishedAt?.toISOString() || article!.createdAt.toISOString(),
  }));
}

/**
 * 获取文章内容
 */
export async function getArticleContent(slug: string): Promise<string | null> {
  const article = await prisma.article.findUnique({
    where: { slug },
  });

  if (!article || !article.filePath) return null;

  const filePath = path.join(ARTICLES_DIR, article.filePath);
  if (!fs.existsSync(filePath)) return null;

  return fs.readFileSync(filePath, 'utf-8');
}

// 安全解析JSON
function safeParseJSON<T>(str: string | null | undefined, defaultValue: T): T {
  if (!str) return defaultValue;
  try {
    let parsed = JSON.parse(str);
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed);
    }
    return parsed;
  } catch {
    return defaultValue;
  }
}
