import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireApiToken } from '../middleware/apiAuth.js';
import { filterContent, getContentByIds, FilterConfig } from '../services/portal/contentFilter.js';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
export const openApiRouter = Router();

// 所有对外 API 都需要 Token 鉴权
openApiRouter.use(requireApiToken);

// 安全解析JSON
function safeParseJSON<T>(str: string | null | undefined, defaultValue: T): T {
  if (!str) return defaultValue;
  try {
    let parsed = JSON.parse(str);
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    return parsed;
  } catch {
    return defaultValue;
  }
}

const ARTICLES_DIR = './articles';

// ========== 对外开放 API v1 ==========

// 获取专题页面列表
openApiRouter.get('/v1/pages', async (req, res) => {
  try {
    const pages = await prisma.topicPage.findMany({
      where: { status: 'published' },
      select: {
        slug: true,
        title: true,
        description: true,
        coverImage: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, data: pages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取专题页面详情
openApiRouter.get('/v1/pages/:slug', async (req, res) => {
  try {
    const page = await prisma.topicPage.findUnique({
      where: { slug: req.params.slug },
      include: {
        sections: {
          where: { isEnabled: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!page || page.status !== 'published') {
      return res.status(404).json({ success: false, error: '页面不存在' });
    }

    // 为每个区块获取内容
    const sectionsWithContent = await Promise.all(
      page.sections.map(async (section) => {
        const manualIds = safeParseJSON<string[]>(section.manualContentIds, []);
        let contents;

        if (manualIds.length > 0) {
          contents = await getContentByIds(manualIds);
        } else {
          const filterConfig = safeParseJSON<FilterConfig>(section.filterConfig, {});
          contents = await filterContent(filterConfig);
        }

        return {
          name: section.name,
          type: section.type,
          title: section.title,
          layoutConfig: safeParseJSON(section.layoutConfig, {}),
          contents,
        };
      })
    );

    res.json({
      success: true,
      data: {
        title: page.title,
        description: page.description,
        coverImage: page.coverImage,
        sections: sectionsWithContent,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取文章列表
openApiRouter.get('/v1/articles', async (req, res) => {
  try {
    const { categoryId, platform, limit = '20' } = req.query;

    const filterConfig: FilterConfig = {
      categoryIds: categoryId ? [categoryId as string] : undefined,
      platforms: platform ? [platform as string] : undefined,
      limit: parseInt(limit as string),
    };

    const contents = await filterContent(filterConfig);
    res.json({ success: true, data: contents });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取单篇文章
openApiRouter.get('/v1/articles/:slug', async (req, res) => {
  try {
    const article = await prisma.article.findUnique({
      where: { slug: req.params.slug },
      include: { category: true },
    });

    if (!article || article.status !== 'published') {
      return res.status(404).json({ success: false, error: '文章不存在' });
    }

    // 读取文章内容
    let content = '';
    if (article.filePath) {
      const filePath = path.join(ARTICLES_DIR, article.filePath);
      if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf-8');
      }
    }

    res.json({
      success: true,
      data: {
        title: article.title,
        slug: article.slug,
        summary: article.summary,
        content,
        coverImage: article.coverImage,
        category: article.category?.name,
        tags: safeParseJSON(article.tags, []),
        wordCount: article.wordCount,
        readTime: article.readTime,
        publishedAt: article.publishedAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
