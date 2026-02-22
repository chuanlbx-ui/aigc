/**
 * 热点API路由
 */

import { Router } from 'express';
import { hotTopicService } from '../services/hotTopic/index.js';

const router = Router();

/**
 * GET /api/hot-topics
 * 获取热点列表
 */
router.get('/', async (req, res) => {
  try {
    const { source, limit, category } = req.query;

    const topics = await hotTopicService.fetchHotTopics({
      source: source as any,
      limit: limit ? parseInt(limit as string) : undefined,
      category: category as string,
    });

    res.json({ topics });
  } catch (error: any) {
    console.error('获取热点失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/hot-topics/refresh
 * 刷新热点数据
 */
router.post('/refresh', async (req, res) => {
  try {
    const { source } = req.body;
    await hotTopicService.refreshHotTopics(source);
    res.json({ message: '刷新成功' });
  } catch (error: any) {
    console.error('刷新热点失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/hot-topics/:id/match-knowledge
 * 匹配知识库
 */
router.post('/:id/match-knowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await hotTopicService.matchKnowledge(id);
    res.json(result);
  } catch (error: any) {
    console.error('匹配知识库失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/hot-topics/:id/create-article
 * 基于热点创建文章
 */
router.post('/:id/create-article', async (req, res) => {
  try {
    const { id } = req.params;
    const { platform, column, userId } = req.body;

    if (!platform || !column) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const article = await hotTopicService.createArticleFromTopic(
      id,
      platform,
      column,
      userId
    );

    res.json({ article });
  } catch (error: any) {
    console.error('创建文章失败:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
