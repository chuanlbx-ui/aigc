import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { filterContent, getContentByIds, getArticleContent, FilterConfig } from '../services/portal/contentFilter';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
export const portalRouter = Router();

// 文章目录
const ARTICLES_DIR = './articles';

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

// ========== 公开页面 API ==========

// 获取公开专题页面列表
portalRouter.get('/pages', async (req, res) => {
  try {
    const pages = await prisma.topicPage.findMany({
      where: { status: 'published' },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        coverImage: true,
        template: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(pages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取专题页面完整数据（含区块内容）
portalRouter.get('/pages/:slug', async (req, res) => {
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
      return res.status(404).json({ error: '页面不存在' });
    }

    // 增加浏览量
    await prisma.topicPage.update({
      where: { id: page.id },
      data: { viewCount: { increment: 1 } },
    });

    // 为每个区块获取内容（支持跨区块去重）
    const usedContentIds: string[] = [];
    const sectionsWithContent = [];

    for (const section of page.sections) {
      const manualIds = safeParseJSON<string[]>(section.manualContentIds, []);
      let contents;

      if (manualIds.length > 0) {
        contents = await getContentByIds(manualIds);
      } else {
        const filterConfig = safeParseJSON<FilterConfig>(section.filterConfig, {});
        // 如果配置了 excludePrevious，则排除之前区块已使用的内容
        if (filterConfig.excludePrevious) {
          filterConfig.excludeIds = [...usedContentIds];
        }
        contents = await filterContent(filterConfig);
      }

      // 记录本区块使用的内容ID
      contents.forEach((item: any) => usedContentIds.push(item.id));

      sectionsWithContent.push({
        ...section,
        layoutConfig: safeParseJSON(section.layoutConfig, {}),
        filterConfig: safeParseJSON(section.filterConfig, {}),
        contents,
      });
    }

    res.json({
      ...page,
      config: safeParseJSON(page.config, {}),
      sections: sectionsWithContent,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 文章 API ==========

// 获取文章列表
portalRouter.get('/articles', async (req, res) => {
  try {
    const { categoryId, platform, tag, page = '1', pageSize = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const filterConfig: FilterConfig = {
      categoryIds: categoryId ? [categoryId as string] : undefined,
      platforms: platform ? [platform as string] : undefined,
      tags: tag ? [tag as string] : undefined,
      limit: take,
    };

    const contents = await filterContent(filterConfig);
    res.json({ articles: contents, page: parseInt(page as string), pageSize: take });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单篇文章
portalRouter.get('/articles/:slug', async (req, res) => {
  try {
    const article = await prisma.article.findUnique({
      where: { slug: req.params.slug },
      include: { category: true },
    });

    if (!article || article.status !== 'published') {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 增加浏览量
    await prisma.article.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    });

    // 读取文章内容
    let content = '';
    if (article.filePath) {
      const filePath = path.join(ARTICLES_DIR, article.filePath);
      if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf-8');
      }
    }

    // 自动提取封面图片：优先使用设置的封面，否则从内容中提取第一张图片
    let coverImage = article.coverImage;
    if (!coverImage && content) {
      const imgMatch = content.match(/!\[.*?\]\((.*?)\)/);
      if (imgMatch && imgMatch[1]) {
        coverImage = imgMatch[1];
      }
    }

    // 自动生成简介：优先使用设置的简介，否则从内容中提取
    let summary = article.summary;
    if (!summary && content) {
      // 移除标题、图片、链接等Markdown语法
      const cleanContent = content
        .replace(/^#+\s+.*$/gm, '')  // 移除标题
        .replace(/!\[.*?\]\(.*?\)/g, '')  // 移除图片
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // 保留链接文字
        .replace(/[*_~`#]/g, '')  // 移除格式符号
        .replace(/\n+/g, ' ')  // 换行转空格
        .replace(/\s+/g, ' ')  // 多个空格合并
        .trim();
      // 截取前150字作为简介
      summary = cleanContent.substring(0, 150).trim();
      if (cleanContent.length > 150) {
        summary += '...';
      }
    }

    res.json({
      ...article,
      content,
      coverImage,
      summary,
      tags: safeParseJSON(article.tags, []),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取分类列表
portalRouter.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.articleCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { articles: { where: { status: 'published' } } } },
      },
    });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
