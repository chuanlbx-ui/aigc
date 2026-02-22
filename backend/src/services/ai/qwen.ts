import { AIService, AIServiceConfig, ChatMessage, ChatWithSearchResponse } from './index';

export class QwenService implements AIService {
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = config;
  }

  supportsWebSearch(): boolean {
    return true;
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const baseUrl = this.config.baseUrl ||
      'https://dashscope.aliyuncs.com/compatible-mode/v1';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || 'qwen-turbo',
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`通义千问 API 错误: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  async chatWithSearch(messages: ChatMessage[]): Promise<ChatWithSearchResponse> {
    const baseUrl = this.config.baseUrl ||
      'https://dashscope.aliyuncs.com/compatible-mode/v1';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || 'qwen-turbo',
        messages,
        temperature: 0.7,
        enable_search: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`通义千问 API 错误: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    return { content };
  }

  async generateContent(prompt: string, context?: string): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: '你是一个专业的内容创作助手，擅长撰写高质量的知识文档。请用 Markdown 格式输出。' },
    ];
    if (context) {
      messages.push({ role: 'user', content: `参考资料：\n${context}` });
    }
    messages.push({ role: 'user', content: prompt });
    return this.chat(messages);
  }

  async summarize(content: string): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: '请为以下内容生成一个简洁的摘要，不超过200字。' },
      { role: 'user', content },
    ];
    return this.chat(messages);
  }
}
