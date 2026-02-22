/**
 * AI 统计 API 路由
 */

import { Router } from 'express';
import { getAIStats, getRecentLogs } from '../services/ai-logger';

const router = Router();

// 获取 AI 使用统计
router.get('/stats', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const stats = await getAIStats(days);
    res.json(stats);
  } catch (error) {
    console.error('获取 AI 统计失败:', error);
    res.status(500).json({ error: '获取统计失败' });
  }
});

// 获取最近调用记录
router.get('/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = await getRecentLogs(limit);
    res.json(logs);
  } catch (error) {
    console.error('获取 AI 日志失败:', error);
    res.status(500).json({ error: '获取日志失败' });
  }
});

export default router;
