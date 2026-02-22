import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 向量维度（DeepSeek 使用 1536 维）
export const EMBEDDING_DIMENSION = 1536;

// Embedding 服务配置接口
export interface EmbeddingConfig {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

// Embedding 服务接口
export interface EmbeddingService {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

// DeepSeek Embedding 服务实现
export class DeepSeekEmbeddingService implements EmbeddingService {
  private config: EmbeddingConfig;

  constructor(config: EmbeddingConfig) {
    this.config = config;
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const baseUrl = this.config.baseUrl || 'https://api.deepseek.com/v1';
    const model = this.config.model || 'deepseek-chat';

    const response = await fetch(`${baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: texts,
        encoding_format: 'float',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek Embedding API 错误: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.data.map((item: any) => item.embedding);
  }
}

// 获取 DeepSeek 配置（从 AI 服务配置中查找）
export async function getEmbeddingConfig(): Promise<EmbeddingConfig | null> {
  const config = await prisma.aIServiceConfig.findFirst({
    where: { provider: 'deepseek', isEnabled: true },
  });

  if (!config) return null;

  return {
    provider: config.provider,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl || undefined,
    model: 'deepseek-chat',
  };
}

// 创建 Embedding 服务实例
export async function createEmbeddingService(): Promise<EmbeddingService | null> {
  const config = await getEmbeddingConfig();
  if (!config) return null;
  return new DeepSeekEmbeddingService(config);
}

// 文本预处理（截断过长文本）
export function preprocessText(text: string, maxLength: number = 8000): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength);
}
