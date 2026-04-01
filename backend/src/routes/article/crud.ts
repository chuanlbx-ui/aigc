import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { requireAuth } from '../../middleware/auth.js';
import { getEffectiveWorkflowData, syncWorkflowSteps } from '../../services/article/workflowStorage.js';
import { websocketService } from '../../services/websocket.js';
import { ARTICLES_DIR, VERSIONS_DIR, PLATFORM_COLUMNS, generateSlug, calculateReadingStats } from './shared.js';

const prisma = new PrismaClient();
export const crudRouter = Router();

// 以下 API 需要登录
crudRouter.use((req, res, next) => {
  // 跳过公开 API
  if (req.path.startsWith('/public')) {
    return next();
  }
  return requireAuth(req, res, next);
});

// 获取文章列表
crudRouter.get('/', async (req, res) => {
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

// 获取单个文章 - 使用正则只匹配UUID格式
crudRouter.get('/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', async (req, res) => {
  try {
    const article = await prisma.article.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { category: true },
    });
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 解析工作流数据
    const workflowData = await getEffectiveWorkflowData(article.id, article.workflowData);

    res.json({
      ...article,
      workflowData,
    });
  } catch (error) {
    res.status(500).json({ error: '获取文章失败' });
  }
});

// 获取文章内容 - UUID格式
crudRouter.get('/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/content', async (req, res) => {
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
crudRouter.post('/', async (req, res) => {
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

// 更新文章元数据 - UUID格式
crudRouter.put('/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', async (req, res) => {
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

// 更新文章内容（自动创建版本，内容无变化时跳过）- UUID格式
crudRouter.put('/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/content', async (req, res) => {
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

// 更新工作流进度 - UUID格式
crudRouter.put('/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/workflow', async (req, res) => {
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
    const workflowData = await getEffectiveWorkflowData(article.id, article.workflowData);

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

    await syncWorkflowSteps(
      req.params.id,
      workflowData,
      step !== undefined ? step : article.workflowStep
    );

    websocketService.publishWorkflowProgress(req.params.id, {
      step: updated.workflowStep,
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

// 删除文章 - UUID格式
crudRouter.delete('/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', async (req, res) => {
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

// 获取文章版本列表 - UUID格式
crudRouter.get('/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/versions', async (req, res) => {
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

// 获取指定版本内容（预览）- UUID格式
crudRouter.get('/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/versions/:versionId/content', async (req, res) => {
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

// 回滚到指定版本 - UUID格式
crudRouter.post('/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/versions/:versionId/rollback', async (req, res) => {
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

// ========== 分类管理 API ==========

// 获取分类列表
crudRouter.get('/categories/list', async (req, res) => {
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
crudRouter.post('/categories', async (req, res) => {
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

// 删除分类 - UUID格式
crudRouter.delete('/categories/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', async (req, res) => {
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
