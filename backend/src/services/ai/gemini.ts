import { AIService, AIServiceConfig, ChatMessage, ChatWithSearchResponse } from './index.js';

// Gemini API 消息格式
interface GeminiMessagePart {
  text: string;
}

interface GeminiMessage {
  role: 'model' | 'user';
  parts: GeminiMessagePart[];
}

export class GeminiService implements AIService {
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = config;
  }

  supportsWebSearch(): boolean {
    return true;
  }

  private convertMessages(messages: ChatMessage[]): GeminiMessage[] {
    return messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
  }

  private getSystemInstruction(messages: ChatMessage[]): string | undefined {
    const systemMsg = messages.find(m => m.role === 'system');
    return systemMsg?.content;
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const model = this.config.model || 'gemini-1.5-flash';
    const baseUrl = this.config.baseUrl ||
      'https://generativelanguage.googleapis.com/v1beta';

    const systemInstruction = this.getSystemInstruction(messages);
    const contents = this.convertMessages(messages);

    const response = await fetch(
      `${baseUrl}/models/${model}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: systemInstruction
            ? { parts: [{ text: systemInstruction }] }
            : undefined,
          generationConfig: { temperature: 0.7 },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API 错误: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async chatWithSearch(messages: ChatMessage[]): Promise<ChatWithSearchResponse> {
    const model = this.config.model || 'gemini-1.5-flash';
    const baseUrl = this.config.baseUrl ||
      'https://generativelanguage.googleapis.com/v1beta';

    const systemInstruction = this.getSystemInstruction(messages);
    const contents = this.convertMessages(messages);

    const response = await fetch(
      `${baseUrl}/models/${model}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: systemInstruction
            ? { parts: [{ text: systemInstruction }] }
            : undefined,
          tools: [{ google_search_retrieval: {} }],
          generationConfig: { temperature: 0.7 },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API 错误: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

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
