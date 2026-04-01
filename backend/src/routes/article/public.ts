import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();
export const publicRouter = Router();

// 获取推荐/置顶文章（轮播用）
publicRouter.get('/public/featured', async (req, res) => {
  try {
    const { limit = '5' } = req.query;
    const articles = await prisma.article.findMany({
      where: { status: 'published' },
      select: {
        id: true, title: true, slug: true, summary: true, coverImage: true,
        platform: true, column: true, tags: true, wordCount: true,
        readTime: true, viewCount: true, publishedAt: true, category: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: parseInt(limit as string),
    });
    res.json({ articles });
  } catch (error) {
    res.status(500).json({ error: '获取推荐文章失败' });
  }
});

// 获取有文章的分类列表（公开）
publicRouter.get('/public/categories', async (req, res) => {
  try {
    const categories = await prisma.articleCategory.findMany({
      where: {
        articles: { some: { status: 'published' } }
      },
      include: {
        _count: {
          select: { articles: { where: { status: 'published' } } }
        }
      },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: '获取分类失败' });
  }
});

// 获取公开文章列表
publicRouter.get('/public/list', async (req, res) => {
  try {
    const { page = '1', pageSize = '10', categoryId, search } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const where: any = { status: 'published' };
    if (categoryId) {
      where.categoryId = categoryId as string;
    }
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { summary: { contains: search as string } },
      ];
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        select: {
          id: true, title: true, slug: true, summary: true, coverImage: true,
          platform: true, column: true, tags: true, wordCount: true,
          readTime: true, viewCount: true, publishedAt: true, category: true,
        },
        orderBy: { publishedAt: 'desc' },
        skip, take,
      }),
      prisma.article.count({ where }),
    ]);
    res.json({ articles, total });
  } catch (error) {
    res.status(500).json({ error: '获取公开文章失败' });
  }
});

// 通过 slug 获取公开文章
publicRouter.get('/public/:slug', async (req, res) => {
  try {
    const article = await prisma.article.findUnique({
      where: { slug: req.params.slug },
      include: { category: true },
    });
    if (!article || article.status !== 'published') {
      return res.status(404).json({ error: '文章不存在' });
    }
    await prisma.article.update({
      where: { id: article.id },
      data: { viewCount: article.viewCount + 1 },
    });
    const content = fs.existsSync(article.filePath)
      ? fs.readFileSync(article.filePath, 'utf-8') : '';

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
      const cleanContent = content
        .replace(/^#+\s+.*$/gm, '')
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[*_~`#]/g, '')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      summary = cleanContent.substring(0, 150).trim();
      if (cleanContent.length > 150) {
        summary += '...';
      }
    }

    res.json({ ...article, content, coverImage, summary });
  } catch (error) {
    res.status(500).json({ error: '获取文章失败' });
  }
});

// 分享页面SSR（用于微信/微博等社交平台爬虫）
publicRouter.get('/share/:slug', async (req, res) => {
  try {
    const article = await prisma.article.findUnique({
      where: { slug: req.params.slug },
      include: { category: true },
    });

    if (!article || article.status !== 'published') {
      return res.status(404).send('文章不存在');
    }

    const content = fs.existsSync(article.filePath)
      ? fs.readFileSync(article.filePath, 'utf-8') : '';

    // 提取封面
    let coverImage = article.coverImage;
    if (!coverImage && content) {
      const imgMatch = content.match(/!\[.*?\]\((.*?)\)/);
      if (imgMatch && imgMatch[1]) {
        coverImage = imgMatch[1];
      }
    }

    // 提取简介
    let summary = article.summary;
    if (!summary && content) {
      const cleanContent = content
        .replace(/^#+\s+.*$/gm, '')
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[*_~`#]/g, '')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      summary = cleanContent.substring(0, 150).trim();
      if (cleanContent.length > 150) summary += '...';
    }

    const baseUrl = process.env.BASE_URL || 'https://aigc.wenbita.cn';
    const pageUrl = `${baseUrl}/read/${article.slug}`;
    const fullCoverUrl = coverImage ? (coverImage.startsWith('http') ? coverImage : `${baseUrl}${coverImage}`) : '';

    // 返回带有OG标签的HTML页面
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${article.title}</title>

  <!-- Open Graph (Facebook, 微信) -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${article.title}">
  <meta property="og:description" content="${summary || article.title}">
  <meta property="og:url" content="${pageUrl}">
  ${fullCoverUrl ? `<meta property="og:image" content="${fullCoverUrl}">` : ''}
  <meta property="og:site_name" content="AI内容生成平台">
  <meta property="og:locale" content="zh_CN">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${article.title}">
  <meta name="twitter:description" content="${summary || article.title}">
  ${fullCoverUrl ? `<meta name="twitter:image" content="${fullCoverUrl}">` : ''}

  <!-- 微信分享专用 -->
  <meta itemprop="name" content="${article.title}">
  <meta itemprop="description" content="${summary || article.title}">
  ${fullCoverUrl ? `<meta itemprop="image" content="${fullCoverUrl}">` : ''}

  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .card { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
    .cover { width: 100%; height: 240px; object-fit: cover; background: #e0e0e0; }
    .content { padding: 20px; }
    .title { font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 0 0 12px; line-height: 1.4; }
    .summary { font-size: 14px; color: #666; line-height: 1.6; margin: 0 0 16px; }
    .meta { display: flex; gap: 16px; font-size: 12px; color: #999; }
    .meta span { display: flex; align-items: center; gap: 4px; }
    .btn { display: block; width: 100%; padding: 12px; margin-top: 20px; background: #1677ff; color: white; text-align: center; border-radius: 8px; text-decoration: none; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    ${fullCoverUrl ? `<img class="cover" src="${fullCoverUrl}" alt="${article.title}" onerror="this.style.display='none'">` : '<div class="cover"></div>'}
    <div class="content">
      <h1 class="title">${article.title}</h1>
      <p class="summary">${summary || '点击查看完整内容'}</p>
      <div class="meta">
        <span>📅 ${new Date(article.publishedAt || article.createdAt).toLocaleDateString('zh-CN')}</span>
        <span>⏱️ ${article.readTime}分钟</span>
        <span>👁️ ${article.viewCount}阅读</span>
      </div>
      <a class="btn" href="${pageUrl}">阅读全文</a>
    </div>
  </div>
  <script>setTimeout(function(){location.href='${pageUrl}';},100);</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    res.status(500).send('服务器错误');
  }
});
