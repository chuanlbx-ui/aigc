import pino from 'pino';

// 获取环境变量
const env = process.env.NODE_ENV || 'development';

// 根据环境配置日志选项
const loggerOptions: pino.LoggerOptions = {
  level: env === 'production' ? 'info' : 'debug',
  // 生产环境使用 JSON 格式输出，方便日志收集
  formatters: {
    log: (obj) => {
      // 添加时间戳和服务标识
      return {
        ...obj,
        service: 'video-mixer-backend',
        env,
      };
    },
  },
};

// 开发环境添加美化输出
if (env === 'development') {
  loggerOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  };
}

// 创建并导出统一的 logger 实例
export const logger = pino(loggerOptions);

// 创建带上下文的子日志器
export function createChildLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}

export default logger;
