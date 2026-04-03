import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';

// 使用 vi.hoisted 确保 mock 变量在使用前定义
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    publishRecord: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'test-id' }),
      update: vi.fn().mockResolvedValue({ id: 'test-id' }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    publishPlatform: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'test-id', name: 'wechat', displayName: '微信公众号' }),
      update: vi.fn().mockResolvedValue({ id: 'test-id' }),
      delete: vi.fn().mockResolvedValue({ id: 'test-id' }),
    },
    publishBatch: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'batch-id', totalCount: 2, pendingCount: 2 }),
      update: vi.fn().mockResolvedValue({ id: 'batch-id' }),
    },
    article: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}));

// Mock @prisma/client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

// Mock publish services
vi.mock('../services/publish/index.js', () => ({
  getPublisher: vi.fn(() => ({
    platformName: 'wechat',
    displayName: '微信公众号',
    supportedContentTypes: ['article'],
    validateConfig: vi.fn().mockResolvedValue({ valid: true }),
    refreshToken: vi.fn().mockResolvedValue({}),
    publish: vi.fn().mockResolvedValue({ success: true, platformPostId: 'post-123' }),
  })),
  getSupportedPlatforms: vi.fn().mockReturnValue([
    { name: 'wechat', displayName: '微信公众号', supportedContentTypes: ['article'] },
  ]),
  getPlatformConfig: vi.fn().mockResolvedValue({
    id: 'platform-1',
    name: 'wechat',
    displayName: '微信公众号',
    config: {},
  }),
  updatePlatformToken: vi.fn().mockResolvedValue(undefined),
  PlatformType: {},
  PublishContent: {},
}));

vi.mock('../services/publish/smartPublisher.js', () => ({
  SmartPublisher: vi.fn().mockImplementation(() => ({
    determinePublishMethod: vi.fn().mockResolvedValue({ method: 'api', reason: 'API available' }),
    extensionBridge: {
      getExtensionStatus: vi.fn().mockResolvedValue({ online: false }),
    },
  })),
}));

vi.mock('../services/publish/publishQueue.js', () => ({
  publishQueue: {
    startBatch: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../services/extension/taskQueue.js', () => ({
  ExtensionTaskQueue: vi.fn().mockImplementation(() => ({
    createTask: vi.fn().mockResolvedValue({ id: 'task-123' }),
  })),
}));

vi.mock('../services/websocket.js', () => ({
  websocketService: {
    publishBatchStatus: vi.fn(),
  },
}));

// Import after mocking
import { publishRouter } from './publish.js';

describe('Publish Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/publish', publishRouter);
    vi.clearAllMocks();
  });

  describe('GET /api/publish/stats', () => {
    it('应该返回统计数据', async () => {
      mockPrisma.publishRecord.count
        .mockResolvedValueOnce(1)  // pending
        .mockResolvedValueOnce(1)  // processing
        .mockResolvedValueOnce(5)   // published
        .mockResolvedValueOnce(2); // failed

      const response = await request(app).get('/api/publish/stats');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        pending: 1,
        processing: 1,
        published: 5,
        failed: 2,
      });
    });

    it('应该在出错时返回 500', async () => {
      mockPrisma.publishRecord.count.mockRejectedValue(new Error('DB error'));

      const response = await request(app).get('/api/publish/stats');

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/publish/platforms/supported', () => {
    it('应该返回支持的平台列表', async () => {
      const response = await request(app).get('/api/publish/platforms/supported');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/publish/platforms', () => {
    it('应该返回已配置的平台列表', async () => {
      mockPrisma.publishPlatform.findMany.mockResolvedValue([
        {
          id: '1',
          name: 'wechat',
          displayName: '微信公众号',
          accountName: '测试账号',
          accountAvatar: 'https://example.com/avatar.png',
          isEnabled: true,
          updatedAt: new Date(),
        },
      ]);

      const response = await request(app).get('/api/publish/platforms');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe('1');
    });
  });

  describe('GET /api/publish/platforms/:id', () => {
    it('应该返回平台配置', async () => {
      mockPrisma.publishPlatform.findUnique.mockResolvedValue({
        id: '1',
        name: 'wechat',
        displayName: '微信公众号',
        appId: 'app-id',
        accountName: '测试账号',
        accountAvatar: 'https://example.com/avatar.png',
        isEnabled: true,
      });

      const response = await request(app).get('/api/publish/platforms/1');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('1');
    });

    it('平台不存在时应该返回 404', async () => {
      mockPrisma.publishPlatform.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/publish/platforms/not-exist');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('平台不存在');
    });
  });

  describe('POST /api/publish/platforms', () => {
    it('新增时应该验证参数完整性', async () => {
      const response = await request(app)
        .post('/api/publish/platforms')
        .send({ name: 'wechat' }); // 缺少 appId 和 appSecret

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('完整');
    });

    it('成功创建平台配置', async () => {
      const response = await request(app)
        .post('/api/publish/platforms')
        .send({
          name: 'wechat',
          appId: 'test-app-id',
          appSecret: 'test-secret',
        });

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
    });
  });

  describe('DELETE /api/publish/platforms/:id', () => {
    it('成功删除平台配置', async () => {
      const response = await request(app).delete('/api/publish/platforms/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('PATCH /api/publish/platforms/:id/toggle', () => {
    it('切换启用状态', async () => {
      mockPrisma.publishPlatform.findUnique.mockResolvedValue({
        id: '1',
        isEnabled: false,
      });
      mockPrisma.publishPlatform.update.mockResolvedValue({
        id: '1',
        isEnabled: true,
      });

      const response = await request(app).patch('/api/publish/platforms/1/toggle');

      expect(response.status).toBe(200);
      expect(response.body.isEnabled).toBe(true);
    });

    it('平台不存在时返回 404', async () => {
      mockPrisma.publishPlatform.findUnique.mockResolvedValue(null);

      const response = await request(app).patch('/api/publish/platforms/not-exist/toggle');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/publish/single', () => {
    it('缺少必要参数时返回 400', async () => {
      const response = await request(app)
        .post('/api/publish/single')
        .send({ contentType: 'article' }); // 缺少其他参数

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('必要参数');
    });

    it('平台不存在时返回 404', async () => {
      const { getPlatformConfig } = await import('../services/publish/index.js');
      vi.mocked(getPlatformConfig).mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/publish/single')
        .send({
          contentType: 'article',
          contentId: 'article-1',
          platformId: 'platform-1',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('平台配置不存在');
    });

    it('内容不存在时返回 404', async () => {
      const { getPlatformConfig } = await import('../services/publish/index.js');
      vi.mocked(getPlatformConfig).mockResolvedValueOnce({
        id: 'platform-1',
        name: 'wechat',
        displayName: '微信公众号',
        config: {},
      });
      mockPrisma.article.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/publish/single')
        .send({
          contentType: 'article',
          contentId: 'article-1',
          platformId: 'platform-1',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('内容不存在');
    });

    it('成功发布时返回结果', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({
        id: 'article-1',
        title: '测试文章',
        content: '文章内容',
      });

      const response = await request(app)
        .post('/api/publish/single')
        .send({
          contentType: 'article',
          contentId: 'article-1',
          platformId: 'platform-1',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/publish/scheduled', () => {
    it('缺少必要参数时返回 400', async () => {
      const response = await request(app)
        .post('/api/publish/scheduled')
        .send({ contentType: 'article' });

      expect(response.status).toBe(400);
    });

    it('定时时间早于当前时间时返回 400', async () => {
      const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();

      const response = await request(app)
        .post('/api/publish/scheduled')
        .send({
          contentType: 'article',
          contentId: 'article-1',
          platformId: 'platform-1',
          scheduledAt: pastDate,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('晚于当前时间');
    });
  });

  describe('POST /api/publish/batch', () => {
    it('缺少必要参数时返回 400', async () => {
      const response = await request(app)
        .post('/api/publish/batch')
        .send({ contentType: 'article' });

      expect(response.status).toBe(400);
    });

    it('成功创建批量发布', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({
        id: 'article-1',
        title: '测试文章',
      });

      const response = await request(app)
        .post('/api/publish/batch')
        .send({
          contentType: 'article',
          contentIds: ['article-1'],
          platformIds: ['platform-1'],
        });

      expect(response.status).toBe(200);
      expect(response.body.batchId).toBeDefined();
    });
  });

  describe('GET /api/publish/batch/:id/progress', () => {
    it('批次不存在时返回 404', async () => {
      mockPrisma.publishBatch.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/publish/batch/batch-1/progress');

      expect(response.status).toBe(404);
    });

    it('成功返回进度', async () => {
      mockPrisma.publishBatch.findUnique.mockResolvedValue({
        id: 'batch-1',
        status: 'processing',
        totalCount: 10,
        pendingCount: 5,
        successCount: 3,
        failedCount: 2,
        createdAt: new Date(),
        completedAt: null,
      });
      mockPrisma.publishRecord.findMany.mockResolvedValue([]);

      const response = await request(app).get('/api/publish/batch/batch-1/progress');

      expect(response.status).toBe(200);
      expect(response.body.batch.status).toBe('processing');
    });
  });

  describe('POST /api/publish/batch/:id/cancel', () => {
    it('批次不存在时返回 404', async () => {
      mockPrisma.publishBatch.findUnique.mockResolvedValue(null);

      const response = await request(app).post('/api/publish/batch/batch-1/cancel');

      expect(response.status).toBe(404);
    });

    it('批次已完成时返回 400', async () => {
      mockPrisma.publishBatch.findUnique.mockResolvedValue({
        id: 'batch-1',
        status: 'completed',
      });

      const response = await request(app).post('/api/publish/batch/batch-1/cancel');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/publish/records', () => {
    it('成功返回记录列表', async () => {
      mockPrisma.publishRecord.findMany.mockResolvedValue([
        { id: '1', contentTitle: '文章1', platformName: '微信公众号', status: 'published' },
      ]);
      mockPrisma.publishRecord.count.mockResolvedValue(1);

      const response = await request(app).get('/api/publish/records');

      expect(response.status).toBe(200);
      expect(response.body.records).toHaveLength(1);
      expect(response.body.total).toBe(1);
    });

    it('支持状态筛选', async () => {
      const response = await request(app).get('/api/publish/records?status=published');

      expect(response.status).toBe(200);
      expect(mockPrisma.publishRecord.findMany).toHaveBeenCalled();
    });
  });

  describe('POST /api/publish/records/:id/retry', () => {
    it('记录不存在时返回 404', async () => {
      mockPrisma.publishRecord.findUnique.mockResolvedValue(null);

      const response = await request(app).post('/api/publish/records/1/retry');

      expect(response.status).toBe(404);
    });

    it('只能重试失败的记录', async () => {
      mockPrisma.publishRecord.findUnique.mockResolvedValue({
        id: '1',
        status: 'published',
      });

      const response = await request(app).post('/api/publish/records/1/retry');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('只能重试失败');
    });
  });

  describe('GET /api/publish/platforms/:id/capabilities', () => {
    it('平台不存在时返回 404', async () => {
      mockPrisma.publishPlatform.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/publish/platforms/1/capabilities');

      expect(response.status).toBe(404);
    });

    it('成功返回平台能力', async () => {
      mockPrisma.publishPlatform.findUnique.mockResolvedValue({
        id: '1',
        name: 'wechat',
        apiAvailable: true,
        extensionRequired: false,
      });

      const response = await request(app).get('/api/publish/platforms/1/capabilities');

      expect(response.status).toBe(200);
      expect(response.body.apiAvailable).toBe(true);
    });
  });

  describe('POST /api/publish/smart', () => {
    it('缺少必要参数时返回 400', async () => {
      const response = await request(app)
        .post('/api/publish/smart')
        .send({ contentType: 'article' });

      expect(response.status).toBe(400);
    });

    it('平台不存在时返回 404', async () => {
      mockPrisma.publishPlatform.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/publish/smart')
        .send({
          contentType: 'article',
          contentId: 'article-1',
          platformId: 'platform-1',
        });

      expect(response.status).toBe(404);
    });

    it('成功返回智能发布决策', async () => {
      mockPrisma.publishPlatform.findUnique.mockResolvedValue({
        id: 'platform-1',
        name: 'wechat',
        displayName: '微信公众号',
      });
      mockPrisma.article.findUnique.mockResolvedValue({
        id: 'article-1',
        title: '测试文章',
      });

      const response = await request(app)
        .post('/api/publish/smart')
        .send({
          contentType: 'article',
          contentId: 'article-1',
          platformId: 'platform-1',
        });

      expect(response.status).toBe(200);
      expect(response.body.publishMethod).toBeDefined();
      expect(response.body.reason).toBeDefined();
    });
  });
});
