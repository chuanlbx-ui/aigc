/**
 * 统一媒体服务配置 API
 * 管理所有 AI、图片、视频、音频、TTS、数字人等服务配置
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  ServiceType,
  SERVICE_TYPES,
  getServiceType,
  getProvider,
  getProviders,
  getDefaultModel,
  getAllServiceTypes,
} from '../services/media/registry.js';

const prisma = new PrismaClient();
export const mediaServiceRouter = Router();

// ========== 服务类型和服务商信息 API ==========

/**
 * 获取所有服务类型定义
 * GET /api/media-services/types
 */
mediaServiceRouter.get('/types', async (req, res) => {
  try {
    const types = getAllServiceTypes();
    res.json({ types });
  } catch (error: any) {
    console.error('获取服务类型失败:', error);
    res.status(500).json({ error: error.message || '获取服务类型失败' });
  }
});

/**
 * 获取指定类型的服务商列表
 * GET /api/media-services/providers?type=ai_chat
 */
mediaServiceRouter.get('/providers', async (req, res) => {
  try {
    const { type } = req.query;
    if (!type) {
      return res.status(400).json({ error: '请指定服务类型' });
    }

    const providers = getProviders(type as ServiceType);
    res.json({ providers });
  } catch (error: any) {
    console.error('获取服务商列表失败:', error);
    res.status(500).json({ error: error.message || '获取服务商列表失败' });
  }
});

/**
 * 获取指定服务商的模型列表
 * GET /api/media-services/models?type=ai_chat&provider=openai
 */
mediaServiceRouter.get('/models', async (req, res) => {
  try {
    const { type, provider } = req.query;
    if (!type || !provider) {
      return res.status(400).json({ error: '请指定服务类型和服务商' });
    }

    const providerDef = getProvider(type as ServiceType, provider as string);
    if (!providerDef) {
      return res.status(404).json({ error: '服务商不存在' });
    }

    res.json({
      provider: providerDef,
      models: providerDef.models || [],
      defaultModel: getDefaultModel(type as ServiceType, provider as string),
    });
  } catch (error: any) {
    console.error('获取模型列表失败:', error);
    res.status(500).json({ error: error.message || '获取模型列表失败' });
  }
});

// ========== 服务配置 CRUD API ==========

/**
 * 获取服务配置列表
 * GET /api/media-services?type=ai_chat&enabled=true
 */
mediaServiceRouter.get('/', async (req, res) => {
  try {
    const { type, enabled, provider } = req.query;

    const where: any = {};
    if (type) {
      where.serviceType = type as string;
    }
    if (enabled !== undefined) {
      where.isEnabled = enabled === 'true';
    }
    if (provider) {
      where.provider = provider as string;
    }

    const configs = await prisma.mediaServiceConfig.findMany({
      where,
      orderBy: [
        { serviceType: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // 解析 config JSON
    const result = configs.map(c => ({
      ...c,
      config: JSON.parse(c.config || '{}'),
    }));

    res.json({ configs: result });
  } catch (error: any) {
    console.error('获取服务配置失败:', error);
    res.status(500).json({ error: error.message || '获取服务配置失败' });
  }
});

/**
 * 获取单个服务配置
 * GET /api/media-services/:id
 */
mediaServiceRouter.get('/:id', async (req, res) => {
  try {
    const config = await prisma.mediaServiceConfig.findUnique({
      where: { id: req.params.id },
    });

    if (!config) {
      return res.status(404).json({ error: '配置不存在' });
    }

    res.json({
      ...config,
      config: JSON.parse(config.config || '{}'),
    });
  } catch (error: any) {
    console.error('获取服务配置失败:', error);
    res.status(500).json({ error: error.message || '获取服务配置失败' });
  }
});

/**
 * 创建服务配置
 * POST /api/media-services
 */
mediaServiceRouter.post('/', async (req, res) => {
  try {
    const {
      name,
      provider,
      serviceType,
      modelId,
      modelVersion,
      apiKey,
      apiEndpoint,
      apiVersion,
      config,
      isEnabled,
      priority,
    } = req.body;

    // 验证必填字段
    if (!provider || !serviceType) {
      return res.status(400).json({ error: '服务商和服务类型不能为空' });
    }

    // 验证服务类型
    const serviceTypeDef = getServiceType(serviceType as ServiceType);
    if (!serviceTypeDef) {
      return res.status(400).json({ error: '无效的服务类型' });
    }

    // 验证服务商
    const providerDef = getProvider(serviceType as ServiceType, provider);
    if (!providerDef) {
      return res.status(400).json({ error: '无效的服务商' });
    }

    // 生成默认名称
    const defaultName = modelId
      ? `${providerDef.name} - ${modelId}`
      : providerDef.name;

    const newConfig = await prisma.mediaServiceConfig.create({
      data: {
        name: name || defaultName,
        provider,
        serviceType,
        modelId: modelId || null,
        modelVersion: modelVersion || null,
        apiKey: apiKey || null,
        apiEndpoint: apiEndpoint || null,
        apiVersion: apiVersion || null,
        config: JSON.stringify(config || {}),
        isEnabled: isEnabled !== false,
        priority: priority || 0,
      },
    });

    res.json({
      ...newConfig,
      config: JSON.parse(newConfig.config || '{}'),
    });
  } catch (error: any) {
    // 处理唯一约束冲突
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '该服务商和模型组合已存在' });
    }
    console.error('创建服务配置失败:', error);
    res.status(500).json({ error: error.message || '创建服务配置失败' });
  }
});

/**
 * 更新服务配置
 * PUT /api/media-services/:id
 */
mediaServiceRouter.put('/:id', async (req, res) => {
  try {
    const {
      name,
      modelId,
      modelVersion,
      apiKey,
      apiEndpoint,
      apiVersion,
      config,
      isEnabled,
      priority,
    } = req.body;

    const existing = await prisma.mediaServiceConfig.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: '配置不存在' });
    }

    const updated = await prisma.mediaServiceConfig.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(modelId !== undefined && { modelId }),
        ...(modelVersion !== undefined && { modelVersion }),
        ...(apiKey !== undefined && { apiKey }),
        ...(apiEndpoint !== undefined && { apiEndpoint }),
        ...(apiVersion !== undefined && { apiVersion }),
        ...(config !== undefined && { config: JSON.stringify(config) }),
        ...(isEnabled !== undefined && { isEnabled }),
        ...(priority !== undefined && { priority }),
      },
    });

    res.json({
      ...updated,
      config: JSON.parse(updated.config || '{}'),
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '该服务商和模型组合已存在' });
    }
    console.error('更新服务配置失败:', error);
    res.status(500).json({ error: error.message || '更新服务配置失败' });
  }
});

/**
 * 删除服务配置
 * DELETE /api/media-services/:id
 */
mediaServiceRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.mediaServiceConfig.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '配置不存在' });
    }
    console.error('删除服务配置失败:', error);
    res.status(500).json({ error: error.message || '删除服务配置失败' });
  }
});

/**
 * 批量更新优先级
 * PUT /api/media-services/batch/priority
 */
mediaServiceRouter.put('/batch/priority', async (req, res) => {
  try {
    const { updates } = req.body;
    // updates: [{ id: string, priority: number }]

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: '请提供更新列表' });
    }

    await prisma.$transaction(
      updates.map(({ id, priority }) =>
        prisma.mediaServiceConfig.update({
          where: { id },
          data: { priority },
        })
      )
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('批量更新优先级失败:', error);
    res.status(500).json({ error: error.message || '批量更新优先级失败' });
  }
});

/**
 * 切换启用状态
 * POST /api/media-services/:id/toggle
 */
mediaServiceRouter.post('/:id/toggle', async (req, res) => {
  try {
    const existing = await prisma.mediaServiceConfig.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: '配置不存在' });
    }

    const updated = await prisma.mediaServiceConfig.update({
      where: { id: req.params.id },
      data: { isEnabled: !existing.isEnabled },
    });

    res.json({
      ...updated,
      config: JSON.parse(updated.config || '{}'),
    });
  } catch (error: any) {
    console.error('切换启用状态失败:', error);
    res.status(500).json({ error: error.message || '切换启用状态失败' });
  }
});

// ========== 服务测试 API ==========

/**
 * 测试服务连接
 * POST /api/media-services/:id/test
 */
mediaServiceRouter.post('/:id/test', async (req, res) => {
  try {
    const config = await prisma.mediaServiceConfig.findUnique({
      where: { id: req.params.id },
    });

    if (!config) {
      return res.status(404).json({ error: '配置不存在' });
    }

    // 根据服务类型执行不同的测试
    const result = await testServiceConnection(config);

    res.json(result);
  } catch (error: any) {
    console.error('测试服务连接失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '测试失败',
    });
  }
});

/**
 * 测试服务连接的具体实现
 */
async function testServiceConnection(config: any): Promise<{ success: boolean; message: string; latency?: number }> {
  const startTime = Date.now();

  try {
    switch (config.serviceType) {
      case 'ai_chat':
        return await testAIChatService(config);
      case 'image_search':
        return await testImageSearchService(config);
      case 'image_generate':
        return await testImageGenerateService(config);
      case 'tts':
        return await testTTSService(config);
      default:
        // 对于其他服务类型，只检查 API Key 是否存在
        if (!config.apiKey) {
          return { success: false, message: 'API Key 未配置' };
        }
        return {
          success: true,
          message: '配置已保存（无法自动测试此服务类型）',
          latency: Date.now() - startTime,
        };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || '连接失败',
      latency: Date.now() - startTime,
    };
  }
}

/**
 * 测试 AI 对话服务
 */
async function testAIChatService(config: any): Promise<{ success: boolean; message: string; latency?: number }> {
  const startTime = Date.now();

  if (!config.apiKey) {
    return { success: false, message: 'API Key 未配置' };
  }

  // 根据不同的 provider 构建测试请求
  let endpoint = '';
  let headers: Record<string, string> = {};
  let body: any = {};

  switch (config.provider) {
    case 'openai':
      endpoint = config.apiEndpoint || 'https://api.openai.com/v1/chat/completions';
      headers = {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      };
      body = {
        model: config.modelId || 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      };
      break;

    case 'claude':
      endpoint = config.apiEndpoint || 'https://api.anthropic.com/v1/messages';
      headers = {
        'x-api-key': config.apiKey,
        'anthropic-version': config.apiVersion || '2023-06-01',
        'Content-Type': 'application/json',
      };
      body = {
        model: config.modelId || 'claude-3-5-haiku-20241022',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      };
      break;

    case 'deepseek':
      endpoint = config.apiEndpoint || 'https://api.deepseek.com/v1/chat/completions';
      headers = {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      };
      body = {
        model: config.modelId || 'deepseek-chat',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      };
      break;

    case 'qwen':
      endpoint = config.apiEndpoint || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
      headers = {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      };
      body = {
        model: config.modelId || 'qwen-turbo',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      };
      break;

    case 'kimi':
      endpoint = config.apiEndpoint || 'https://api.moonshot.cn/v1/chat/completions';
      headers = {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      };
      body = {
        model: config.modelId || 'moonshot-v1-8k',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      };
      break;

    default:
      return {
        success: true,
        message: '配置已保存（暂不支持自动测试此服务商）',
        latency: Date.now() - startTime,
      };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP ${response.status}`);
  }

  return {
    success: true,
    message: '连接成功',
    latency: Date.now() - startTime,
  };
}

/**
 * 测试图片搜索服务
 */
async function testImageSearchService(config: any): Promise<{ success: boolean; message: string; latency?: number }> {
  const startTime = Date.now();

  if (!config.apiKey) {
    return { success: false, message: 'API Key 未配置' };
  }

  let endpoint = '';
  let headers: Record<string, string> = {};

  switch (config.provider) {
    case 'unsplash':
      endpoint = 'https://api.unsplash.com/search/photos?query=test&per_page=1';
      headers = { 'Authorization': `Client-ID ${config.apiKey}` };
      break;

    case 'pexels':
      endpoint = 'https://api.pexels.com/v1/search?query=test&per_page=1';
      headers = { 'Authorization': config.apiKey };
      break;

    case 'pixabay':
      endpoint = `https://pixabay.com/api/?key=${config.apiKey}&q=test&per_page=3`;
      break;

    default:
      return {
        success: true,
        message: '配置已保存（暂不支持自动测试此服务商）',
        latency: Date.now() - startTime,
      };
  }

  const response = await fetch(endpoint, { headers });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return {
    success: true,
    message: '连接成功',
    latency: Date.now() - startTime,
  };
}

/**
 * 测试图片生成服务
 */
async function testImageGenerateService(config: any): Promise<{ success: boolean; message: string; latency?: number }> {
  const startTime = Date.now();

  if (!config.apiKey) {
    return { success: false, message: 'API Key 未配置' };
  }

  // 图片生成服务通常较贵，只验证 API Key 格式
  switch (config.provider) {
    case 'dalle':
      // OpenAI API Key 格式验证
      if (!config.apiKey.startsWith('sk-')) {
        return { success: false, message: 'API Key 格式不正确' };
      }
      break;

    case 'stability':
      // Stability AI API Key 格式验证
      if (!config.apiKey.startsWith('sk-')) {
        return { success: false, message: 'API Key 格式不正确' };
      }
      break;
  }

  return {
    success: true,
    message: '配置已保存（图片生成服务不执行实际测试以节省费用）',
    latency: Date.now() - startTime,
  };
}

/**
 * 测试 TTS 服务
 */
async function testTTSService(config: any): Promise<{ success: boolean; message: string; latency?: number }> {
  const startTime = Date.now();

  switch (config.provider) {
    case 'edge_tts':
      // Edge TTS 是免费的，不需要 API Key
      return {
        success: true,
        message: 'Edge TTS 无需配置',
        latency: Date.now() - startTime,
      };

    case 'xfyun': {
      // 科大讯飞需要 AppId、ApiKey、ApiSecret
      const xfConfig = JSON.parse(config.config || '{}');
      if (!config.apiKey || !xfConfig.appId || !xfConfig.apiSecret) {
        return { success: false, message: '请填写完整的讯飞配置（App ID、API Key、API Secret）' };
      }
      return {
        success: true,
        message: '配置已保存',
        latency: Date.now() - startTime,
      };
    }

    case 'azure_tts':
    case 'elevenlabs':
    case 'fish_audio':
      if (!config.apiKey) {
        return { success: false, message: 'API Key 未配置' };
      }
      return {
        success: true,
        message: '配置已保存',
        latency: Date.now() - startTime,
      };

    default:
      return {
        success: true,
        message: '配置已保存',
        latency: Date.now() - startTime,
      };
  }
}

// ========== 便捷查询 API ==========

/**
 * 获取指定类型的默认/首选服务
 * GET /api/media-services/default/:type
 */
mediaServiceRouter.get('/default/:type', async (req, res) => {
  try {
    const { type } = req.params;

    const config = await prisma.mediaServiceConfig.findFirst({
      where: {
        serviceType: type,
        isEnabled: true,
      },
      orderBy: { priority: 'desc' },
    });

    if (!config) {
      return res.status(404).json({ error: '未找到可用的服务配置' });
    }

    res.json({
      ...config,
      config: JSON.parse(config.config || '{}'),
    });
  } catch (error: any) {
    console.error('获取默认服务失败:', error);
    res.status(500).json({ error: error.message || '获取默认服务失败' });
  }
});

/**
 * 获取所有启用的服务（按类型分组）
 * GET /api/media-services/enabled/grouped
 */
mediaServiceRouter.get('/enabled/grouped', async (req, res) => {
  try {
    const configs = await prisma.mediaServiceConfig.findMany({
      where: { isEnabled: true },
      orderBy: [
        { serviceType: 'asc' },
        { priority: 'desc' },
      ],
    });

    // 按服务类型分组
    const grouped: Record<string, any[]> = {};
    for (const config of configs) {
      if (!grouped[config.serviceType]) {
        grouped[config.serviceType] = [];
      }
      grouped[config.serviceType].push({
        ...config,
        config: JSON.parse(config.config || '{}'),
      });
    }

    res.json({ grouped });
  } catch (error: any) {
    console.error('获取分组服务失败:', error);
    res.status(500).json({ error: error.message || '获取分组服务失败' });
  }
});
