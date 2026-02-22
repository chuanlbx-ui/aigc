/**
 * 租户隔离中间件
 * 从请求中提取 tenantId 并注入到 req 对象
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenant?: {
        id: string;
        name: string;
        plan: string;
        config: any;
      };
    }
  }
}

/**
 * 租户中间件 - 从用户会话中提取租户信息
 */
export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // 从已认证的用户中获取 tenantId
    const user = (req as any).user;

    if (user?.tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: {
          id: true,
          name: true,
          plan: true,
          config: true,
          isActive: true,
        },
      });

      if (tenant && tenant.isActive) {
        req.tenantId = tenant.id;
        req.tenant = {
          id: tenant.id,
          name: tenant.name,
          plan: tenant.plan,
          config: JSON.parse(tenant.config || '{}'),
        };
      }
    }

    // 也支持从 header 中获取（用于 API 调用）
    const headerTenantId = req.headers['x-tenant-id'] as string;
    if (headerTenantId && !req.tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: headerTenantId },
        select: {
          id: true,
          name: true,
          plan: true,
          config: true,
          isActive: true,
        },
      });

      if (tenant && tenant.isActive) {
        req.tenantId = tenant.id;
        req.tenant = {
          id: tenant.id,
          name: tenant.name,
          plan: tenant.plan,
          config: JSON.parse(tenant.config || '{}'),
        };
      }
    }

    next();
  } catch (error) {
    console.error('[TenantMiddleware] Error:', error);
    next();
  }
}

/**
 * 强制要求租户的中间件
 */
export function requireTenant(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.tenantId) {
    return res.status(403).json({ error: '需要租户上下文' });
  }
  next();
}

export default tenantMiddleware;
