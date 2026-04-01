import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { extractImageUrls } from './shared.js';

const prisma = new PrismaClient();
export const publishRouter = Router();

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
publishRouter.post('/:id/publish', async (req, res) => {
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
publishRouter.post('/:id/unpublish', async (req, res) => {
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

// ========== 内容效果数据 API ==========

// 获取文章效果数据
publishRouter.get('/:id/metrics', async (req, res) => {
  try {
    const { days = '30' } = req.query;
    const { getMetricsHistory, getMetricsSummary } = await import('../../services/publish/metrics.js');

    const history = await getMetricsHistory(req.params.id, parseInt(days as string));
    const summary = await getMetricsSummary(req.params.id);

    res.json({ history, summary });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取效果数据失败' });
  }
});

// 记录效果数据（用于浏览器扩展上报）
publishRouter.post('/:id/metrics', async (req, res) => {
  try {
    const { platform, platformPostId, ...metricsData } = req.body;

    if (!platform) {
      return res.status(400).json({ error: '请提供平台信息' });
    }

    const { recordMetrics } = await import('../../services/publish/metrics.js');
    await recordMetrics(req.params.id, platform, metricsData, platformPostId);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '记录效果数据失败' });
  }
});

// 获取高表现内容
publishRouter.get('/top-performing', async (req, res) => {
  try {
    const { platform, limit = '10', days = '30' } = req.query;
    const { getTopPerformingContent } = await import('../../services/publish/metrics.js');

    const results = await getTopPerformingContent(
      platform as string,
      parseInt(limit as string),
      parseInt(days as string)
    );

    res.json({ results });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取高表现内容失败' });
  }
});
