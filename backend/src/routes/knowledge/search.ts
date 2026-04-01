import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { createAIService, getAIConfigOrDefault } from '../../services/ai/index.js';
import { searchService } from '../../services/search.js';
import { createEmbeddingService, preprocessText } from '../../services/embedding.js';
import {
  prisma,
  KNOWLEDGE_DIR,
  generateSlug,
  calculateReadingStats,
} from './shared.js';

export const searchRouter = Router();

// ========== AI 功能 API ==========

// AI 生成内容
searchRouter.post('/ai/generate', async (req, res) => {
  try {
    const { prompt, context, serviceId } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: '请提供生成提示' });
    }

    const config = await getAIConfigOrDefault(serviceId);
    if (!config) {
      return res.status(400).json({ error: '请先配置 AI 服务' });
    }

    const service = createAIService(config);
    const content = await service.generateContent(prompt, context);
    res.json({ content });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'AI 生成失败' });
  }
});

// AI 生成摘要
searchRouter.post('/ai/summarize', async (req, res) => {
  try {
    const { content, serviceId } = req.body;
    if (!content) {
      return res.status(400).json({ error: '请提供内容' });
    }

    const config = await getAIConfigOrDefault(serviceId);
    if (!config) {
      return res.status(400).json({ error: '请先配置 AI 服务' });
    }

    const service = createAIService(config);
    const summary = await service.summarize(content);
    res.json({ summary });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'AI 摘要生成失败' });
  }
});

// AI 联网搜索
searchRouter.post('/ai/search', async (req, res) => {
  try {
    const { query, categoryId, tags, serviceId } = req.body;
    if (!query) {
      return res.status(400).json({ error: '请提供搜索关键词' });
    }

    const config = await getAIConfigOrDefault(serviceId);
    if (!config) {
      return res.status(400).json({ error: '请先配置 AI 服务' });
    }

    // 1. 搜索网页
    const searchResults = await searchService.search(query, 5);
    if (searchResults.length === 0) {
      return res.status(400).json({ error: '未找到相关搜索结果' });
    }

    // 2. 抓取搜索结果内容
    const contents: string[] = [];
    for (const result of searchResults.slice(0, 5)) {
      try {
        const content = await searchService.fetchContent(result.url);
        contents.push(`## ${result.title}\n来源: ${result.url}\n\n${content.substring(0, 8000)}`);
      } catch (e) {
        contents.push(`## ${result.title}\n来源: ${result.url}\n\n${result.snippet}`);
      }
    }

    // 3. 调用 AI 整理
    const aiService = createAIService(config);
    const prompt = `请根据以下搜索结果，整理一篇关于"${query}"的知识文档。
要求：
1. 使用 Markdown 格式
2. 结构清晰，包含标题、摘要、正文
3. 保留重要信息和数据
4. 在文末列出参考来源

搜索结果：
${contents.join('\n\n---\n\n')}`;

    const mdContent = await aiService.generateContent(prompt);

    // 4. 保存到知识库
    const title = `${query} - AI 搜索整理`;
    const slug = generateSlug(title);
    const fileName = `${uuid()}.md`;
    const filePath = path.join(KNOWLEDGE_DIR, fileName);

    fs.writeFileSync(filePath, mdContent, 'utf-8');
    const { wordCount, readTime } = calculateReadingStats(mdContent);

    const doc = await prisma.knowledgeDoc.create({
      data: {
        title,
        slug,
        summary: mdContent.substring(0, 200),
        filePath,
        source: 'ai-search',
        categoryId: categoryId || null,
        tags: JSON.stringify(tags || []),
        wordCount,
        readTime,
        userId: req.user!.id,
      },
      include: { category: true },
    });

    res.json({ doc, content: mdContent });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'AI 搜索失败' });
  }
});

// URL 抓取整理
searchRouter.post('/ai/fetch-url', async (req, res) => {
  try {
    const { url, categoryId, tags, serviceId } = req.body;
    if (!url) {
      return res.status(400).json({ error: '请提供 URL' });
    }

    const config = await getAIConfigOrDefault(serviceId);
    if (!config) {
      return res.status(400).json({ error: '请先配置 AI 服务' });
    }

    // 1. 抓取页面内容
    const rawContent = await searchService.fetchContent(url);

    // 2. 调用 AI 整理
    const aiService = createAIService(config);
    const prompt = `请将以下网页内容整理成一篇结构清晰的 Markdown 文档。
要求：
1. 提取核心内容，去除无关信息
2. 使用合适的标题层级
3. 保留重要的数据和信息
4. 在文末注明来源 URL

网页内容：
${rawContent}

来源 URL: ${url}`;

    const mdContent = await aiService.generateContent(prompt);

    // 3. 从内容中提取标题
    const titleMatch = mdContent.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : new URL(url).hostname;
    const slug = generateSlug(title);
    const fileName = `${uuid()}.md`;
    const filePath = path.join(KNOWLEDGE_DIR, fileName);

    fs.writeFileSync(filePath, mdContent, 'utf-8');
    const { wordCount, readTime } = calculateReadingStats(mdContent);

    const doc = await prisma.knowledgeDoc.create({
      data: {
        title,
        slug,
        summary: mdContent.substring(0, 200),
        filePath,
        source: 'url-fetch',
        sourceUrl: url,
        categoryId: categoryId || null,
        tags: JSON.stringify(tags || []),
        wordCount,
        readTime,
        userId: req.user!.id,
      },
      include: { category: true },
    });

    res.json({ doc, content: mdContent });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'URL 抓取失败' });
  }
});

// ========== 全文搜索 ==========

// 全文搜索（搜索文档内容）
searchRouter.get('/search/fulltext', async (req, res) => {
  try {
    const { q, categoryId, limit = '20' } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.status(400).json({ error: '搜索关键词至少2个字符' });
    }

    const keyword = q.trim().toLowerCase();
    const maxResults = Math.min(parseInt(limit as string) || 20, 100);

    // 获取用户的所有文档
    const where: any = { userId: req.user!.id };
    if (categoryId) where.categoryId = categoryId as string;

    const docs = await prisma.knowledgeDoc.findMany({
      where,
      include: { category: true },
    });

    const results: any[] = [];

    for (const doc of docs) {
      const searchFilePath = doc.filePath.replace(/\\/g, '/');
      if (!fs.existsSync(searchFilePath)) continue;

      const content = fs.readFileSync(searchFilePath, 'utf-8');
      const lowerContent = content.toLowerCase();
      const index = lowerContent.indexOf(keyword);

      if (index === -1) continue;

      // 提取匹配片段（前后各50字符）
      const start = Math.max(0, index - 50);
      const end = Math.min(content.length, index + keyword.length + 50);
      let snippet = content.substring(start, end);
      if (start > 0) snippet = '...' + snippet;
      if (end < content.length) snippet = snippet + '...';

      // 高亮关键词
      const highlightedSnippet = snippet.replace(
        new RegExp(keyword, 'gi'),
        match => `<mark>${match}</mark>`
      );

      results.push({
        id: doc.id,
        title: doc.title,
        slug: doc.slug,
        category: doc.category,
        snippet: highlightedSnippet,
        matchIndex: index,
      });

      if (results.length >= maxResults) break;
    }

    res.json({ results, total: results.length, keyword: q });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '搜索失败' });
  }
});

// ========== 知识图谱 ==========

// 获取知识图谱数据
searchRouter.get('/graph', async (req, res) => {
  try {
    const docs = await prisma.knowledgeDoc.findMany({
      where: { userId: req.user!.id },
      include: { category: true },
    });

    const nodes: any[] = [];
    const tagMap = new Map<string, string[]>();

    for (const doc of docs) {
      nodes.push({
        id: doc.id,
        label: doc.title,
        type: 'doc',
        category: doc.category?.name,
        color: doc.category?.color || '#6366f1',
      });
      const tags = JSON.parse(doc.tags || '[]');
      for (const tag of tags) {
        if (!tagMap.has(tag)) tagMap.set(tag, []);
        tagMap.get(tag)!.push(doc.id);
      }
    }

    const edges: any[] = [];
    const edgeSet = new Set<string>();
    for (const [tag, docIds] of tagMap) {
      if (docIds.length < 2) continue;
      for (let i = 0; i < docIds.length; i++) {
        for (let j = i + 1; j < docIds.length; j++) {
          const key = [docIds[i], docIds[j]].sort().join('-');
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            edges.push({ from: docIds[i], to: docIds[j], label: tag });
          }
        }
      }
    }

    res.json({ nodes, edges, stats: { docs: nodes.length, connections: edges.length } });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取图谱失败' });
  }
});

// 获取相关文档推荐
searchRouter.get('/docs/:id/related', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = '5' } = req.query;

    const doc = await prisma.knowledgeDoc.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: '文档不存在' });

    const docTags = JSON.parse(doc.tags || '[]');
    if (docTags.length === 0) {
      return res.json({ related: [], message: '该文档没有标签' });
    }

    // 查找有相同标签的文档
    const allDocs = await prisma.knowledgeDoc.findMany({
      where: { userId: req.user!.id, id: { not: id } },
      include: { category: true },
    });

    const scored = allDocs.map(d => {
      const tags = JSON.parse(d.tags || '[]');
      const common = tags.filter((t: string) => docTags.includes(t));
      return { doc: d, score: common.length, commonTags: common };
    }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

    const related = scored.slice(0, parseInt(limit as string)).map(s => ({
      id: s.doc.id, title: s.doc.title, slug: s.doc.slug,
      category: s.doc.category, score: s.score, commonTags: s.commonTags,
    }));

    res.json({ related });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取推荐失败' });
  }
});

// ========== 语义搜索（向量化） ==========

// 向量化单个文档
searchRouter.post('/docs/:id/embed', async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await prisma.knowledgeDoc.findFirst({
      where: { id, userId: req.user!.id },
    });
    if (!doc) return res.status(404).json({ error: '文档不存在' });

    const embeddingService = await createEmbeddingService();
    if (!embeddingService) {
      return res.status(400).json({ error: '请先配置 DeepSeek AI 服务' });
    }

    // 读取文档内容
    const embedFilePath = doc.filePath.replace(/\\/g, '/');
    if (!fs.existsSync(embedFilePath)) {
      return res.status(404).json({ error: '文档文件不存在' });
    }
    const content = fs.readFileSync(embedFilePath, 'utf-8');
    const text = preprocessText(`${doc.title}\n\n${content}`);

    // 生成向量
    const embedding = await embeddingService.embed(text);

    // 使用原生 SQL 更新向量
    await prisma.$executeRaw`
      UPDATE "KnowledgeDoc"
      SET embedding = ${embedding}::vector, "embeddedAt" = NOW()
      WHERE id = ${id}
    `;

    res.json({ success: true, dimension: embedding.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '向量化失败' });
  }
});

// 批量向量化文档
searchRouter.post('/embed/batch', async (req, res) => {
  try {
    const { ids } = req.body;

    const embeddingService = await createEmbeddingService();
    if (!embeddingService) {
      return res.status(400).json({ error: '请先配置 DeepSeek AI 服务' });
    }

    // 获取需要向量化的文档
    let docs;
    if (ids && Array.isArray(ids) && ids.length > 0) {
      docs = await prisma.knowledgeDoc.findMany({
        where: { id: { in: ids }, userId: req.user!.id },
      });
    } else {
      // 获取所有未向量化的文档
      docs = await prisma.knowledgeDoc.findMany({
        where: { userId: req.user!.id, embeddedAt: null },
        take: 50,
      });
    }

    if (docs.length === 0) {
      return res.json({ success: true, embedded: 0, message: '没有需要向量化的文档' });
    }

    let embedded = 0;
    const errors: string[] = [];

    for (const doc of docs) {
      try {
        const batchFilePath = doc.filePath.replace(/\\/g, '/');
        if (!fs.existsSync(batchFilePath)) continue;

        const content = fs.readFileSync(batchFilePath, 'utf-8');
        const text = preprocessText(`${doc.title}\n\n${content}`);
        const embedding = await embeddingService.embed(text);

        await prisma.$executeRaw`
          UPDATE "KnowledgeDoc"
          SET embedding = ${embedding}::vector, "embeddedAt" = NOW()
          WHERE id = ${doc.id}
        `;
        embedded++;
      } catch (e: any) {
        errors.push(`${doc.title}: ${e.message}`);
      }
    }

    res.json({ success: true, embedded, errors: errors.length, errorDetails: errors });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '批量向量化失败' });
  }
});

// 获取向量化状态
searchRouter.get('/embed/status', async (req, res) => {
  try {
    const total = await prisma.knowledgeDoc.count({
      where: { userId: req.user!.id },
    });
    const embedded = await prisma.knowledgeDoc.count({
      where: { userId: req.user!.id, embeddedAt: { not: null } },
    });

    res.json({ total, embedded, pending: total - embedded });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '获取状态失败' });
  }
});

// 语义搜索
searchRouter.get('/search/semantic', async (req, res) => {
  try {
    const { q, limit = '10' } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.status(400).json({ error: '搜索关键词至少2个字符' });
    }

    const embeddingService = await createEmbeddingService();
    if (!embeddingService) {
      return res.status(400).json({ error: '请先配置 DeepSeek AI 服务' });
    }

    // 生成查询向量
    const queryEmbedding = await embeddingService.embed(q.trim());
    const maxResults = Math.min(parseInt(limit as string) || 10, 50);

    // 使用 pgvector 进行相似度搜索
    const results = await prisma.$queryRaw<any[]>`
      SELECT id, title, slug, summary, "categoryId",
             1 - (embedding <=> ${queryEmbedding}::vector) as similarity
      FROM "KnowledgeDoc"
      WHERE "userId" = ${req.user!.id}
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${queryEmbedding}::vector
      LIMIT ${maxResults}
    `;

    res.json({ results, query: q });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '语义搜索失败' });
  }
});
