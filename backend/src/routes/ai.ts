/**
 * 统一的 AI 服务路由
 * 提供 AI 提供商、模型列表和服务配置的统一接口
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { getAllProviders, getProvider, getProviderModels } from '../config/aiModels';
import { requireAuth } from '../middleware/auth.js';

const prisma = new PrismaClient();
export const aiRouter = Router();

// 所有 AI 路由都需要登录
aiRouter.use(requireAuth);

/**
 * 获取所有支持的 AI 提供商列表
 * GET /api/ai/providers
 */
aiRouter.get('/providers', async (req, res) => {
  try {
    const providers = getAllProviders();
    res.json({ providers });
  } catch (error: any) {
    console.error('获取提供商列表失败:', error);
    res.status(500).json({ error: '获取提供商列表失败' });
  }
});

/**
 * 获取指定提供商的模型列表
 * GET /api/ai/models/:provider
 */
aiRouter.get('/models/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const providerInfo = getProvider(provider);

    if (!providerInfo) {
      return res.status(404).json({ error: '提供商不存在' });
    }

    res.json({
      provider: providerInfo.id,
      name: providerInfo.name,
      supportsWebSearch: providerInfo.supportsWebSearch,
      models: providerInfo.models,
    });
  } catch (error: any) {
    console.error('获取模型列表失败:', error);
    res.status(500).json({ error: '获取模型列表失败' });
  }
});

/**
 * 获取所有已配置的 AI 服务（统一格式）
 * GET /api/ai/services
 */
aiRouter.get('/services', async (req, res) => {
  try {
    const configs = await prisma.aIServiceConfig.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const services = configs.map(config => {
      const providerInfo = getProvider(config.provider);
      return {
        id: config.id,
        name: config.name,
        provider: config.provider,
        providerName: providerInfo?.name || config.provider,
        model: config.model,
        supportsWebSearch: providerInfo?.supportsWebSearch || false,
        isDefault: config.isDefault,
        isEnabled: config.isEnabled,
      };
    });

    res.json({ services });
  } catch (error: any) {
    console.error('获取服务列表失败:', error);
    res.status(500).json({ error: '获取服务列表失败' });
  }
});
