/**
 * 工作流配置模板路由
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { loadTemplate, validateTemplate } from '../services/article/templateService.js';
import { WORKFLOW_PRESETS } from '../config/workflowPresets.js';
import type {
  CreateTemplateRequest,
  UpdateTemplateRequest,
  WorkflowTemplateConfig
} from '../types/workflowTemplate.js';

const router = Router();
const prisma = new PrismaClient();

// 获取配置模板列表
router.get('/', async (req, res) => {
  try {
    const { platform, type, page = 1, pageSize = 20 } = req.query;

    const where: any = {};
    if (platform) where.platform = platform;
    if (type) where.type = type;

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const [templates, total] = await Promise.all([
      prisma.workflowTemplate.findMany({
        where,
        skip,
        take,
        orderBy: [
          { isDefault: 'desc' },
          { usageCount: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      prisma.workflowTemplate.count({ where }),
    ]);

    res.json({ templates, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取预设模板列表（必须在 /:id 之前）
router.get('/presets', async (req, res) => {
  try {
    const presets = Object.values(WORKFLOW_PRESETS).map(preset => ({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      platform: preset.platform,
      column: preset.column,
    }));
    res.json({ presets });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个配置模板
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await prisma.workflowTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return res.status(404).json({ error: '配置模板不存在' });
    }

    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 创建配置模板
router.post('/', async (req, res) => {
  try {
    const data: CreateTemplateRequest = req.body;

    // 验证配置
    const validation = validateTemplate(data.config);
    if (!validation.valid) {
      return res.status(400).json({ error: '配置验证失败', errors: validation.errors });
    }

    // 如果设为默认，取消其他默认模板
    if (data.isDefault) {
      await prisma.workflowTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await prisma.workflowTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        platform: data.platform,
        column: data.column,
        config: JSON.stringify(data.config),
        isDefault: data.isDefault || false,
      },
    });

    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 更新配置模板
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data: UpdateTemplateRequest = req.body;

    // 验证配置
    if (data.config) {
      const validation = validateTemplate(data.config);
      if (!validation.valid) {
        return res.status(400).json({ error: '配置验证失败', errors: validation.errors });
      }
    }

    // 如果设为默认，取消其他默认模板
    if (data.isDefault) {
      await prisma.workflowTemplate.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.platform !== undefined) updateData.platform = data.platform;
    if (data.column !== undefined) updateData.column = data.column;
    if (data.config !== undefined) updateData.config = JSON.stringify(data.config);
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
    if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled;

    const template = await prisma.workflowTemplate.update({
      where: { id },
      data: updateData,
    });

    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 删除配置模板
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.workflowTemplate.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 克隆配置模板
router.post('/:id/clone', async (req, res) => {
  try {
    const { id } = req.params;
    const original = await prisma.workflowTemplate.findUnique({ where: { id } });

    if (!original) {
      return res.status(404).json({ error: '配置模板不存在' });
    }

    const cloned = await prisma.workflowTemplate.create({
      data: {
        name: `${original.name} (副本)`,
        description: original.description,
        platform: original.platform,
        column: original.column,
        config: original.config,
        type: 'custom',
        isSystem: false,
        isDefault: false,
      },
    });

    res.json(cloned);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 导出配置模板
router.get('/:id/export', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await prisma.workflowTemplate.findUnique({ where: { id } });

    if (!template) {
      return res.status(404).json({ error: '配置模板不存在' });
    }

    const exported = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      template: {
        name: template.name,
        description: template.description,
        platform: template.platform,
        column: template.column,
        config: JSON.parse(template.config),
      },
    };

    res.json(exported);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 导入配置模板
router.post('/import', async (req, res) => {
  try {
    const { data, overwrite } = req.body;

    // 验证配置
    const validation = validateTemplate(data.template.config);
    if (!validation.valid) {
      return res.status(400).json({ error: '配置验证失败', errors: validation.errors });
    }

    // 检查是否存在同名模板
    const existing = await prisma.workflowTemplate.findFirst({
      where: { name: data.template.name },
    });

    if (existing && !overwrite) {
      return res.status(409).json({ error: '同名模板已存在', existingId: existing.id });
    }

    let template;
    if (existing && overwrite) {
      template = await prisma.workflowTemplate.update({
        where: { id: existing.id },
        data: {
          description: data.template.description,
          platform: data.template.platform,
          column: data.template.column,
          config: JSON.stringify(data.template.config),
        },
      });
    } else {
      template = await prisma.workflowTemplate.create({
        data: {
          name: data.template.name,
          description: data.template.description,
          platform: data.template.platform,
          column: data.template.column,
          config: JSON.stringify(data.template.config),
        },
      });
    }

    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 安装预设模板
router.post('/presets/:id/install', async (req, res) => {
  try {
    const { id } = req.params;
    const preset = WORKFLOW_PRESETS[id];

    if (!preset) {
      return res.status(404).json({ error: '预设模板不存在' });
    }

    // 检查是否已安装
    const existing = await prisma.workflowTemplate.findFirst({
      where: { type: 'system', name: preset.name },
    });

    if (existing) {
      return res.json(existing);
    }

    // 安装预设模板
    const template = await prisma.workflowTemplate.create({
      data: {
        name: preset.name,
        description: preset.description,
        platform: preset.platform,
        column: preset.column,
        config: JSON.stringify(preset.config),
        type: 'system',
        isSystem: true,
      },
    });

    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as workflowTemplateRouter };
