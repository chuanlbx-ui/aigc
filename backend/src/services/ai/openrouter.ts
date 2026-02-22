import { AIService, AIServiceConfig, ChatMessage, ChatWithSearchResponse } from './index';

export class OpenRouterService implements AIService {
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = config;
  }

  supportsWebSearch(): boolean {
    return false;
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const baseUrl = this.config.baseUrl || 'https://openrouter.ai/api/v1';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:3001',
        'X-Title': process.env.OPENROUTER_TITLE || 'Content Creator',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter API 错误: ${response.status} - ${err}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  async generateContent(prompt: string, context?: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: '你是一个专业的内容创作助手，擅长撰写高质量的知识文档。请用 Markdown 格式输出。',
      },
    ];

    if (context) {
      messages.push({ role: 'user', content: `参考资料：\n${context}` });
    }
    messages.push({ role: 'user', content: prompt });

    return this.chat(messages);
  }

  async summarize(content: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: '请为以下内容生成一个简洁的摘要，不超过200字。',
      },
      { role: 'user', content },
    ];

    return this.chat(messages);
  }
}
