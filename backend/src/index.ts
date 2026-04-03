import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initSentry, setupSentryErrorHandler } from './sentry.js';
import path from 'path';
import { projectRouter } from './routes/project.js';
import { assetRouter } from './routes/asset.js';
import { taskRouter } from './routes/task.js';
import { ttsRouter } from './routes/tts.js';
import { voiceCloneRouter } from './routes/voice-clone.js';
import { popupTemplateRouter } from './routes/popupTemplate.js';
import { knowledgeRouter } from './routes/knowledge/index.js';
import { articleRouter } from './routes/article/index.js';
import { aiRouter as articleAiRouter } from './routes/article.js';
import templateRouter from './routes/template.js';
import aiStatsRouter from './routes/ai-stats.js';
import authRouter from './routes/auth.js';
import billingRouter from './routes/billing.js';
import tenantRouter from './routes/tenant.js';
import paymentRouter from './routes/payment.js';
import { publishRouter } from './routes/publish.js';
import { posterRouter } from './routes/poster.js';
import { extensionRouter } from './routes/extension.js';
import hotTopicsRouter from './routes/hotTopics.js';
import topicSuggestionsRouter from './routes/topicSuggestions.js';
import { aiRouter } from './routes/ai.js';
import { workflowTemplateRouter } from './routes/workflowTemplate.js';
import unifiedTemplateRouter from './routes/unifiedTemplate.js';
import templateBundleRouter from './routes/templateBundle.js';
import marketplaceRouter from './routes/marketplace.js';
import { imageServiceRouter } from './routes/image-service.js';
import { mediaServiceRouter } from './routes/media-service.js';
import { topicPagesRouter } from './routes/topicPages.js';
import { portalRouter } from './routes/portal.js';
import { openApiRouter } from './routes/openApi.js';
import { apiTokensRouter } from './routes/apiTokens.js';
import { PrismaClient } from '@prisma/client';
import { publishScheduler } from './services/publish/scheduler.js';
import { publishQueue } from './services/publish/publishQueue.js';
import { websocketService } from './services/websocket.js';
import { logger } from './services/logger.js';

const prisma = new PrismaClient();

const app = express();
const PORT = 3001;

// 初始化 Sentry 错误追踪
initSentry(app);

// CORS 必须在静态文件服务之前
app.use(cors());

// 静态文件服务：提供 public/generated 目录访问
const generatedDir = path.resolve(process.cwd(), '..', '..', 'public', 'generated');
logger.info(`[静态文件] generated 目录: ${generatedDir}`);
app.use('/generated', express.static(generatedDir));

// 静态文件服务：提供智能配图目录访问
const smartImagesDir = path.resolve(process.cwd(), 'uploads', 'smart-images');
logger.info(`[静态文件] smart-images 目录: ${smartImagesDir}`);
app.use('/uploads/smart-images', express.static(smartImagesDir));

// 静态文件服务：提供海报目录访问
const postersDir = path.resolve(process.cwd(), 'uploads', 'posters');
logger.info(`[静态文件] posters 目录: ${postersDir}`);
app.use('/uploads/posters', express.static(postersDir));

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// API 路由
app.use('/api/projects', projectRouter);
app.use('/api/assets', assetRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/tts', ttsRouter);
app.use('/api/voice-clone', voiceCloneRouter);
app.use('/api/popup-templates', popupTemplateRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api/articles', articleRouter);
app.use('/api/articles', articleAiRouter);
app.use('/api/templates', templateRouter);
app.use('/api/ai-stats', aiStatsRouter);
app.use('/api/auth', authRouter);
app.use('/api/billing', billingRouter);
app.use('/api/tenants', tenantRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/publish', publishRouter);
app.use('/api/posters', posterRouter);
app.use('/api/extension', extensionRouter);
app.use('/api/hot-topics', hotTopicsRouter);
app.use('/api/topic-suggestions', topicSuggestionsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/workflow-templates', workflowTemplateRouter);
app.use('/api/unified-templates', unifiedTemplateRouter);
app.use('/api/template-bundles', templateBundleRouter);
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/image-services', imageServiceRouter);
app.use('/api/media-services', mediaServiceRouter);
app.use('/api/topic-pages', topicPagesRouter);
app.use('/api/portal', portalRouter);
app.use('/api/open', openApiRouter);
app.use('/api/api-tokens', apiTokensRouter);

// 健康检查
app.get('/api/health', async (_, res) => {
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};
  const startTime = Date.now();

  // 数据库检查
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok', latency: Date.now() - dbStart };
  } catch (error: any) {
    checks.database = { status: 'error', error: error.message };
  }

  // 内存使用
  const memUsage = process.memoryUsage();
  checks.memory = {
    status: memUsage.heapUsed < 500 * 1024 * 1024 ? 'ok' : 'warning',
    latency: Math.round(memUsage.heapUsed / 1024 / 1024),
  };

  // 总体状态
  const allOk = Object.values(checks).every(c => c.status === 'ok');

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'healthy' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    responseTime: Date.now() - startTime,
    checks,
  });
});

// Sentry 错误处理中间件（必须在路由之后）
setupSentryErrorHandler(app);

// 数据库连接检测函数
async function checkDatabaseConnection() {
  const dbUrl = process.env.DATABASE_URL || '未配置';
  // 隐藏密码
  const maskedUrl = dbUrl.replace(/:\/\/[^:]+:([^@]+)@/, '://***:***@');
  
  logger.info(`[数据库] 连接地址: ${maskedUrl}`);
  
  try {
    // 测试连接
    await prisma.$queryRaw`SELECT 1`;
    logger.info('[数据库] 连接状态: ✅ 连接成功');
    return true;
  } catch (error: any) {
    logger.error(`[数据库] 连接状态: ❌ 连接失败`);
    logger.error(`[数据库] 错误信息: ${error.message}`);
    return false;
  }
}

const server = app.listen(PORT, async () => {
  logger.info(`后端服务运行在 http://localhost:${PORT}`);
  
  // 检测数据库连接
  await checkDatabaseConnection();

  // 启动定时发布调度器
  publishScheduler.start();
  await publishQueue.recoverProcessingBatches();
});

websocketService.init(server);

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到 SIGTERM 信号，正在关闭服务...');
  publishScheduler.stop();
  websocketService.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('收到 SIGINT 信号，正在关闭服务...');
  publishScheduler.stop();
  websocketService.close();
  process.exit(0);
});
