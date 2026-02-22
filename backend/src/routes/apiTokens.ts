import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import crypto from 'crypto';

const prisma = new PrismaClient();
export const apiTokensRouter = Router();

// 所有令牌管理路由都需要登录
apiTokensRouter.use(requireAuth);

// 生成随机令牌
function generateToken(): string {
  return 'tk_' + crypto.randomBytes(32).toString('hex');
}

// 获取令牌列表
apiTokensRouter.get('/', async (req, res) => {
  try {
    const tokens = await prisma.apiToken.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        token: true,
        permissions: true,
        rateLimit: true,
        isEnabled: true,
        expiresAt: true,
        lastUsedAt: true,
        usageCount: true,
        createdAt: true,
      },
    });

    // 隐藏部分令牌
    const maskedTokens = tokens.map(t => ({
      ...t,
      token: t.token.substring(0, 10) + '...' + t.token.substring(t.token.length - 4),
    }));

    res.json(maskedTokens);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 创建令牌
apiTokensRouter.post('/', async (req, res) => {
  try {
    const { name, permissions = ['read'], rateLimit = 1000, expiresAt } = req.body;

    if (!name) {
      return res.status(400).json({ error: '令牌名称不能为空' });
    }

    const token = await prisma.apiToken.create({
      data: {
        name,
        token: generateToken(),
        permissions: JSON.stringify(permissions),
        rateLimit,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    res.status(201).json(token);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 更新令牌
apiTokensRouter.put('/:id', async (req, res) => {
  try {
    const { name, permissions, rateLimit, isEnabled, expiresAt } = req.body;

    const token = await prisma.apiToken.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(permissions && { permissions: JSON.stringify(permissions) }),
        ...(rateLimit !== undefined && { rateLimit }),
        ...(isEnabled !== undefined && { isEnabled }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      },
    });

    res.json(token);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 删除令牌
apiTokensRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.apiToken.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 重新生成令牌
apiTokensRouter.post('/:id/regenerate', async (req, res) => {
  try {
    const token = await prisma.apiToken.update({
      where: { id: req.params.id },
      data: { token: generateToken() },
    });
    res.json(token);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
