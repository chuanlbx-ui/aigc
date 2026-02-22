/**
 * 租户管理 API
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// 获取所有租户
router.get('/', async (_req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ error: '获取租户失败' });
  }
});

// 获取单个租户
router.get('/:id', async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
    });
    if (!tenant) {
      return res.status(404).json({ error: '租户不存在' });
    }
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: '获取租户失败' });
  }
});

// 创建租户
router.post('/', async (req, res) => {
  try {
    const { name, slug, domain, plan } = req.body;
    const tenant = await prisma.tenant.create({
      data: { name, slug, domain, plan: plan || 'free' },
    });
    res.json(tenant);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '标识或域名已存在' });
    }
    res.status(500).json({ error: '创建失败' });
  }
});

// 更新租户
router.put('/:id', async (req, res) => {
  try {
    const { name, plan, isActive } = req.body;
    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: { name, plan, isActive },
    });
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: '更新失败' });
  }
});

// 获取租户配额使用情况
router.get('/:id/quota', async (req, res) => {
  try {
    const { id } = req.params;

    // 获取租户和套餐信息
    const tenant = await prisma.tenant.findUnique({
      where: { id },
    });
    if (!tenant) {
      return res.status(404).json({ error: '租户不存在' });
    }

    const plan = await prisma.plan.findUnique({
      where: { name: tenant.plan },
    });

    // 获取当月用量
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const usage = await prisma.usageRecord.groupBy({
      by: ['type'],
      where: {
        tenantId: id,
        date: { gte: startOfMonth },
      },
      _sum: { amount: true },
    });

    // 构建配额对比数据
    const usageMap: Record<string, number> = {};
    usage.forEach(u => {
      usageMap[u.type] = u._sum.amount || 0;
    });

    res.json({
      plan: tenant.plan,
      limits: plan ? {
        article: plan.articleLimit,
        video_minutes: plan.videoMinutes,
        ai_call: plan.aiCallLimit,
        storage_mb: plan.storageGb * 1024,
      } : null,
      usage: {
        article: usageMap['article'] || 0,
        video_minutes: usageMap['video_minutes'] || 0,
        ai_call: usageMap['ai_call'] || 0,
        storage_mb: usageMap['storage_mb'] || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ error: '获取配额失败' });
  }
});

// 更新租户配置
router.put('/:id/config', async (req, res) => {
  try {
    const { id } = req.params;
    const { config } = req.body;

    const tenant = await prisma.tenant.update({
      where: { id },
      data: { config: JSON.stringify(config) },
    });
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: '更新配置失败' });
  }
});

export default router;
