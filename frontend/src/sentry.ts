/**
 * Sentry 错误追踪配置
 */

import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.log('[Sentry] DSN 未配置，跳过初始化');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,

    // 采样率配置
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // 忽略常见的非关键错误
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Network request failed',
      'Load failed',
    ],

    // 发送前处理
    beforeSend(event) {
      // 过滤敏感信息
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
      }
      return event;
    },
  });

  console.log('[Sentry] 初始化完成');
}

// 导出 Sentry 实例供手动上报使用
export { Sentry };
