/**
 * AI 模型数据源配置
 * 集中管理所有支持的 AI 提供商和模型列表
 */

export interface AIModel {
  id: string;
  name: string;
  description?: string;
  contextWindow?: number;
}

export interface AIProvider {
  id: string;
  name: string;
  supportsWebSearch: boolean;
  models: AIModel[];
}

export const AI_PROVIDERS: Record<string, AIProvider> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    supportsWebSearch: false,
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: '最新多模态模型', contextWindow: 128000 },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: '轻量级版本', contextWindow: 128000 },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: '高性能版本', contextWindow: 128000 },
      { id: 'gpt-4', name: 'GPT-4', description: '标准版本', contextWindow: 8192 },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: '快速经济', contextWindow: 16385 },
    ],
  },
  claude: {
    id: 'claude',
    name: 'Claude (Anthropic)',
    supportsWebSearch: false,
    models: [
      { id: 'claude-opus-4-5', name: 'Claude Opus 4.5', description: '最强推理能力', contextWindow: 200000 },
      { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', description: '平衡性能', contextWindow: 200000 },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: '高性能版本', contextWindow: 200000 },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: '强大推理', contextWindow: 200000 },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: '平衡选择', contextWindow: 200000 },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: '快速响应', contextWindow: 200000 },
    ],
  },
  kimi: {
    id: 'kimi',
    name: 'Kimi (月之暗面)',
    supportsWebSearch: true,
    models: [
      { id: 'moonshot-v1-8k', name: 'Kimi 8K', description: '标准上下文', contextWindow: 8000 },
      { id: 'moonshot-v1-32k', name: 'Kimi 32K', description: '长上下文', contextWindow: 32000 },
      { id: 'moonshot-v1-128k', name: 'Kimi 128K', description: '超长上下文', contextWindow: 128000 },
    ],
  },
  qwen: {
    id: 'qwen',
    name: '通义千问 (阿里云)',
    supportsWebSearch: true,
    models: [
      { id: 'qwen-max', name: '通义千问 Max', description: '最强性能', contextWindow: 30000 },
      { id: 'qwen-plus', name: '通义千问 Plus', description: '平衡性能', contextWindow: 30000 },
      { id: 'qwen-turbo', name: '通义千问 Turbo', description: '快速响应', contextWindow: 8000 },
      { id: 'qwen-long', name: '通义千问 Long', description: '超长文本', contextWindow: 1000000 },
    ],
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    supportsWebSearch: false,
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', description: '对话模型', contextWindow: 32000 },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', description: '代码专用', contextWindow: 16000 },
    ],
  },
  doubao: {
    id: 'doubao',
    name: '豆包 (字节跳动)',
    supportsWebSearch: false,
    models: [
      { id: 'doubao-pro-32k', name: '豆包 Pro 32K', description: '专业版', contextWindow: 32000 },
      { id: 'doubao-lite-32k', name: '豆包 Lite 32K', description: '轻量版', contextWindow: 32000 },
    ],
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter (统一网关)',
    supportsWebSearch: false,
    models: [
      { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'OpenAI 最新多模态', contextWindow: 128000 },
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', description: '快速经济', contextWindow: 128000 },
      { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Anthropic 平衡性能', contextWindow: 200000 },
      { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4', description: 'Anthropic 最强推理', contextWindow: 200000 },
      { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', description: 'Google 最新快速模型', contextWindow: 1000000 },
      { id: 'google/gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro', description: 'Google 最强模型', contextWindow: 1000000 },
      { id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek V3', description: '高性价比', contextWindow: 64000 },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', description: '深度推理', contextWindow: 64000 },
      { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', description: 'Meta 开源最新', contextWindow: 1000000 },
      { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', description: '通义千问开源版', contextWindow: 32000 },
    ],
  },
};

/**
 * 获取所有提供商列表
 */
export function getAllProviders(): AIProvider[] {
  return Object.values(AI_PROVIDERS);
}

/**
 * 获取指定提供商的信息
 */
export function getProvider(providerId: string): AIProvider | undefined {
  return AI_PROVIDERS[providerId];
}

/**
 * 获取指定提供商的模型列表
 */
export function getProviderModels(providerId: string): AIModel[] {
  const provider = AI_PROVIDERS[providerId];
  return provider ? provider.models : [];
}

/**
 * 检查提供商是否支持联网搜索
 */
export function supportsWebSearch(providerId: string): boolean {
  const provider = AI_PROVIDERS[providerId];
  return provider ? provider.supportsWebSearch : false;
}
