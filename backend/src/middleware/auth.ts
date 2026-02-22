/**
 * 认证中间件
 */

import { Request, Response, NextFunction } from 'express';
import { validateToken } from '../services/auth.js';

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        tenantId?: string | null;
      };
    }
  }
}

/**
 * 必须登录的中间件
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: '未登录' });
    }

    const user = await validateToken(token);
    if (!user) {
      return res.status(401).json({ error: '登录已过期' });
    }

    req.user = user;
    next();
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
}

/**
 * 可选登录的中间件
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const user = await validateToken(token);
      if (user) {
        req.user = user;
      }
    }

    next();
  } catch {
    next();
  }
}
