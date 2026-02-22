/**
 * 通用格式导入导出服务
 * 支持 JSON、OPML、Notion HTML/Markdown、Logseq Markdown
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();
const KNOWLEDGE_DIR = './knowledge-base';

// ========== 导出 ==========

interface ExportDoc {
  id: string;
  title: string;
  summary: string | null;
  tags: string;
  categoryId: string | null;
  category?: { name: string } | null;
  filePath: string;
  createdAt: Date;
  updatedAt: Date;
  sourceUrl: string | null;
}

/** 导出为 JSON 格式 */
export function exportToJSON(docs: ExportDoc[]): string {
  const data = docs.map(doc => {
    const content = fs.existsSync(doc.filePath)
      ? fs.readFileSync(doc.filePath, 'utf-8') : '';
    return {
      title: doc.title,
      summary: doc.summary,
      content,
      tags: JSON.parse(doc.tags || '[]'),
      category: doc.category?.name || null,
      sourceUrl: doc.sourceUrl,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  });
  return JSON.stringify(data, null, 2);
}

/** 导出为 OPML 格式（大纲） */
export function exportToOPML(docs: ExportDoc[]): string {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<opml version="2.0">',
    '<head><title>Knowledge Base Export</title></head>',
    '<body>',
  ];

  // 按分类分组
  const grouped = new Map<string, ExportDoc[]>();
  for (const doc of docs) {
    const cat = doc.category?.name || '未分类';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(doc);
  }

  for (const [cat, catDocs] of grouped) {
    lines.push(`  <outline text="${escapeXml(cat)}">`);
    for (const doc of catDocs) {
      const tags = JSON.parse(doc.tags || '[]').join(', ');
      lines.push(`    <outline text="${escapeXml(doc.title)}" note="${escapeXml(doc.summary || '')}" category="${escapeXml(tags)}" />`);
    }
    lines.push('  </outline>');
  }

  lines.push('</body>', '</opml>');
  return lines.join('\n');
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 导出为 Notion 兼容 Markdown（带 frontmatter） */
export function exportToNotionMd(doc: ExportDoc): string {
  const content = fs.existsSync(doc.filePath)
    ? fs.readFileSync(doc.filePath, 'utf-8') : '';
  const tags = JSON.parse(doc.tags || '[]');

  const fm = [
    '---',
    `title: "${doc.title.replace(/"/g, '\\"')}"`,
    tags.length > 0 ? `tags: [${tags.map((t: string) => `"${t}"`).join(', ')}]` : null,
    doc.category?.name ? `category: "${doc.category.name}"` : null,
    `created: ${doc.createdAt.toISOString()}`,
    `updated: ${doc.updatedAt.toISOString()}`,
    '---',
    '',
  ].filter(Boolean).join('\n');

  return fm + content;
}

// ========== 导入 ==========

interface ImportResult {
  imported: number;
  errors: string[];
}

/** 从 Notion HTML 导入 */
export async function importFromNotionHTML(
  htmlContent: string, userId: string, categoryId?: string
): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, errors: [] };
  const $ = cheerio.load(htmlContent);

  // Notion 导出的 HTML 通常有 article 或 .page-body
  const title = $('title').text() || $('h1').first().text() || 'Notion Import';
  const body = $('.page-body').html() || $('body').html() || '';

  // 转为简单 Markdown
  let md = body
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<code>(.*?)<\/code>/gi, '`$1`')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  try {
    const docId = uuid();
    const docPath = path.join(KNOWLEDGE_DIR, `${docId}.md`);
    fs.writeFileSync(docPath, md, 'utf-8');

    await prisma.knowledgeDoc.create({
      data: {
        title,
        slug: docId,
        summary: md.substring(0, 200),
        filePath: docPath,
        source: 'notion',
        categoryId: categoryId || null,
        wordCount: md.length,
        readTime: Math.ceil(md.length / 400),
        userId,
      },
    });
    result.imported++;
  } catch (e: any) {
    result.errors.push(`${title}: ${e.message}`);
  }

  return result;
}

/** 从 Logseq Markdown 导入（处理 - 开头的大纲格式） */
export async function importFromLogseq(
  content: string, title: string, userId: string, categoryId?: string
): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, errors: [] };

  // Logseq 用 `- ` 作为块级标记，转为标准 Markdown
  let md = content
    .split('\n')
    .map(line => {
      // 移除 Logseq 属性行 (key:: value)
      if (line.match(/^\s*\w+::\s/)) return '';
      // 保留缩进层级但去掉 `- ` 前缀
      const match = line.match(/^(\s*)- (.*)$/);
      if (match) {
        const indent = match[1].length;
        const text = match[2];
        if (indent === 0) return text + '\n';
        return '  '.repeat(indent / 2) + '- ' + text;
      }
      return line;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  try {
    const docId = uuid();
    const docPath = path.join(KNOWLEDGE_DIR, `${docId}.md`);
    fs.writeFileSync(docPath, md, 'utf-8');

    await prisma.knowledgeDoc.create({
      data: {
        title,
        slug: docId,
        summary: md.substring(0, 200),
        filePath: docPath,
        source: 'logseq',
        categoryId: categoryId || null,
        wordCount: md.length,
        readTime: Math.ceil(md.length / 400),
        userId,
      },
    });
    result.imported++;
  } catch (e: any) {
    result.errors.push(`${title}: ${e.message}`);
  }

  return result;
}

/** 从 JSON 格式导入 */
export async function importFromJSON(
  jsonContent: string, userId: string, categoryId?: string
): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, errors: [] };

  let items: any[];
  try {
    items = JSON.parse(jsonContent);
    if (!Array.isArray(items)) items = [items];
  } catch {
    result.errors.push('JSON 格式解析失败');
    return result;
  }

  for (const item of items) {
    try {
      const title = item.title || 'Untitled';
      const content = item.content || '';
      const docId = uuid();
      const docPath = path.join(KNOWLEDGE_DIR, `${docId}.md`);
      fs.writeFileSync(docPath, content, 'utf-8');

      await prisma.knowledgeDoc.create({
        data: {
          title,
          slug: docId,
          summary: item.summary || content.substring(0, 200),
          filePath: docPath,
          source: 'json-import',
          categoryId: categoryId || null,
          tags: JSON.stringify(item.tags || []),
          wordCount: content.length,
          readTime: Math.ceil(content.length / 400),
          userId,
        },
      });
      result.imported++;
    } catch (e: any) {
      result.errors.push(`${item.title || 'unknown'}: ${e.message}`);
    }
  }

  return result;
}
