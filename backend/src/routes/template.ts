import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { layoutCSSGenerator } from '../services/template/LayoutCSSGenerator.js';
import { LayoutTemplateConfig } from '../services/template/types.js';

const router = Router();
const prisma = new PrismaClient();

// 所有模板路由都需要登录
router.use(requireAuth);

// 获取模板列表（系统模板 + 用户自己的模板）
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const where: any = {
      isEnabled: true,
      OR: [
        { isSystem: true },
        { userId: req.user!.id }
      ]
    };
    if (type) where.type = type;

    const templates = await prisma.template.findMany({
      where,
      orderBy: [{ isSystem: 'desc' }, { sortOrder: 'asc' }],
    });
    res.json(templates);
  } catch (error) {
    console.error('获取模板失败:', error);
    res.status(500).json({ error: '获取模板失败' });
  }
});

// 获取单个模板
router.get('/:id', async (req, res) => {
  try {
    const template = await prisma.template.findUnique({
      where: { id: req.params.id },
    });
    if (!template) {
      return res.status(404).json({ error: '模板不存在' });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: '获取模板失败' });
  }
});

// 创建模板
router.post('/', async (req, res) => {
  try {
    const { type, name, description, config, thumbnail } = req.body;
    const template = await prisma.template.create({
      data: {
        type,
        name,
        description,
        config: JSON.stringify(config || {}),
        thumbnail,
        userId: req.user!.id,
      },
    });
    res.json(template);
  } catch (error) {
    console.error('创建模板失败:', error);
    res.status(500).json({ error: '创建模板失败' });
  }
});

// 更新模板
router.put('/:id', async (req, res) => {
  try {
    const { name, description, config, thumbnail, isEnabled, sortOrder } = req.body;

    // 验证模板属于当前用户（系统模板不可修改）
    const existing = await prisma.template.findFirst({
      where: { id: req.params.id, userId: req.user!.id, isSystem: false }
    });
    if (!existing) {
      return res.status(404).json({ error: '模板不存在或无权修改' });
    }

    const template = await prisma.template.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        config: config ? JSON.stringify(config) : undefined,
        thumbnail,
        isEnabled,
        sortOrder,
      },
    });
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: '更新模板失败' });
  }
});

// 删除模板
router.delete('/:id', async (req, res) => {
  try {
    const template = await prisma.template.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!template) {
      return res.status(404).json({ error: '模板不存在' });
    }
    if (template.isSystem) {
      return res.status(400).json({ error: '系统模板不可删除' });
    }
    await prisma.template.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除模板失败' });
  }
});

// ========== 排版模板专用端点 ==========

// 获取排版模板的 CSS
router.get('/layout/:id/css', async (req, res) => {
  try {
    const template = await prisma.template.findFirst({
      where: { id: req.params.id, type: 'layout' },
    });
    if (!template) {
      return res.status(404).json({ error: '排版模板不存在' });
    }

    const config = JSON.parse(template.config) as LayoutTemplateConfig;
    const css = layoutCSSGenerator.generateCSS(config, template.id);

    res.type('text/css').send(css);
  } catch (error) {
    console.error('生成 CSS 失败:', error);
    res.status(500).json({ error: '生成 CSS 失败' });
  }
});

// 获取排版模板的内联样式映射
router.get('/layout/:id/inline-styles', async (req, res) => {
  try {
    const template = await prisma.template.findFirst({
      where: { id: req.params.id, type: 'layout' },
    });
    if (!template) {
      return res.status(404).json({ error: '排版模板不存在' });
    }

    const config = JSON.parse(template.config) as LayoutTemplateConfig;
    const styles = layoutCSSGenerator.generateInlineStyles(config);

    res.json({ styles });
  } catch (error) {
    console.error('生成内联样式失败:', error);
    res.status(500).json({ error: '生成内联样式失败' });
  }
});

// 预览 CSS（不保存，用于编辑器实时预览）
router.post('/layout/preview-css', async (req, res) => {
  try {
    const { config, themeId = 'preview' } = req.body;
    if (!config) {
      return res.status(400).json({ error: '请提供配置' });
    }

    const css = layoutCSSGenerator.generateCSS(config as LayoutTemplateConfig, themeId);
    res.type('text/css').send(css);
  } catch (error) {
    console.error('预览 CSS 失败:', error);
    res.status(500).json({ error: '预览 CSS 失败' });
  }
});

export default router;
