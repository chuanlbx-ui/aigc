/**
 * 模板组合 API 路由
 */

import { Router } from 'express';
import { TemplateComposer } from '../services/template/TemplateComposer.js';

const router = Router();
const composer = new TemplateComposer();

/**
 * 获取组合包列表
 * GET /api/template-bundles
 */
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const bundles = await composer.listBundles(userId);
    res.json({ bundles });
  } catch (error: any) {
    console.error('获取组合包列表失败:', error);
    res.status(500).json({ error: error.message || '获取组合包列表失败' });
  }
});

/**
 * 获取单个组合包
 * GET /api/template-bundles/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bundle = await composer.getBundle(id);
    if (!bundle) {
      return res.status(404).json({ error: '组合包不存在' });
    }
    res.json(bundle);
  } catch (error: any) {
    console.error('获取组合包失败:', error);
    res.status(500).json({ error: error.message || '获取组合包失败' });
  }
});

/**
 * 创建组合包
 * POST /api/template-bundles
 */
router.post('/', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { name, description, bundleType, config, items } = req.body;

    if (!name || !items?.length) {
      return res.status(400).json({ error: '名称和模板项不能为空' });
    }

    const bundle = await composer.createBundle(
      { name, description, bundleType, config, items },
      userId
    );
    res.json(bundle);
  } catch (error: any) {
    console.error('创建组合包失败:', error);
    res.status(500).json({ error: error.message || '创建组合包失败' });
  }
});

/**
 * 更新组合包
 * PUT /api/template-bundles/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const bundle = await composer.updateBundle(id, data);
    res.json(bundle);
  } catch (error: any) {
    console.error('更新组合包失败:', error);
    res.status(500).json({ error: error.message || '更新组合包失败' });
  }
});

/**
 * 删除组合包
 * DELETE /api/template-bundles/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await composer.deleteBundle(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('删除组合包失败:', error);
    res.status(500).json({ error: error.message || '删除组合包失败' });
  }
});

export default router;
