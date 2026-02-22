/**
 * 计费 API 路由
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { getMonthlyUsage, getPlanLimits } from '../services/usage';

const router = Router();
const prisma = new PrismaClient();

// 获取所有套餐
router.get('/plans', async (_req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: '获取套餐失败' });
  }
});

// 获取租户用量
router.get('/usage/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const usage = await getMonthlyUsage(tenantId);
    res.json(usage);
  } catch (error) {
    res.status(500).json({ error: '获取用量失败' });
  }
});

// 获取用量与限制对比
router.get('/quota/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return res.status(404).json({ error: '租户不存在' });
    }

    const usage = await getMonthlyUsage(tenantId);
    const limits = await getPlanLimits(tenant.plan);

    res.json({
      usage,
      limits,
      plan: tenant.plan,
    });
  } catch (error) {
    res.status(500).json({ error: '获取配额失败' });
  }
});

export default router;
