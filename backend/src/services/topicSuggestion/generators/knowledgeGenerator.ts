import { PrismaClient } from '@prisma/client';
import { aiService, ChatMessage } from '../../ai/index.js';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

export interface GeneratedTopic {
  title: string;
  description: string;
  tags: string[];
  sourceDocId: string;
  sourceDocTitle: string;
}

export class KnowledgeTopicGenerator {
  /**
   * 为单个知识库文档生成选题
   */
  async generateForDoc(docId: string, count: number = 3): Promise<GeneratedTopic[]> {
    // 获取文档信息
    const doc = await prisma.knowledgeDoc.findUnique({
      where: { id: docId },
    });

    if (!doc) {
      throw new Error(`知识库文档不存在: ${docId}`);
    }

    // 读取文档内容
    const filePath = path.join(process.cwd(), 'public', doc.filePath);
    let content = '';
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      console.error(`读取文档失败: ${filePath}`, error);
      throw error;
    }

    // 使用AI生成选题
    const topics = await this.aiGenerateTopics(doc.title, content, count);

    return topics.map(topic => ({
      ...topic,
      sourceDocId: doc.id,
      sourceDocTitle: doc.title,
    }));
  }

  /**
   * 为所有知识库文档生成选题
   */
  async generateForAllDocs(options: {
    limit?: number;
    topicsPerDoc?: number;
  } = {}): Promise<GeneratedTopic[]> {
    const { limit = 10, topicsPerDoc = 2 } = options;

    // 获取最近更新的文档
    const docs = await prisma.knowledgeDoc.findMany({
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });

    const allTopics: GeneratedTopic[] = [];

    for (const doc of docs) {
      try {
        const topics = await this.generateForDoc(doc.id, topicsPerDoc);
        allTopics.push(...topics);
      } catch (error) {
        console.error(`为文档生成选题失败: ${doc.title}`, error);
      }
    }

    return allTopics;
  }

  /**
   * 使用AI生成选题
   */
  private async aiGenerateTopics(
    docTitle: string,
    content: string,
    count: number
  ): Promise<Array<{ title: string; description: string; tags: string[] }>> {
    // 截取内容前2000字
    const contentPreview = content.slice(0, 2000);

    const prompt = `基于以下知识库文档,生成${count}个相关的文章选题。

文档标题: ${docTitle}
文档内容摘要:
${contentPreview}

要求:
1. 选题要与文档内容相关,但要有延伸和拓展
2. 选题要有吸引力,适合创作成文章
3. 每个选题包含: 标题(10-30字)、描述(50-150字)、标签(2-4个)
4. 选题要覆盖不同角度

请返回JSON格式:
[
  {
    "title": "选题标题",
    "description": "选题描述",
    "tags": ["标签1", "标签2"]
  }
]`;

    const service = await aiService.getDefaultService();
    const messages: ChatMessage[] = [
      { role: 'user', content: prompt }
    ];

    const response = await service.chat(messages);

    try {
      const topics = JSON.parse(response);
      return topics;
    } catch (error) {
      console.error('AI生成选题响应解析失败:', response);
      throw error;
    }
  }
}

export const knowledgeTopicGenerator = new KnowledgeTopicGenerator();
