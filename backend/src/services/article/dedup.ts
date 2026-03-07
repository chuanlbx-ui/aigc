/**
 * 内容去重与相似度检测服务
 * 基于向量语义相似度检测文章重复和相似内容
 */

import { PrismaClient } from '@prisma/client';
import { createEmbeddingService, preprocessText } from '../embedding.js';

const prisma = new PrismaClient();

// 相似度阈值配置
const SIMILARITY_THRESHOLDS = {
  high: 0.95,    // 高度相似，几乎相同
  medium: 0.85,  // 中度相似，可能重复
  low: 0.75,     // 低度相似，主题相关
};

export interface SimilarityResult {
  articleId: string;
  title: string;
  similarity: number;
  level: 'high' | 'medium' | 'low';
  status: string;
  publishedAt: Date | null;
}

export interface DedupCheckResult {
  hasSimilar: boolean;
  results: SimilarityResult[];
  warning?: string;
}

/**
 * 计算文章内容的向量
 */
export async function computeArticleEmbedding(
  articleId: string,
  title: string,
  content: string
): Promise<number[] | null> {
  const embeddingService = await createEmbeddingService();
  if (!embeddingService) {
    console.warn('Embedding service not available');
    return null;
  }

  const text = preprocessText(`${title}\n\n${content}`);
  return embeddingService.embed(text);
}

/**
 * 保存文章向量到数据库
 */
export async function saveArticleEmbedding(articleId: string, embedding: number[]): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "Article"
    SET embedding = ${embedding}::vector, "embeddedAt" = NOW()
    WHERE id = ${articleId}
  `;
}

/**
 * 批量为文章生成向量
 */
export async function batchEmbedArticles(limit: number = 50): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  const embeddingService = await createEmbeddingService();
  if (!embeddingService) {
    return { success: 0, failed: 0, errors: ['Embedding service not available'] };
  }

  // 获取未向量化的文章
  const articles = await prisma.$queryRaw<any[]>`
    SELECT id, title, "filePath"
    FROM "Article"
    WHERE embedding IS NULL
    LIMIT ${limit}
  `;

  const fs = await import('fs');
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const article of articles) {
    try {
      if (!fs.existsSync(article.filePath)) {
        continue;
      }

      const content = fs.readFileSync(article.filePath, 'utf-8');
      const text = preprocessText(`${article.title}\n\n${content}`);
      const embedding = await embeddingService.embed(text);

      await saveArticleEmbedding(article.id, embedding);
      success++;
    } catch (e: any) {
      failed++;
      errors.push(`${article.title}: ${e.message}`);
    }
  }

  return { success, failed, errors };
}

/**
 * 检查内容与已有文章的相似度
 * @param title 文章标题
 * @param content 文章内容
 * @param excludeId 排除的文章ID（当前编辑的文章）
 * @param threshold 最低相似度阈值
 */
export async function checkSimilarity(
  title: string,
  content: string,
  excludeId?: string,
  threshold: number = SIMILARITY_THRESHOLDS.low
): Promise<DedupCheckResult> {
  const embeddingService = await createEmbeddingService();
  if (!embeddingService) {
    return {
      hasSimilar: false,
      results: [],
      warning: '向量服务不可用，无法检测相似内容',
    };
  }

  // 生成查询向量
  const text = preprocessText(`${title}\n\n${content}`);
  const queryEmbedding = await embeddingService.embed(text);

  // 使用 pgvector 进行相似度搜索
  const results = await prisma.$queryRaw<any[]>`
    SELECT 
      id, title, status, "publishedAt",
      1 - (embedding <=> ${queryEmbedding}::vector) as similarity
    FROM "Article"
    WHERE embedding IS NOT NULL
      ${excludeId ? prisma.Prisma.sql`AND id != ${excludeId}` : prisma.Prisma.empty}
    HAVING 1 - (embedding <=> ${queryEmbedding}::vector) >= ${threshold}
    ORDER BY embedding <=> ${queryEmbedding}::vector
    LIMIT 10
  `;

  if (results.length === 0) {
    return { hasSimilar: false, results: [] };
  }

  // 分类相似度级别
  const similarityResults: SimilarityResult[] = results.map(r => {
    let level: 'high' | 'medium' | 'low' = 'low';
    if (r.similarity >= SIMILARITY_THRESHOLDS.high) {
      level = 'high';
    } else if (r.similarity >= SIMILARITY_THRESHOLDS.medium) {
      level = 'medium';
    }

    return {
      articleId: r.id,
      title: r.title,
      similarity: Number(r.similarity.toFixed(4)),
      level,
      status: r.status,
      publishedAt: r.publishedAt,
    };
  });

  // 生成警告信息
  const highSimilar = similarityResults.filter(r => r.level === 'high');
  const mediumSimilar = similarityResults.filter(r => r.level === 'medium');

  let warning: string | undefined;
  if (highSimilar.length > 0) {
    warning = `发现 ${highSimilar.length} 篇高度相似的文章，可能存在重复内容`;
  } else if (mediumSimilar.length > 0) {
    warning = `发现 ${mediumSimilar.length} 篇中度相似的文章，主题可能重叠`;
  }

  return {
    hasSimilar: true,
    results: similarityResults,
    warning,
  };
}

/**
 * 检查选题与已有文章的相似度（仅用标题）
 */
export async function checkTopicSimilarity(
  topic: string,
  excludeId?: string,
  threshold: number = SIMILARITY_THRESHOLDS.medium
): Promise<DedupCheckResult> {
  const embeddingService = await createEmbeddingService();
  if (!embeddingService) {
    return {
      hasSimilar: false,
      results: [],
    };
  }

  // 生成查询向量
  const queryEmbedding = await embeddingService.embed(topic);

  // 搜索相似文章
  const results = await prisma.$queryRaw<any[]>`
    SELECT 
      id, title, status, "publishedAt",
      1 - (embedding <=> ${queryEmbedding}::vector) as similarity
    FROM "Article"
    WHERE embedding IS NOT NULL
      ${excludeId ? prisma.Prisma.sql`AND id != ${excludeId}` : prisma.Prisma.empty}
    HAVING 1 - (embedding <=> ${queryEmbedding}::vector) >= ${threshold}
    ORDER BY embedding <=> ${queryEmbedding}::vector
    LIMIT 5
  `;

  if (results.length === 0) {
    return { hasSimilar: false, results: [] };
  }

  const similarityResults: SimilarityResult[] = results.map(r => ({
    articleId: r.id,
    title: r.title,
    similarity: Number(r.similarity.toFixed(4)),
    level: r.similarity >= SIMILARITY_THRESHOLDS.high ? 'high' : 
           r.similarity >= SIMILARITY_THRESHOLDS.medium ? 'medium' : 'low',
    status: r.status,
    publishedAt: r.publishedAt,
  }));

  return {
    hasSimilar: true,
    results: similarityResults,
    warning: similarityResults.some(r => r.level === 'high')
      ? '发现相似选题，可能已写过类似内容'
      : undefined,
  };
}

/**
 * 获取文章向量状态
 */
export async function getEmbeddingStatus(): Promise<{
  total: number;
  embedded: number;
  pending: number;
}> {
  const total = await prisma.article.count();
  const embedded = await prisma.article.count({
    where: { embeddedAt: { not: null } },
  });

  return {
    total,
    embedded,
    pending: total - embedded,
  };
}
