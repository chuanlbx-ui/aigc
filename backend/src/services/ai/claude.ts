import { AIService, AIServiceConfig, ChatMessage } from './index.js';

export class ClaudeService implements AIService {
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = config;
  }

  supportsWebSearch(): boolean {
    return false;
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const baseUrl = this.config.baseUrl || 'https://api.anthropic.com/v1';

    // 转换消息格式为 Claude API 格式
    const systemMsg = messages.find(m => m.role === 'system');
    const otherMsgs = messages.filter(m => m.role !== 'system');

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: 4096,
        system: systemMsg?.content,
        messages: otherMsgs.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API 错误: ${response.status}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
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
      messages.push({ role: 'assistant', content: '好的，我已阅读参考资料。' });
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
