import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { getDefaultAIConfig, createAIService } from '../services/ai/index.js';
import {
  buildQuotesPrompt,
  buildPolishQuotePrompt,
  buildGenerateQuotePrompt,
} from '../services/article/prompts.js';
import { generatePoster, ensurePosterDir } from '../services/article/posterGenerator.js';
import { requireAuth } from '../middleware/auth.js';

const prisma = new PrismaClient();
export const posterRouter = Router();

// 获取海报图片（公开访问，不需要登录）
posterRouter.get('/image/:filename', (req, res) => {
  const filePath = path.join('./uploads/posters', req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '图片不存在' });
  }
  res.sendFile(path.resolve(filePath));
});

// 公开接口 - 生成海报（不保存到数据库，返回 base64）
posterRouter.post('/public/generate', async (req, res) => {
  try {
    const { quote, theme, brandText, qrUrl, title } = req.body;

    if (!quote) {
      return res.status(400).json({ error: '精句内容不能为空' });
    }

    // 生成海报图片
    const imageBuffer = await generatePoster({
      title: title || '精选金句',
      quote,
      qrUrl: qrUrl || '',
      theme: theme || 'light',
      brandText,
    });

    // 返回 base64 图片数据
    const base64Image = imageBuffer.toString('base64');
    res.json({
      success: true,
      imageData: `data:image/png;base64,${base64Image}`,
    });
  } catch (error: any) {
    console.error('生成海报失败:', error);
    res.status(500).json({ error: error.message || '生成海报失败' });
  }
});

// 以下路由需要登录
posterRouter.use(requireAuth);

// ========== 海报 CRUD API ==========

// 获取海报列表
posterRouter.get('/', async (req, res) => {
  try {
    const { page = '1', pageSize = '20', theme, search } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const where: any = { userId: req.user!.id };
    if (theme) {
      where.theme = theme as string;
    }
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { quote: { contains: search as string } },
      ];
    }

    const [posters, total] = await Promise.all([
      prisma.poster.findMany({
        where,
        include: { article: { select: { id: true, title: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.poster.count({ where }),
    ]);

    res.json({ posters, total, page: parseInt(page as string), pageSize: take });
  } catch (error) {
    console.error('获取海报列表失败:', error);
    res.status(500).json({ error: '获取海报列表失败' });
  }
});

// 获取单个海报
posterRouter.get('/:id', async (req, res) => {
  try {
    const poster = await prisma.poster.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { article: { select: { id: true, title: true, slug: true } } },
    });
    if (!poster) {
      return res.status(404).json({ error: '海报不存在' });
    }
    res.json(poster);
  } catch (error) {
    res.status(500).json({ error: '获取海报失败' });
  }
});

// 创建海报（生成图片并保存记录）
posterRouter.post('/', async (req, res) => {
  try {
    const { name, quote, theme, brandText, qrUrl, articleId } = req.body;

    if (!name || !quote) {
      return res.status(400).json({ error: '名称和精句不能为空' });
    }

    // 确定二维码链接
    let finalQrUrl = qrUrl;
    if (!finalQrUrl && articleId) {
      const article = await prisma.article.findUnique({
        where: { id: articleId },
        select: { slug: true },
      });
      if (article) {
        const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
        finalQrUrl = `${baseUrl}/read/${article.slug}`;
      }
    }
    if (!finalQrUrl) {
      finalQrUrl = process.env.BASE_URL || 'http://localhost:5173';
    }

    // 生成海报图片
    const imageBuffer = await generatePoster({
      title: name,
      quote,
      qrUrl: finalQrUrl,
      theme: theme || 'light',
      brandText,
    });

    // 保存文件
    const posterDir = ensurePosterDir();
    const filename = `poster-${Date.now()}.png`;
    const filePath = path.join(posterDir, filename);
    fs.writeFileSync(filePath, imageBuffer);

    // 保存数据库记录
    const poster = await prisma.poster.create({
      data: {
        name,
        quote,
        theme: theme || 'light',
        brandText,
        qrUrl: finalQrUrl,
        filePath,
        articleId: articleId || null,
        userId: req.user!.id,
      },
      include: { article: { select: { id: true, title: true } } },
    });

    res.json({
      ...poster,
      imageUrl: `/api/posters/image/${filename}`,
    });
  } catch (error: any) {
    console.error('创建海报失败:', error);
    res.status(500).json({ error: error.message || '创建海报失败' });
  }
});

// 更新海报
posterRouter.put('/:id', async (req, res) => {
  try {
    const { name, quote, theme, brandText, qrUrl, articleId } = req.body;

    // 验证海报属于当前用户
    const existing = await prisma.poster.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!existing) {
      return res.status(404).json({ error: '海报不存在' });
    }

    // 确定二维码链接
    let finalQrUrl = qrUrl;
    if (!finalQrUrl && articleId) {
      const article = await prisma.article.findUnique({
        where: { id: articleId },
        select: { slug: true },
      });
      if (article) {
        const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
        finalQrUrl = `${baseUrl}/read/${article.slug}`;
      }
    }
    if (!finalQrUrl) {
      finalQrUrl = existing.qrUrl || process.env.BASE_URL || 'http://localhost:5173';
    }

    // 重新生成海报图片
    const imageBuffer = await generatePoster({
      title: name || existing.name,
      quote: quote || existing.quote,
      qrUrl: finalQrUrl,
      theme: theme || existing.theme,
      brandText: brandText !== undefined ? brandText : existing.brandText,
    });

    // 删除旧文件
    if (fs.existsSync(existing.filePath)) {
      fs.unlinkSync(existing.filePath);
    }

    // 保存新文件
    const posterDir = ensurePosterDir();
    const filename = `poster-${Date.now()}.png`;
    const filePath = path.join(posterDir, filename);
    fs.writeFileSync(filePath, imageBuffer);

    // 更新数据库记录
    const poster = await prisma.poster.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(quote && { quote }),
        ...(theme && { theme }),
        ...(brandText !== undefined && { brandText }),
        qrUrl: finalQrUrl,
        filePath,
        ...(articleId !== undefined && { articleId: articleId || null }),
      },
      include: { article: { select: { id: true, title: true } } },
    });

    res.json({
      ...poster,
      imageUrl: `/api/posters/image/${filename}`,
    });
  } catch (error: any) {
    console.error('更新海报失败:', error);
    res.status(500).json({ error: error.message || '更新海报失败' });
  }
});

// 删除海报
posterRouter.delete('/:id', async (req, res) => {
  try {
    const poster = await prisma.poster.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!poster) {
      return res.status(404).json({ error: '海报不存在' });
    }

    // 删除文件
    if (fs.existsSync(poster.filePath)) {
      fs.unlinkSync(poster.filePath);
    }

    // 删除数据库记录
    await prisma.poster.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('删除海报失败:', error);
    res.status(500).json({ error: '删除海报失败' });
  }
});

// ========== AI 辅助 API ==========

// 提取精句
posterRouter.post('/ai/extract-quotes', async (req, res) => {
  try {
    const { content, title, maxQuotes = 5 } = req.body;
    if (!content) {
      return res.status(400).json({ error: '请提供文章内容' });
    }

    const config = await getDefaultAIConfig();
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
posterRouter.post('/ai/polish-quote', async (req, res) => {
  try {
    const { quote, title, content } = req.body;
    if (!quote) {
      return res.status(400).json({ error: '请提供精句内容' });
    }

    const config = await getDefaultAIConfig();
    if (!config) {
      return res.status(400).json({ error: '请先配置 AI 服务' });
    }

    const prompt = buildPolishQuotePrompt({ quote, title: title || '', content: content || '' });
    const service = createAIService(config);
    const result = await service.generateContent(prompt);

    const polishedQuote = result.trim().replace(/^["']|["']$/g, '');
    res.json({ polishedQuote });
  } catch (error: any) {
    console.error('润色精句失败:', error);
    res.status(500).json({ error: error.message || '润色失败' });
  }
});

// AI 生成原创精句
posterRouter.post('/ai/generate-quote', async (req, res) => {
  try {
    const { title, content, existingQuotes } = req.body;
    if (!content) {
      return res.status(400).json({ error: '请提供文章内容' });
    }

    const config = await getDefaultAIConfig();
    if (!config) {
      return res.status(400).json({ error: '请先配置 AI 服务' });
    }

    const prompt = buildGenerateQuotePrompt({ title: title || '', content, existingQuotes });
    const service = createAIService(config);
    const result = await service.generateContent(prompt);

    const quote = result.trim().replace(/^["']|["']$/g, '');
    res.json({ quote });
  } catch (error: any) {
    console.error('生成精句失败:', error);
    res.status(500).json({ error: error.message || '生成失败' });
  }
});
