/**
 * 图片服务配置路由
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const prisma = new PrismaClient();
export const imageServiceRouter = Router();

// 所有路由都需要登录
imageServiceRouter.use(requireAuth);

// 图片服务提供商列表
const IMAGE_PROVIDERS = [
  {
    id: 'unsplash',
    name: 'Unsplash',
    description: '高质量免费图片库，需署名',
    type: 'library',
  },
  {
    id: 'pexels',
    name: 'Pexels',
    description: '免费图片库，无需署名',
    type: 'library',
  },
  {
    id: 'pixabay',
    name: 'Pixabay',
    description: '免费图片库，无需署名',
    type: 'library',
  },
  {
    id: 'dashscope',
    name: '通义万相 (阿里云)',
    description: 'AI 图片生成，中文理解好',
    type: 'ai',
  },
];

/**
 * 获取所有图片服务提供商
 * GET /api/image-services/providers
 */
imageServiceRouter.get('/providers', async (_req, res) => {
  res.json({ providers: IMAGE_PROVIDERS });
});

/**
 * 获取所有已配置的图片服务
 * GET /api/image-services
 */
imageServiceRouter.get('/', async (_req, res) => {
  try {
    const configs = await prisma.imageServiceConfig.findMany({
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const services = configs.map(config => {
      const providerInfo = IMAGE_PROVIDERS.find(p => p.id === config.provider);
      return {
        id: config.id,
        name: config.name,
        provider: config.provider,
        providerName: providerInfo?.name || config.provider,
        providerType: providerInfo?.type || 'library',
        isEnabled: config.isEnabled,
        priority: config.priority,
        hasApiKey: !!config.apiKey,
      };
    });

    res.json({ services });
  } catch (error: any) {
    console.error('获取图片服务列表失败:', error);
    res.status(500).json({ error: '获取图片服务列表失败' });
  }
});

/**
 * 添加图片服务配置
 * POST /api/image-services
 */
imageServiceRouter.post('/', async (req, res) => {
  try {
    const { name, provider, apiKey, priority = 0 } = req.body;

    if (!name || !provider || !apiKey) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const config = await prisma.imageServiceConfig.create({
      data: { name, provider, apiKey, priority: parseInt(priority, 10) || 0 },
    });

    res.json({ id: config.id, message: '添加成功' });
  } catch (error: any) {
    console.error('添加图片服务失败:', error);
    res.status(500).json({ error: '添加失败' });
  }
});

/**
 * 更新图片服务配置
 * PUT /api/image-services/:id
 */
imageServiceRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, apiKey, isEnabled, priority } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (apiKey !== undefined) updateData.apiKey = apiKey;
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;
    if (priority !== undefined) updateData.priority = priority;

    await prisma.imageServiceConfig.update({
      where: { id },
      data: updateData,
    });

    res.json({ message: '更新成功' });
  } catch (error: any) {
    console.error('更新图片服务失败:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

/**
 * 删除图片服务配置
 * DELETE /api/image-services/:id
 */
imageServiceRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.imageServiceConfig.delete({ where: { id } });
    res.json({ message: '删除成功' });
  } catch (error: any) {
    console.error('删除图片服务失败:', error);
    res.status(500).json({ error: '删除失败' });
  }
});

/**
 * 获取所有启用的图片服务配置（内部使用）
 * GET /api/image-services/enabled
 */
imageServiceRouter.get('/enabled', async (_req, res) => {
  try {
    const configs = await prisma.imageServiceConfig.findMany({
      where: { isEnabled: true },
      orderBy: { priority: 'desc' },
    });
    res.json({ configs });
  } catch (error: any) {
    res.status(500).json({ error: '获取失败' });
  }
});
