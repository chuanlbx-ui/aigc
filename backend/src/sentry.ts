/**
 * Sentry 错误追踪配置 - 后端
 */

import * as Sentry from '@sentry/node';
import { Express, Request, Response, NextFunction } from 'express';

export function initSentry(app: Express) {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.log('[Sentry] DSN 未配置，跳过初始化');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });

  console.log('[Sentry] 后端初始化完成');
}

// 错误处理中间件（需在路由之后调用）
export function setupSentryErrorHandler(app: Express) {
  if (!process.env.SENTRY_DSN) return;

  // 自定义错误响应
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    Sentry.captureException(err);
    console.error('[Error]', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  });
}

export { Sentry };
