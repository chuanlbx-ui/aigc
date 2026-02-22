/**
 * 模板市场 API 路由
 */

import { Router } from 'express';
import { TemplateMarketplace } from '../services/template/TemplateMarketplace.js';

const router = Router();
const marketplace = new TemplateMarketplace();

/**
 * 获取市场模板列表
 * GET /api/marketplace
 */
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const items = await marketplace.list({
      category: category as string,
      search: search as string,
    });
    res.json({ items });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取单个市场模板
 * GET /api/marketplace/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const item = await marketplace.get(id);
    if (!item) {
      return res.status(404).json({ error: '模板不存在' });
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 发布模板到市场
 * POST /api/marketplace
 */
router.post('/', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name;
    if (!userId) {
      return res.status(401).json({ error: '请先登录' });
    }
    const item = await marketplace.publish(req.body, userId, userName);
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 下载模板
 * POST /api/marketplace/:id/download
 */
router.post('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    await marketplace.download(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
