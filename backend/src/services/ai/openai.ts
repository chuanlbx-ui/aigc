import { AIService, AIServiceConfig, ChatMessage } from './index';

export class OpenAIService implements AIService {
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = config;
  }

  supportsWebSearch(): boolean {
    return false;
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API 错误: ${response.status}`);
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
