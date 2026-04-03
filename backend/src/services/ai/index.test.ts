import { describe, it, expect, vi, beforeEach } from 'vitest';

// 使用 vi.hoisted 确保 mock 变量在使用前定义
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    aIServiceConfig: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    aICallLog: {
      findMany: vi.fn(),
    },
    contentMetrics: {
      findMany: vi.fn(),
    },
  },
}));

// Mock @prisma/client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

// Mock ai-logger
vi.mock('../ai-logger.js', () => ({
  checkBudget: vi.fn().mockResolvedValue({ allowed: true }),
  logAICall: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocking
import { 
  getDefaultAIConfig, 
  getAIConfig, 
  getAIConfigOrDefault, 
  getAllAIConfigs,
  createAIService,
  createAIServiceWithBudget,
  getAIConfigByTaskType,
  getWebSearchAIConfig,
  SmartRouter,
  type AIServiceConfig,
  type AITaskType,
} from './index.js';

describe('AI Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDefaultAIConfig', () => {
    it('应该返回默认启用的 AI 配置', async () => {
      const mockConfig = {
        id: '1',
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
        baseUrl: 'https://api.openai.com',
        isDefault: true,
        isEnabled: true,
      };
      
      mockPrisma.aIServiceConfig.findFirst.mockResolvedValue(mockConfig);
      
      const config = await getDefaultAIConfig();
      
      expect(config).toEqual({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
        baseUrl: 'https://api.openai.com',
      });
    });

    it('当没有默认配置时应该返回任意启用的配置', async () => {
      mockPrisma.aIServiceConfig.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: '2',
          provider: 'claude',
          apiKey: 'claude-key',
          model: 'claude-3',
          isDefault: false,
          isEnabled: true,
        });
      
      const config = await getDefaultAIConfig();
      
      expect(config?.provider).toBe('claude');
    });

    it('当没有启用配置时应该返回 null', async () => {
      mockPrisma.aIServiceConfig.findFirst.mockResolvedValue(null);
      
      const config = await getDefaultAIConfig();
      
      expect(config).toBeNull();
    });
  });

  describe('getAIConfig', () => {
    it('应该根据 ID 返回对应的 AI 配置', async () => {
      mockPrisma.aIServiceConfig.findUnique.mockResolvedValue({
        id: '1',
        provider: 'deepseek',
        apiKey: 'deepseek-key',
        model: 'deepseek-chat',
        isEnabled: true,
      });
      
      const config = await getAIConfig('1');
      
      expect(config?.provider).toBe('deepseek');
      expect(config?.model).toBe('deepseek-chat');
    });

    it('当配置不存在时应该返回 null', async () => {
      mockPrisma.aIServiceConfig.findUnique.mockResolvedValue(null);
      
      const config = await getAIConfig('non-existent');
      
      expect(config).toBeNull();
    });
  });

  describe('getAIConfigOrDefault', () => {
    it('当传入 serviceId 时应该返回对应配置', async () => {
      mockPrisma.aIServiceConfig.findUnique.mockResolvedValue({
        id: '1',
        provider: 'kimi',
        apiKey: 'kimi-key',
        model: 'kimi-chat',
        isEnabled: true,
      });
      
      const config = await getAIConfigOrDefault('1');
      
      expect(config?.provider).toBe('kimi');
    });

    it('当未传入 serviceId 时应该返回默认配置', async () => {
      mockPrisma.aIServiceConfig.findFirst.mockResolvedValue({
        id: '2',
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
        isDefault: true,
        isEnabled: true,
      });
      
      const config = await getAIConfigOrDefault();
      
      expect(config?.provider).toBe('openai');
    });
  });

  describe('getAllAIConfigs', () => {
    it('应该返回所有启用的 AI 配置列表', async () => {
      mockPrisma.aIServiceConfig.findMany.mockResolvedValue([
        {
          id: '1',
          name: 'OpenAI',
          provider: 'openai',
          model: 'gpt-4',
          isDefault: true,
          isEnabled: true,
        },
        {
          id: '2',
          name: 'Kimi',
          provider: 'kimi',
          model: 'kimi-chat',
          isDefault: false,
          isEnabled: true,
        },
      ]);
      
      const configs = await getAllAIConfigs();
      
      expect(configs).toHaveLength(2);
      expect(configs[0]).toEqual({
        id: '1',
        name: 'OpenAI',
        provider: 'openai',
        model: 'gpt-4',
        supportsWebSearch: false,
        isDefault: true,
      });
      expect(configs[1]).toEqual({
        id: '2',
        name: 'Kimi',
        provider: 'kimi',
        model: 'kimi-chat',
        supportsWebSearch: true,
        isDefault: false,
      });
    });
  });

  describe('createAIService', () => {
    it('应该为 openai 创建正确的服务实例', () => {
      const config: AIServiceConfig = {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      };
      
      const service = createAIService(config);
      
      expect(service).toBeDefined();
      expect(typeof service.chat).toBe('function');
      expect(typeof service.generateContent).toBe('function');
      expect(typeof service.summarize).toBe('function');
    });

    it('应该为 claude 创建正确的服务实例', () => {
      const config: AIServiceConfig = {
        provider: 'claude',
        apiKey: 'test-key',
        model: 'claude-3',
      };
      
      const service = createAIService(config);
      
      expect(service).toBeDefined();
      expect(typeof service.chat).toBe('function');
    });

    it('应该为 deepseek 创建正确的服务实例', () => {
      const config: AIServiceConfig = {
        provider: 'deepseek',
        apiKey: 'test-key',
        model: 'deepseek-chat',
      };
      
      const service = createAIService(config);
      
      expect(service).toBeDefined();
    });

    it('应该为 kimi 创建正确的服务实例', () => {
      const config: AIServiceConfig = {
        provider: 'kimi',
        apiKey: 'test-key',
        model: 'kimi-chat',
      };
      
      const service = createAIService(config);
      
      expect(service).toBeDefined();
      expect(service.supportsWebSearch()).toBe(true);
    });

    it('应该为不支持的 provider 抛出错误', () => {
      const config: AIServiceConfig = {
        provider: 'unknown',
        apiKey: 'test-key',
        model: 'test-model',
      };
      
      expect(() => createAIService(config)).toThrow('不支持的 AI 服务: unknown');
    });
  });

  describe('createAIServiceWithBudget', () => {
    it('应该在预算内创建带预算守卫的服务', async () => {
      // 确保 budget check 返回允许
      const { checkBudget } = await import('../ai-logger.js');
      vi.mocked(checkBudget).mockResolvedValueOnce({ 
        allowed: true,
        dailyUsed: 10,
        dailyLimit: 100,
        monthlyUsed: 50,
        monthlyLimit: 1000,
      });
      
      const config: AIServiceConfig = {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      };
      
      const service = await createAIServiceWithBudget(config, 'test-feature');
      
      expect(service).toBeDefined();
      expect(typeof service.chat).toBe('function');
    });

    it('应该在预算超限时抛出错误', async () => {
      // 确保 budget check 返回不允许
      const { checkBudget } = await import('../ai-logger.js');
      vi.mocked(checkBudget).mockResolvedValueOnce({ 
        allowed: false, 
        dailyUsed: 100,
        dailyLimit: 100,
        monthlyUsed: 1000,
        monthlyLimit: 1000,
        warning: '预算已用完',
      });
      
      const config: AIServiceConfig = {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      };
      
      await expect(createAIServiceWithBudget(config)).rejects.toThrow('AI 预算超限');
    });
  });

  describe('getAIConfigByTaskType', () => {
    it('时事写作任务应该返回支持联网搜索的 AI', async () => {
      mockPrisma.aIServiceConfig.findMany.mockResolvedValue([
        { id: '1', provider: 'openai', apiKey: 'key', model: 'gpt-4', isEnabled: true },
        { id: '2', provider: 'kimi', apiKey: 'key', model: 'kimi', isEnabled: true },
      ]);
      
      const config = await getAIConfigByTaskType('news_writing');
      
      // 优先选择 kimi（支持联网搜索）
      expect(config?.provider).toBe('kimi');
    });

    it('深度分析任务应该优先选择 claude', async () => {
      mockPrisma.aIServiceConfig.findMany.mockResolvedValue([
        { id: '1', provider: 'openai', apiKey: 'key', model: 'gpt-4', isEnabled: true },
        { id: '2', provider: 'claude', apiKey: 'key', model: 'claude-3', isEnabled: true },
      ]);
      
      const config = await getAIConfigByTaskType('deep_analysis');
      
      expect(config?.provider).toBe('claude');
    });

    it('摘要任务应该优先选择 deepseek', async () => {
      mockPrisma.aIServiceConfig.findMany.mockResolvedValue([
        { id: '1', provider: 'openai', apiKey: 'key', model: 'gpt-4', isEnabled: true },
        { id: '2', provider: 'deepseek', apiKey: 'key', model: 'deepseek-chat', isEnabled: true },
      ]);
      
      const config = await getAIConfigByTaskType('summarize');
      
      expect(config?.provider).toBe('deepseek');
    });

    it('当没有匹配偏好时应该回退到默认', async () => {
      mockPrisma.aIServiceConfig.findMany.mockResolvedValue([
        { id: '1', provider: 'openai', apiKey: 'key', model: 'gpt-4', isDefault: true, isEnabled: true },
      ]);
      
      const config = await getAIConfigByTaskType('news_writing');
      
      expect(config?.provider).toBe('openai');
    });
  });

  describe('getWebSearchAIConfig', () => {
    it('应该返回支持联网搜索的配置', async () => {
      mockPrisma.aIServiceConfig.findMany.mockResolvedValue([
        { id: '1', provider: 'openai', apiKey: 'key', model: 'gpt-4', isEnabled: true },
        { id: '2', provider: 'kimi', apiKey: 'key', model: 'kimi', isDefault: true, isEnabled: true },
      ]);
      
      const config = await getWebSearchAIConfig();
      
      expect(config?.provider).toBe('kimi');
    });
  });

  describe('SmartRouter', () => {
    it('getBestConfig 应该返回最优配置', async () => {
      mockPrisma.aIServiceConfig.findMany.mockResolvedValue([
        { id: '1', provider: 'openai', apiKey: 'key', model: 'gpt-4', isEnabled: true },
        { id: '2', provider: 'claude', apiKey: 'key', model: 'claude-3', isDefault: true, isEnabled: true },
      ]);
      
      mockPrisma.aICallLog.findMany.mockResolvedValue([
        { provider: 'openai', model: 'gpt-4', latencyMs: 100, status: 'success' },
        { provider: 'claude', model: 'claude-3', latencyMs: 200, status: 'success' },
      ]);
      
      const config = await SmartRouter.getBestConfig('general');
      
      expect(config).toBeDefined();
    });

    it('getBestConfig 应该在首选失败时降级', async () => {
      mockPrisma.aIServiceConfig.findMany.mockResolvedValue([
        { id: '1', provider: 'openai', apiKey: 'key', model: 'gpt-4', isEnabled: true },
        { id: '2', provider: 'claude', apiKey: 'key', model: 'claude-3', isDefault: true, isEnabled: true },
      ]);
      
      // 模拟高错误率
      const errorLogs = Array(10).fill(null).map(() => ({
        provider: 'openai',
        model: 'gpt-4',
        latencyMs: 100,
        status: 'error',
      }));
      mockPrisma.aICallLog.findMany.mockResolvedValue(errorLogs);
      
      const config = await SmartRouter.getBestConfig('general');
      
      // 应该降级到默认
      expect(config?.provider).toBe('claude');
    });

    it('createServiceWithFallback 应该创建带自动降级的服务', async () => {
      // 确保预算检查通过
      const { checkBudget } = await import('../ai-logger.js');
      vi.mocked(checkBudget).mockResolvedValue({ 
        allowed: true,
        dailyUsed: 10,
        dailyLimit: 100,
        monthlyUsed: 50,
        monthlyLimit: 1000,
      });
      
      mockPrisma.aIServiceConfig.findMany.mockResolvedValue([
        { id: '1', provider: 'openai', apiKey: 'key', model: 'gpt-4', isEnabled: true },
        { id: '2', provider: 'claude', apiKey: 'key', model: 'claude-3', isDefault: true, isEnabled: true },
      ]);
      
      mockPrisma.aICallLog.findMany.mockResolvedValue([]);
      
      const service = await SmartRouter.createServiceWithFallback('general', 'test');
      
      expect(service).toBeDefined();
      expect(typeof service.chat).toBe('function');
    });
  });
});
