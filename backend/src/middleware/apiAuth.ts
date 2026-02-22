import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 扩展 Request 类型
declare global {
  namespace Express {
    interface Request {
      apiToken?: {
        id: string;
        name: string;
        permissions: string[];
      };
    }
  }
}

/**
 * API Token 鉴权中间件
 */
export async function requireApiToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers['x-api-token'] as string;

    if (!token) {
      return res.status(401).json({ error: '缺少 API Token' });
    }

    const apiToken = await prisma.apiToken.findUnique({
      where: { token },
    });

    if (!apiToken) {
      return res.status(401).json({ error: '无效的 API Token' });
    }

    if (!apiToken.isEnabled) {
      return res.status(403).json({ error: 'API Token 已禁用' });
    }

    // 检查过期时间
    if (apiToken.expiresAt && new Date() > apiToken.expiresAt) {
      return res.status(403).json({ error: 'API Token 已过期' });
    }

    // 更新使用统计
    await prisma.apiToken.update({
      where: { id: apiToken.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 },
      },
    });

    // 解析权限
    let permissions: string[] = [];
    try {
      permissions = JSON.parse(apiToken.permissions);
    } catch {
      permissions = ['read'];
    }

    // 附加到请求对象
    req.apiToken = {
      id: apiToken.id,
      name: apiToken.name,
      permissions,
    };

    next();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
