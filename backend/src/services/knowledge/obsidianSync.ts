/**
 * Obsidian Vault 双向同步服务
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { v4 as uuid } from 'uuid';

const prisma = new PrismaClient();
const KNOWLEDGE_DIR = './knowledge-base';

interface SyncResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/** 解析 Obsidian frontmatter */
function parseFrontmatter(content: string): { meta: Record<string, any>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const meta: Record<string, any> = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      // 去除引号
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      // 解析数组
      if (val.startsWith('[') && val.endsWith(']')) {
        try { meta[key] = JSON.parse(val.replace(/"/g, '"')); continue; } catch {}
      }
      meta[key] = val;
    }
  }
  return { meta, body: match[2] };
}

/** 提取 Obsidian 双向链接 [[link]] */
function extractWikiLinks(content: string): string[] {
  const matches = content.match(/\[\[([^\]]+)\]\]/g) || [];
  return matches.map(m => m.slice(2, -2).split('|')[0]);
}

/** 从 Obsidian Vault 同步到知识库 */
export async function syncFromObsidian(
  vaultPath: string,
  userId: string,
  categoryId?: string
): Promise<SyncResult> {
  const result: SyncResult = { imported: 0, updated: 0, skipped: 0, errors: [] };

  if (!fs.existsSync(vaultPath)) {
    result.errors.push('Vault 路径不存在');
    return result;
  }

  const files = collectMdFiles(vaultPath);

  for (const filePath of files) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const { meta, body } = parseFrontmatter(raw);
      const title = meta.title || path.basename(filePath, '.md');
      const stat = fs.statSync(filePath);

      // 查找是否已存在（按 sourceUrl 匹配）
      const sourceUrl = `obsidian://${filePath.replace(/\\/g, '/')}`;
      const existing = await prisma.knowledgeDoc.findFirst({
        where: { sourceUrl, userId },
      });

      if (existing) {
        // 比较修改时间，Vault 更新则同步
        if (stat.mtime > existing.updatedAt) {
          const docPath = existing.filePath;
          fs.writeFileSync(docPath, body, 'utf-8');
          await prisma.knowledgeDoc.update({
            where: { id: existing.id },
            data: {
              title,
              tags: JSON.stringify(meta.tags || []),
              summary: meta.summary || null,
              wordCount: body.length,
            },
          });
          result.updated++;
        } else {
          result.skipped++;
        }
        continue;
      }

      // 新文档：导入
      const docId = uuid();
      const docPath = path.join(KNOWLEDGE_DIR, `${docId}.md`);
      fs.writeFileSync(docPath, body, 'utf-8');

      await prisma.knowledgeDoc.create({
        data: {
          id: docId,
          title,
          slug: docId,
          summary: meta.summary || null,
          filePath: docPath,
          source: 'obsidian',
          sourceUrl,
          categoryId: categoryId || null,
          tags: JSON.stringify(meta.tags || []),
          version: 1,
          wordCount: body.length,
          readTime: Math.ceil(body.length / 500),
          userId,
        },
      });
      result.imported++;
    } catch (e: any) {
      result.errors.push(`${filePath}: ${e.message}`);
    }
  }

  return result;
}

/** 递归收集 .md 文件 */
function collectMdFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      files.push(...collectMdFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}
