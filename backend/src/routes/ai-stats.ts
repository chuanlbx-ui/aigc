/**
 * AI 统计 API 路由
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { getAIStats, getRecentLogs, checkBudget } from '../services/ai-logger.js';

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

// 获取预算状态
router.get('/budget', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const result = await checkBudget(tenantId);
    res.json(result);
  } catch (error) {
    console.error('获取预算状态失败:', error);
    res.status(500).json({ error: '获取预算状态失败' });
  }
});

// 设置预算配置
router.post('/budget', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { dailyLimitUsd, monthlyLimitUsd, perCallLimitUsd, warningThreshold } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: '需要租户信息' });
    }

    const db = new PrismaClient();

    try {
      const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) {
        return res.status(404).json({ error: '租户不存在' });
      }

      const currentConfig = typeof tenant.config === 'string'
        ? JSON.parse(tenant.config || '{}')
        : (tenant.config || {}) as Record<string, any>;

      currentConfig.aiBudget = {
        ...(currentConfig.aiBudget || {}),
        ...(dailyLimitUsd !== undefined && { dailyLimitUsd }),
        ...(monthlyLimitUsd !== undefined && { monthlyLimitUsd }),
        ...(perCallLimitUsd !== undefined && { perCallLimitUsd }),
        ...(warningThreshold !== undefined && { warningThreshold }),
      };

      await db.tenant.update({
        where: { id: tenantId },
        data: { config: currentConfig },
      });

      res.json({ success: true, budget: currentConfig.aiBudget });
    } finally {
      await db.$disconnect();
    }
  } catch (error) {
    console.error('设置预算失败:', error);
    res.status(500).json({ error: '设置预算失败' });
  }
});

export default router;
