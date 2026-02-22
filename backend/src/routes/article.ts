import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { getDefaultAIConfig, createAIService, getAIConfigOrDefault, getAllAIConfigs, getWebSearchAIConfig, getAIConfigByTaskType } from '../services/ai/index';
import {
  buildTopicDiscussionPrompt,
  buildOutlinePrompt,
  buildDraftPrompt,
  buildReviewPrompt,
  buildHKRPrompt,
  buildHKRImprovePrompt,
  buildScriptPrompt,
  buildQuotesPrompt,
  buildPolishQuotePrompt,
  buildGenerateQuotePrompt,
  buildStyleAnalysisPrompt,
  buildStyledDraftPrompt,
  isNewsContent,
  buildSearchQuery,
  buildDraftPromptWithWebContext,
  STYLE_TEMPLATES,
} from '../services/article/prompts';
import { smartImageService } from '../services/article/smartImage';
import { WORKFLOW_STEPS } from '../services/article/workflow';
import { generatePoster, ensurePosterDir } from '../services/article/posterGenerator';
import { loadTemplate, replaceVariables, buildPromptWithTemplate } from '../services/article/templateService.js';
import { requireAuth } from '../middleware/auth.js';

const prisma = new PrismaClient();
export const articleRouter = Router();

// 文章文件存储目录
const ARTICLES_DIR = './articles';
const VERSIONS_DIR = path.join(ARTICLES_DIR, 'versions');

// 确保目录存在
if (!fs.existsSync(ARTICLES_DIR)) {
  fs.mkdirSync(ARTICLES_DIR, { recursive: true });
}
if (!fs.existsSync(VERSIONS_DIR)) {
  fs.mkdirSync(VERSIONS_DIR, { recursive: true });
}

// 平台和栏目配置
const PLATFORM_COLUMNS: Record<string, string[]> = {
  wechat: ['深度', '速递', '体验', '教程', '对话'],
  xiaohongshu: ['种草', '教程', '观点'],
  video: ['演示', '教程', '观点'],
};

// 生成 slug
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
}

// 计算字数和阅读时间
function calculateReadingStats(content: string) {
  const wordCount = content.replace(/\s+/g, '').length;
  const readTime = Math.ceil(wordCount / 400);
  return { wordCount, readTime };
}

// ========== 公开访问 API（必须在 /:id 之前）==========

// 获取推荐/置顶文章（轮播用）
articleRouter.get('/public/featured', async (req, res) => {
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
articleRouter.get('/public/categories', async (req, res) => {
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
articleRouter.get('/public/list', async (req, res) => {
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
articleRouter.get('/public/:slug', async (req, res) => {
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
articleRouter.get('/share/:slug', async (req, res) => {
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

// ========== 文章 CRUD API ==========

// 以下 API 需要登录
articleRouter.use((req, res, next) => {
  // 跳过公开 API
  if (req.path.startsWith('/public')) {
    return next();
  }
  return requireAuth(req, res, next);
});

// 获取文章列表
articleRouter.get('/', async (req, res) => {
  try {
    const {
      categoryId, tag, search, status, platform, column,
      page = '1', pageSize = '20'
    } = req.query;

    const where: any = { userId: req.user!.id };

    if (categoryId) {
      where.categoryId = categoryId as string;
    }
    if (tag) {
      where.tags = { contains: tag as string };
    }
    if (status) {
      where.status = status as string;
    }
    if (platform) {
      where.platform = platform as string;
    }
    if (column) {
      where.column = column as string;
    }
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { summary: { contains: search as string } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: { category: true },
        orderBy: [{ updatedAt: 'desc' }],
        skip,
        take,
      }),
      prisma.article.count({ where }),
    ]);

    res.json({ articles, total, page: parseInt(page as string), pageSize: parseInt(pageSize as string) });
  } catch (error) {
    console.error('获取文章列表失败:', error);
    res.status(500).json({ error: '获取文章列表失败' });
  }
});

// 获取单个文章
articleRouter.get('/:id', async (req, res) => {
  try {
    const article = await prisma.article.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { category: true },
    });
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 解析工作流数据
    const workflowData = JSON.parse(article.workflowData || '{}');

    res.json({
      ...article,
      workflowData,
    });
  } catch (error) {
    res.status(500).json({ error: '获取文章失败' });
  }
});

// 获取文章内容
articleRouter.get('/:id/content', async (req, res) => {
  try {
    const article = await prisma.article.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    const filePath = path.resolve(article.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: '获取文章内容失败' });
  }
});

// 创建文章
articleRouter.post('/', async (req, res) => {
  try {
    const { title, content, summary, platform, column, categoryId, tags } = req.body;

    if (!title) {
      return res.status(400).json({ error: '标题不能为空' });
    }
    if (!platform || !PLATFORM_COLUMNS[platform]) {
      return res.status(400).json({ error: '请选择有效的平台' });
    }
    if (!column || !PLATFORM_COLUMNS[platform].includes(column)) {
      return res.status(400).json({ error: '请选择有效的栏目' });
    }

    const slug = generateSlug(title);
    const fileName = `${uuid()}.md`;
    const filePath = path.join(ARTICLES_DIR, fileName);

    // 写入文件
    const initialContent = content || `# ${title}\n\n`;
    fs.writeFileSync(filePath, initialContent, 'utf-8');

    const { wordCount, readTime } = calculateReadingStats(initialContent);

    const article = await prisma.article.create({
      data: {
        title,
        slug,
        summary: summary || '',
        filePath,
        platform,
        column,
        categoryId: categoryId || null,
        tags: JSON.stringify(tags || []),
        wordCount,
        readTime,
        userId: req.user!.id,
      },
      include: { category: true },
    });

    res.json(article);
  } catch (error) {
    console.error('创建文章失败:', error);
    res.status(500).json({ error: '创建文章失败' });
  }
});

// 更新文章元数据
articleRouter.put('/:id', async (req, res) => {
  try {
    const { title, summary, platform, column, categoryId, tags, coverImage, knowledgeRefs, layoutTheme } = req.body;

    // 验证文章属于当前用户
    const existing = await prisma.article.findFirst({
      where: { id: req.params.id, userId: req.user!.id }
    });
    if (!existing) {
      return res.status(404).json({ error: '文章不存在' });
    }

    const article = await prisma.article.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(summary !== undefined && { summary }),
        ...(platform && { platform }),
        ...(column && { column }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(tags && { tags: JSON.stringify(tags) }),
        ...(coverImage !== undefined && { coverImage }),
        ...(knowledgeRefs && { knowledgeRefs: JSON.stringify(knowledgeRefs) }),
        ...(layoutTheme && { layoutTheme }),
      },
      include: { category: true },
    });

    res.json(article);
  } catch (error) {
    res.status(500).json({ error: '更新文章失败' });
  }
});

// 更新文章内容（自动创建版本，内容无变化时跳过）
articleRouter.put('/:id/content', async (req, res) => {
  try {
    const { content, changeNote } = req.body;
    if (!content) {
      return res.status(400).json({ error: '内容不能为空' });
    }

    const article = await prisma.article.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 读取当前文件内容，比对是否有变化
    let currentContent = '';
    if (fs.existsSync(article.filePath)) {
      currentContent = fs.readFileSync(article.filePath, 'utf-8');
    }

    // 内容无变化时，直接返回，不创建新版本
    if (currentContent === content) {
      return res.json({ ...article, noChange: true });
    }

    // 保存当前版本到历史
    const versionFileName = `${article.id}_v${article.version}.md`;
    const versionFilePath = path.join(VERSIONS_DIR, versionFileName);

    if (fs.existsSync(article.filePath)) {
      fs.copyFileSync(article.filePath, versionFilePath);
    }

    await prisma.articleVersion.create({
      data: {
        articleId: article.id,
        version: article.version,
        filePath: versionFilePath,
        changeNote,
      },
    });

    // 清理旧版本（只保留最近10个）
    const versions = await prisma.articleVersion.findMany({
      where: { articleId: article.id },
      orderBy: { version: 'desc' },
    });
    if (versions.length > 10) {
      const toDelete = versions.slice(10);
      for (const v of toDelete) {
        if (fs.existsSync(v.filePath)) {
          fs.unlinkSync(v.filePath);
        }
        await prisma.articleVersion.delete({ where: { id: v.id } });
      }
    }

    // 写入新内容
    fs.writeFileSync(article.filePath, content, 'utf-8');
    const { wordCount, readTime } = calculateReadingStats(content);

    const updated = await prisma.article.update({
      where: { id: req.params.id },
      data: {
        version: article.version + 1,
        wordCount,
        readTime,
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '更新文章内容失败' });
  }
});

// 更新工作流进度
articleRouter.put('/:id/workflow', async (req, res) => {
  try {
    const { step, stepData, completed } = req.body;

    // 验证文章属于当前用户
    const article = await prisma.article.findFirst({
      where: { id: req.params.id, userId: req.user!.id }
    });
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 解析现有工作流数据
    const workflowData = JSON.parse(article.workflowData || '{}');

    // 更新步骤数据
    if (stepData) {
      Object.assign(workflowData, stepData);
    }

    // 更新数据库
    const updated = await prisma.article.update({
      where: { id: req.params.id },
      data: {
        workflowStep: step !== undefined ? step : article.workflowStep,
        workflowData: JSON.stringify(workflowData),
      },
    });

    res.json({
      workflowStep: updated.workflowStep,
      workflowData: JSON.parse(updated.workflowData),
    });
  } catch (error) {
    console.error('更新工作流失败:', error);
    res.status(500).json({ error: '更新工作流失败' });
  }
});

// 删除文章
articleRouter.delete('/:id', async (req, res) => {
  try {
    const article = await prisma.article.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { versions: true },
    });
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 删除主文件
    if (fs.existsSync(article.filePath)) {
      fs.unlinkSync(article.filePath);
    }

    // 删除版本文件
    for (const v of article.versions) {
      if (fs.existsSync(v.filePath)) {
        fs.unlinkSync(v.filePath);
      }
    }

    await prisma.article.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除文章失败' });
  }
});

// ========== 版本管理 API ==========

// 获取文章版本列表
articleRouter.get('/:id/versions', async (req, res) => {
  try {
    const article = await prisma.article.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    const versions = await prisma.articleVersion.findMany({
      where: { articleId: req.params.id },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        changeNote: true,
        createdAt: true,
      },
    });

    res.json({
      currentVersion: article.version,
      versions,
    });
  } catch (error) {
    res.status(500).json({ error: '获取版本列表失败' });
  }
});

// 获取指定版本内容（预览）
articleRouter.get('/:id/versions/:versionId/content', async (req, res) => {
  try {
    const version = await prisma.articleVersion.findUnique({
      where: { id: req.params.versionId },
    });
    if (!version || version.articleId !== req.params.id) {
      return res.status(404).json({ error: '版本不存在' });
    }

    if (!fs.existsSync(version.filePath)) {
      return res.status(404).json({ error: '版本文件不存在' });
    }

    const content = fs.readFileSync(version.filePath, 'utf-8');
    res.json({ content, version: version.version });
  } catch (error) {
    res.status(500).json({ error: '获取版本内容失败' });
  }
});

// 回滚到指定版本
articleRouter.post('/:id/versions/:versionId/rollback', async (req, res) => {
  try {
    const article = await prisma.article.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    const targetVersion = await prisma.articleVersion.findUnique({
      where: { id: req.params.versionId },
    });
    if (!targetVersion || targetVersion.articleId !== req.params.id) {
      return res.status(404).json({ error: '版本不存在' });
    }

    if (!fs.existsSync(targetVersion.filePath)) {
      return res.status(404).json({ error: '版本文件不存在' });
    }

    // 读取目标版本内容
    const targetContent = fs.readFileSync(targetVersion.filePath, 'utf-8');

    // 保存当前版本到历史
    const versionFileName = `${article.id}_v${article.version}.md`;
    const versionFilePath = path.join(VERSIONS_DIR, versionFileName);
    if (fs.existsSync(article.filePath)) {
      fs.copyFileSync(article.filePath, versionFilePath);
    }

    await prisma.articleVersion.create({
      data: {
        articleId: article.id,
        version: article.version,
        filePath: versionFilePath,
        changeNote: `回滚前的版本（回滚到 v${targetVersion.version}）`,
      },
    });

    // 写入目标版本内容
    fs.writeFileSync(article.filePath, targetContent, 'utf-8');
    const { wordCount, readTime } = calculateReadingStats(targetContent);

    const updated = await prisma.article.update({
      where: { id: req.params.id },
      data: {
        version: article.version + 1,
        wordCount,
        readTime,
      },
    });

    res.json({
      success: true,
      article: updated,
      rolledBackTo: targetVersion.version,
    });
  } catch (error) {
    res.status(500).json({ error: '版本回滚失败' });
  }
});

// ========== 发布相关 API ==========

// 从 Markdown 内容中提取图片 URL
function extractImageUrls(content: string): string[] {
  const regex = /!\[.*?\]\((.*?)\)/g;
  const urls: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match[1] && (match[1].startsWith('/api/articles/images/') || match[1].startsWith('/uploads/smart-images/'))) {
      urls.push(match[1]);
    }
  }
  return urls;
}

// 同步配图到素材库
async function syncImagesToAssetLibrary(articleId: string, articleTitle: string, content: string) {
  const imageUrls = extractImageUrls(content);
  if (imageUrls.length === 0) return;

  // 获取或创建"文章配图"分类
  let category = await prisma.assetCategory.findFirst({
    where: { name: '文章配图' }
  });
  if (!category) {
    category = await prisma.assetCategory.create({
      data: { name: '文章配图', type: 'image' }
    });
  }

  // 将图片添加到素材库
  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    const filename = url.split('/').pop() || '';
    const localPath = path.join('./uploads/smart-images', filename);

    // 检查文件是否存在
    if (!fs.existsSync(localPath)) continue;

    // 检查是否已存在于素材库
    const existing = await prisma.asset.findFirst({
      where: { path: localPath }
    });
    if (existing) continue;

    // 添加到素材库
    await prisma.asset.create({
      data: {
        name: `${articleTitle}-配图${i + 1}`,
        type: 'image',
        path: localPath,
        categoryId: category.id,
      }
    });
  }
}

// 发布文章
articleRouter.post('/:id/publish', async (req, res) => {
  try {
    const article = await prisma.article.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 更新文章状态
    const updated = await prisma.article.update({
      where: { id: req.params.id },
      data: {
        status: 'published',
        publishedAt: new Date(),
      },
      include: { category: true },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '发布失败' });
  }
});

// 取消发布
articleRouter.post('/:id/unpublish', async (req, res) => {
  try {
    const article = await prisma.article.update({
      where: { id: req.params.id },
      data: {
        status: 'draft',
        publishedAt: null,
      },
      include: { category: true },
    });
    res.json(article);
  } catch (error) {
    res.status(500).json({ error: '取消发布失败' });
  }
});

// ========== 分类管理 API ==========

// 获取分类列表
articleRouter.get('/categories/list', async (req, res) => {
  try {
    const categories = await prisma.articleCategory.findMany({
      include: { _count: { select: { articles: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: '获取分类失败' });
  }
});

// 创建分类
articleRouter.post('/categories', async (req, res) => {
  try {
    const { name, icon, color } = req.body;
    if (!name) {
      return res.status(400).json({ error: '分类名称不能为空' });
    }
    const slug = generateSlug(name);
    const category = await prisma.articleCategory.create({
      data: { name, slug, icon, color },
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: '创建分类失败' });
  }
});

// 删除分类
articleRouter.delete('/categories/:id', async (req, res) => {
  try {
    await prisma.article.updateMany({
      where: { categoryId: req.params.id, userId: req.user!.id },
      data: { categoryId: null },
    });
    await prisma.articleCategory.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除分类失败' });
  }
});

// ========== 工作流 API ==========

// 更新工作流状态
articleRouter.put('/:id/workflow', async (req, res) => {
  try {
    const { step, data } = req.body;

    // 验证文章属于当前用户
    const existing = await prisma.article.findFirst({
      where: { id: req.params.id, userId: req.user!.id }
    });
    if (!existing) {
      return res.status(404).json({ error: '文章不存在' });
    }

    const article = await prisma.article.update({
      where: { id: req.params.id },
      data: {
        ...(step !== undefined && { workflowStep: step }),
        ...(data && { workflowData: JSON.stringify(data) }),
      },
    });
    res.json(article);
  } catch (error) {
    res.status(500).json({ error: '更新工作流失败' });
  }
});

// 获取平台栏目配置
articleRouter.get('/config/platforms', async (req, res) => {
  res.json(PLATFORM_COLUMNS);
});

// 获取工作流步骤配置
articleRouter.get('/config/workflow', async (req, res) => {
  res.json(WORKFLOW_STEPS);
});

// ========== AI 辅助创作 API ==========

// 选题讨论
articleRouter.post('/ai/topic-discussion', async (req, res) => {
  try {
    const { topic, platform, column, context, serviceId, templateId } = req.body;
    if (!topic || !platform || !column) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const config = await getAIConfigOrDefault(serviceId);
    if (!config) {
      return res.status(400).json({ error: '请先配置 AI 服务' });
    }

    let prompt;
    if (templateId) {
      const template = await loadTemplate(templateId);
      prompt = buildPromptWithTemplate(template, 'topicDiscussion', {
        topic, platform, column, context,
        columnStyle: template.columnStyles[platform]?.[column]
      });
    } else {
      prompt = buildTopicDiscussionPrompt({ topic, platform, column, context });
    }

    const service = createAIService(config);
    const result = await service.generateContent(prompt);

    res.json({ analysis: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '选题讨论失败' });
  }
});

// 大纲生成
articleRouter.post('/ai/outline', async (req, res) => {
  try {
    const { title, platform, column, angle, materials, serviceId, templateId } = req.body;
    if (!title || !platform || !column) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const config = await getAIConfigOrDefault(serviceId);
    if (!config) {
      return res.status(400).json({ error: '请先配置 AI 服务' });
    }

    let prompt;
    if (templateId) {
      const template = await loadTemplate(templateId);
      prompt = buildPromptWithTemplate(template, 'outline', {
        title, platform, column, angle, materials
      });
    } else {
      prompt = buildOutlinePrompt({ title, platform, column, angle, materials });
    }

    const service = createAIService(config);
    const result = await service.generateContent(prompt);

    res.json({ outline: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '大纲生成失败' });
  }
});

// 初稿生成（支持时事类自动联网搜索）
articleRouter.post('/ai/draft', async (req, res) => {
  try {
    const { title, platform, column, outline, materials, serviceId, templateId } = req.body;
    if (!title || !platform || !column || !outline) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const config = await getAIConfigOrDefault(serviceId);
    if (!config) {
      return res.status(400).json({ error: '请先配置 AI 服务' });
    }

    let prompt;
    let webSearchUsed = false;

    // 时事检测：如果是时事类内容，先联网搜索获取最新信息
    if (!templateId && isNewsContent(title, outline)) {
      const searchConfig = await getWebSearchAIConfig();
      if (searchConfig) {
        try {
          const searchService = createAIService(searchConfig);
          if (searchService.chatWithSearch) {
            const query = buildSearchQuery(title);
            const searchResult = await searchService.chatWithSearch([
              { role: 'user', content: `请搜索并整理关于「${query}」的最新信息，包括最新数据、案例和观点。` }
            ]);
            if (searchResult.content) {
              prompt = buildDraftPromptWithWebContext({
                title, platform, column, outline, materials,
                webSearchContext: searchResult.content,
              });
              webSearchUsed = true;
            }
          }
        } catch (e) {
          console.warn('联网搜索失败，回退到普通模式:', e);
        }
      }
    }

    if (!prompt) {
      if (templateId) {
        const template = await loadTemplate(templateId);
        prompt = buildPromptWithTemplate(template, 'draft', {
          title, platform, column, outline, materials
        });
      } else {
        prompt = buildDraftPrompt({ title, platform, column, outline, materials });
      }
    }

    const service = createAIService(config);
    const result = await service.generateContent(prompt);

    res.json({ draft: result, webSearchUsed });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '初稿生成失败' });
  }
});

// AI 审校
articleRouter.post('/ai/review', async (req, res) => {
  try {
    const { content, serviceId, templateId } = req.body;
    if (!content) {
      return res.status(400).json({ error: '请提供文章内容' });
    }

    const config = await getAIConfigOrDefault(serviceId);
    if (!config) {
      return res.status(400).json({ error: '请先配置 AI 服务' });
    }

    let prompt;
    if (templateId) {
      const template = await loadTemplate(templateId);
      prompt = buildPromptWithTemplate(template, 'review', { content });
    } else {
      prompt = buildReviewPrompt(content);
    }

    const service = createAIService(config);
    const result = await service.generateContent(prompt);

    res.json({ review: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'AI 审校失败' });
  }
});

// HKR 评估
articleRouter.post('/ai/hkr-evaluate', async (req, res) => {
  try {
    const { content, serviceId, templateId } = req.body;
    if (!content) {
      return res.status(400).json({ error: '请提供文章内容' });
    }

    const config = await getAIConfigOrDefault(serviceId);
    if (!config) {
      return res.status(400).json({ error: '请先配置 AI 服务' });
    }

    let prompt;
    if (templateId) {
      const template = await loadTemplate(templateId);
      prompt = buildPromptWithTemplate(template, 'hkr', { content });
    } else {
      prompt = buildHKRPrompt(content);
    }

    const service = createAIService(config);
    const result = await service.generateContent(prompt);

    // 尝试解析 JSON
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const score = JSON.parse(jsonMatch[0]);
        res.json({ score, raw: result });
        return;
      }
    } catch {}

    res.json({ raw: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'HKR 评估失败' });
  }
});

// HKR 改进 - 根据评估建议自动修改文章
articleRouter.post('/ai/hkr-improve', async (req, res) => {
  try {
    const { content, suggestions, serviceId, templateId, hkrScore } = req.body;
    if (!content) {
      return res.status(400).json({ error: '请提供文章内容' });
    }
    if (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) {
      return res.status(400).json({ error: '请提供改进建议' });
    }

    const config = await getAIConfigOrDefault(serviceId);
    if (!config) {
      return res.status(400).json({ error: '请先配置 AI 服务' });
    }

    let prompt;
    if (templateId) {
      const template = await loadTemplate(templateId);
      prompt = buildPromptWithTemplate(template, 'hkrImprove', {
        content,
        hkrScore: JSON.stringify(hkrScore || suggestions)
      });
    } else {
      prompt = buildHKRImprovePrompt(content, suggestions);
    }

    const service = createAIService(config);
    const improvedContent = await service.generateContent(prompt);

    res.json({ content: improvedContent });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'HKR 改进失败' });
  }
});

// 搜索知识库素材
articleRouter.post('/ai/search-knowledge', async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;
    if (!query) {
      return res.status(400).json({ error: '请提供搜索关键词' });
    }

    // 搜索知识库文档
    const docs = await prisma.knowledgeDoc.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { summary: { contains: query } },
          { tags: { contains: query } },
        ],
      },
      select: {
        id: true,
        title: true,
        summary: true,
        tags: true,
        filePath: true,
      },
      take: limit,
    });

    // 读取部分内容作为摘要
    const results = docs.map(doc => {
      let excerpt = doc.summary || '';
      if (fs.existsSync(doc.filePath)) {
        const content = fs.readFileSync(doc.filePath, 'utf-8');
        excerpt = content.substring(0, 500);
      }
      return { ...doc, excerpt };
    });

    res.json({ results });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '搜索失败' });
  }
});

// 获取可用的 AI 服务列表
articleRouter.get('/ai/services', async (req, res) => {
  try {
    const services = await getAllAIConfigs();
    res.json({ services });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取服务列表失败' });
  }
});

// AI 联网搜索
articleRouter.post('/ai/web-search', async (req, res) => {
  try {
    const { query, serviceId } = req.body;
    if (!query) {
      return res.status(400).json({ error: '请提供搜索关键词' });
    }

    const config = await getAIConfigOrDefault(serviceId);
    if (!config) {
      return res.status(400).json({ error: '请先配置 AI 服务' });
    }

    const service = createAIService(config);

    if (!service.supportsWebSearch() || !service.chatWithSearch) {
      return res.status(400).json({ error: '当前 AI 服务不支持联网搜索' });
    }

    const messages = [
      { role: 'system' as const, content: '你是一个专业的信息搜索助手。请搜索最新的相关信息，并整理成结构清晰的内容。' },
      { role: 'user' as const, content: `请搜索关于"${query}"的最新信息，并整理成 Markdown 格式的内容。` },
    ];

    const result = await service.chatWithSearch(messages);
    res.json({ content: result.content, searchResults: result.searchResults });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '联网搜索失败' });
  }
});

// 内容优化
articleRouter.post('/ai/optimize-content', async (req, res) => {
  try {
    const { content, instruction, serviceId, templateId } = req.body;
    if (!content) {
      return res.status(400).json({ error: '请提供要优化的内容' });
    }
    if (!instruction) {
      return res.status(400).json({ error: '请提供优化指令' });
    }

    const config = await getAIConfigOrDefault(serviceId);
    if (!config) {
      return res.status(400).json({ error: '请先配置 AI 服务' });
    }

    let prompt;
    if (templateId) {
      const template = await loadTemplate(templateId);
      prompt = buildPromptWithTemplate(template, 'optimize', { content });
    } else {
      prompt = `请根据以下指令优化文章内容：

优化指令：${instruction}

原文内容：
${content}

请直接输出优化后的完整文章，使用 Markdown 格式。`;
    }

    const service = createAIService(config);
    const result = await service.generateContent(prompt);

    res.json({ content: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '内容优化失败' });
  }
});

// ========== 智能配图 API ==========

// 配图文件目录
const SMART_IMAGES_DIR = './uploads/smart-images';
if (!fs.existsSync(SMART_IMAGES_DIR)) {
  fs.mkdirSync(SMART_IMAGES_DIR, { recursive: true });
}

// 获取配图文件
articleRouter.get('/images/:filename', (req, res) => {
  const filePath = path.join(SMART_IMAGES_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '图片不存在' });
  }
  res.sendFile(path.resolve(filePath));
});

// 分析配图位置
articleRouter.post('/ai/analyze-image-positions', async (req, res) => {
  try {
    const { content, platform, column, maxImages = 5, serviceId } = req.body;
    if (!content || !platform || !column) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const positions = await smartImageService.analyzeImagePositions(
      content, platform, column, maxImages, serviceId
    );

    res.json({ positions, totalSuggested: positions.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '分析配图位置失败' });
  }
});

// 智能配图（核心 API）
articleRouter.post('/ai/smart-image', async (req, res) => {
  try {
    const { articleId, content, platform, column, positions, autoInsert, imageServiceIds, existingImages } = req.body;
    if (!content || !platform) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 如果没有提供位置，先分析
    let imagePositions = positions;
    if (!imagePositions || imagePositions.length === 0) {
      imagePositions = await smartImageService.analyzeImagePositions(
        content, platform, column || '深度', 5
      );
    }

    // 优先使用前端传递的已有图片，避免重新搜索导致图片不一致
    let images;
    if (existingImages && existingImages.length > 0) {
      images = existingImages;
      console.log('[智能配图] 使用已有图片:', images.length);
    } else {
      // 获取图片（传递指定的图片服务 ID）
      images = await smartImageService.fetchImagesForPositions(
        imagePositions, platform, imageServiceIds
      );
      console.log('[智能配图] 新获取图片数量:', images.length);
    }

    // 如果需要自动插入
    let updatedContent;
    if (autoInsert && images.length > 0) {
      updatedContent = smartImageService.insertImagesToContent(
        content, images, imagePositions
      );
    }

    res.json({ images, updatedContent });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '智能配图失败' });
  }
});

// 获取单张图片（换一张）
articleRouter.post('/ai/fetch-single-image', async (req, res) => {
  try {
    const { keywords, orientation = 'landscape' } = req.body;
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: '请提供搜索关键词' });
    }

    const image = await smartImageService.fetchSingleImage(keywords, orientation);
    if (!image) {
      return res.status(404).json({ error: '未找到合适的图片' });
    }

    res.json(image);
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取图片失败' });
  }
});

// 收藏图片到素材库
articleRouter.post('/ai/save-to-assets', async (req, res) => {
  try {
    const { imageUrl, name, source, keywords } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: '请提供图片路径' });
    }

    // 从 URL 提取文件名
    const filename = imageUrl.split('/').pop() || '';
    const localPath = path.join('./uploads/smart-images', filename);

    // 检查文件是否存在
    if (!fs.existsSync(localPath)) {
      return res.status(404).json({ error: '图片文件不存在' });
    }

    // 获取或创建"收藏配图"分类
    let category = await prisma.assetCategory.findFirst({
      where: { name: '收藏配图' }
    });
    if (!category) {
      category = await prisma.assetCategory.create({
        data: { name: '收藏配图', type: 'image' }
      });
    }

    // 检查是否已存在
    const existing = await prisma.asset.findFirst({
      where: { path: localPath }
    });
    if (existing) {
      return res.status(400).json({ error: '该图片已在素材库中' });
    }

    // 添加到素材库
    const asset = await prisma.asset.create({
      data: {
        name: name || `${source}-${keywords?.slice(0, 2).join('-') || '配图'}`,
        type: 'image',
        path: localPath,
        categoryId: category.id,
      }
    });

    res.json({ success: true, asset });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '收藏失败' });
  }
});

// ========== 口播文案和海报 API ==========

// 口播文案场景匹配（讲什么出什么）
articleRouter.post('/ai/match-scenes', async (req, res) => {
  try {
    const { script, platform, serviceId } = req.body;
    if (!script) {
      return res.status(400).json({ error: '请提供口播文案' });
    }

    const { matchScenes } = await import('../services/video/sceneMatching');
    const result = await matchScenes(script, platform || 'video', serviceId);
    res.json(result);
  } catch (error: any) {
    console.error('场景匹配失败:', error);
    res.status(500).json({ error: error.message || '场景匹配失败' });
  }
});

// 生成口播文案
articleRouter.post('/ai/generate-script', async (req, res) => {
  try {
    const { content, platform, title, length, style, tone, serviceId } = req.body;
    if (!content) {
      return res.status(400).json({ error: '请提供文章内容' });
    }

    const config = await getAIConfigOrDefault(serviceId);
    if (!config) {
      return res.status(400).json({ error: '请先配置 AI 服务' });
    }

    const prompt = buildScriptPrompt({
      content,
      platform: platform || 'video',
      title: title || '',
      length: length || 'medium',
      style: style || 'casual',
      tone: tone || 'enthusiastic',
    });
    const service = createAIService(config);
    const script = await service.generateContent(prompt);

    res.json({ script });
  } catch (error: any) {
    console.error('生成口播文案失败:', error);
    res.status(500).json({ error: error.message || '生成失败' });
  }
});

// 同步口播文案到项目
articleRouter.post('/ai/sync-to-project', async (req, res) => {
  try {
    const { articleId, title, script } = req.body;
    if (!script) {
      return res.status(400).json({ error: '请提供口播文案' });
    }

    const project = await prisma.project.create({
      data: {
        name: title || `文章视频-${Date.now()}`,
        status: 'draft',
        userId: req.user!.id,
        config: JSON.stringify({
          text: script,
          tts: { provider: 'edge', voice: 'zh-CN-XiaoxiaoNeural', rate: 1.0 },
          assets: [],
          popups: [],
          bgm: { assetId: null, volume: 0.3 },
          background: { styleId: 'gradient-blue' },
          orientation: 'portrait',
          resolution: '1080p',
        }),
      },
    });

    res.json({ projectId: project.id, projectName: project.name });
  } catch (error: any) {
    console.error('同步到项目失败:', error);
    res.status(500).json({ error: error.message || '同步失败' });
  }
});

// 提取文章精句
articleRouter.post('/ai/extract-quotes', async (req, res) => {
  try {
    const { content, title, maxQuotes = 5, serviceId } = req.body;
    if (!content) {
      return res.status(400).json({ error: '请提供文章内容' });
    }

    const config = await getAIConfigOrDefault(serviceId);
    if (!config) {
      return res.status(400).json({ error: '请先配置 AI 服务' });
    }

    const prompt = buildQuotesPrompt({ content, title: title || '', maxQuotes });
    const service = createAIService(config);
    const result = await service.generateContent(prompt);

    // 解析 JSON 数组
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    const quotes = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    res.json({ quotes });
  } catch (error: any) {
    console.error('提取精句失败:', error);
    res.status(500).json({ error: error.message || '提取失败' });
  }
});

// AI 润色精句
articleRouter.post('/ai/polish-quote', async (req, res) => {
  try {
    const { quote, title, content, serviceId } = req.body;
    if (!quote) {
      return res.status(400).json({ error: '请提供精句内容' });
    }

    const config = await getAIConfigOrDefault(serviceId);
    if (!config) {
      return res.status(400).json({ error: '请先配置 AI 服务' });
    }

    const prompt = buildPolishQuotePrompt({ quote, title: title || '', content: content || '' });
    const service = createAIService(config);
    const result = await service.generateContent(prompt);

    // 清理结果，去除多余的引号和空白
    const polishedQuote = result.trim().replace(/^["']|["']$/g, '');

    res.json({ polishedQuote });
  } catch (error: any) {
    console.error('润色精句失败:', error);
    res.status(500).json({ error: error.message || '润色失败' });
  }
});

// AI 生成原创精句
articleRouter.post('/ai/generate-quote', async (req, res) => {
  try {
    const { title, content, existingQuotes, serviceId } = req.body;
    if (!content) {
      return res.status(400).json({ error: '请提供文章内容' });
    }

    const config = await getAIConfigOrDefault(serviceId);
    if (!config) {
      return res.status(400).json({ error: '请先配置 AI 服务' });
    }

    const prompt = buildGenerateQuotePrompt({ title: title || '', content, existingQuotes });
    const service = createAIService(config);
    const result = await service.generateContent(prompt);

    // 清理结果
    const quote = result.trim().replace(/^["']|["']$/g, '');

    res.json({ quote });
  } catch (error: any) {
    console.error('生成精句失败:', error);
    res.status(500).json({ error: error.message || '生成失败' });
  }
});

// 生成海报图片
articleRouter.post('/ai/generate-poster', async (req, res) => {
  try {
    const { title, quote, slug, theme = 'light', brandText, customQrUrl } = req.body;
    if (!title || !quote) {
      return res.status(400).json({ error: '请提供标题和精句' });
    }
    if (!slug && !customQrUrl) {
      return res.status(400).json({ error: '请提供文章 slug 或自定义二维码链接' });
    }

    // 构建二维码 URL：优先使用自定义链接
    let qrUrl: string;
    if (customQrUrl) {
      qrUrl = customQrUrl;
    } else {
      const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
      qrUrl = `${baseUrl}/read/${slug}`;
    }

    // 生成海报
    const imageBuffer = await generatePoster({
      title,
      quote,
      qrUrl,
      theme,
      brandText,
    });

    // 保存文件
    const posterDir = ensurePosterDir();
    const filename = `poster-${Date.now()}.png`;
    const filePath = path.join(posterDir, filename);
    fs.writeFileSync(filePath, imageBuffer);

    res.json({
      imageUrl: `/api/articles/posters/${filename}`,
      filename,
    });
  } catch (error: any) {
    console.error('生成海报失败:', error);
    res.status(500).json({ error: error.message || '生成失败' });
  }
});

// 获取海报文件
articleRouter.get('/posters/:filename', (req, res) => {
  const filePath = path.join('./uploads/posters', req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '海报不存在' });
  }
  res.sendFile(path.resolve(filePath));
});

// ========== 风格学习相关 API ==========

// 获取预设风格模板列表
articleRouter.get('/ai/style-templates', async (_req, res) => {
  try {
    const templates = Object.entries(STYLE_TEMPLATES).map(([key, value]) => ({
      id: key,
      ...value,
    }));
    res.json({ templates });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取风格模板失败' });
  }
});

// 从文章链接分析风格
articleRouter.post('/ai/analyze-style', async (req, res) => {
  try {
    const { url, content, serviceId } = req.body;

    if (!url && !content) {
      return res.status(400).json({ error: '请提供文章链接或内容' });
    }

    const config = await getAIConfigOrDefault(serviceId);
    if (!config) {
      return res.status(400).json({ error: '请先配置 AI 服务' });
    }

    let articleContent = content;

    // 如果提供了 URL，先抓取内容
    if (url && !content) {
      try {
        const fetchRes = await fetch(url);
        const html = await fetchRes.text();
        // 简单提取正文（实际可用更复杂的解析）
        articleContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, '\n')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 8000);
      } catch (fetchError) {
        return res.status(400).json({ error: '无法获取文章内容，请直接粘贴文章' });
      }
    }

    const prompt = buildStyleAnalysisPrompt({ content: articleContent, url });
    const service = createAIService(config);
    const result = await service.generateContent(prompt);

    // 解析 JSON 结果
    let analysis;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: result };
    } catch {
      analysis = { raw: result };
    }

    res.json({ analysis });
  } catch (error: any) {
    console.error('风格分析失败:', error);
    res.status(500).json({ error: error.message || '分析失败' });
  }
});

// 基于风格生成初稿
articleRouter.post('/ai/styled-draft', async (req, res) => {
  try {
    const { title, platform, column, outline, styleAnalysis, materials, serviceId, templateId } = req.body;

    if (!outline || !styleAnalysis) {
      return res.status(400).json({ error: '请提供大纲和风格分析结果' });
    }

    const config = await getAIConfigOrDefault(serviceId);
    if (!config) {
      return res.status(400).json({ error: '请先配置 AI 服务' });
    }

    const prompt = buildStyledDraftPrompt({
      title,
      platform,
      column,
      outline,
      styleAnalysis,
      materials,
    });

    const service = createAIService(config);
    const draft = await service.generateContent(prompt);

    res.json({ draft });
  } catch (error: any) {
    console.error('风格化初稿生成失败:', error);
    res.status(500).json({ error: error.message || '生成失败' });
  }
});
