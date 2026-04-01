import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import archiver from 'archiver';
import multer from 'multer';
import {
  prisma,
  KNOWLEDGE_DIR,
  SUPPORTED_EXTENSIONS,
  upload,
  generateSlug,
  calculateReadingStats,
  readFileContent,
} from './shared.js';

export const syncRouter = Router();

// ========== 导入 API ==========

// 文件上传导入（带错误处理）
syncRouter.post('/import/upload', (req, res, next) => {
  console.log('[上传] 开始处理上传请求');
  upload.array('files', 20)(req, res, (err) => {
    if (err) {
      console.error('[上传] Multer 错误:', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: '文件大小超过限制（最大50MB）' });
        }
        return res.status(400).json({ error: `上传错误: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || '上传失败' });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('[上传] Multer 处理完成，开始处理文件');
    const files = req.files as Express.Multer.File[];
    const { categoryId } = req.body;

    console.log('[上传] 文件数量:', files?.length || 0);

    if (!files || files.length === 0) {
      return res.status(400).json({ error: '请选择要上传的文件' });
    }

    const imported: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        console.log('[上传] 处理文件:', file.originalname, '路径:', file.path, '大小:', file.size);
        const content = await readFileContent(file.path);
        console.log('[上传] 读取内容长度:', content.length);
        const ext = path.extname(file.originalname).toLowerCase();
        const title = path.basename(file.originalname, ext);
        const slug = generateSlug(title);
        const fileName = `${uuid()}.md`;
        const destPath = path.join(KNOWLEDGE_DIR, fileName);

        fs.writeFileSync(destPath, content, 'utf-8');
        const { wordCount, readTime } = calculateReadingStats(content);

        await prisma.knowledgeDoc.create({
          data: {
            title,
            slug,
            summary: content.substring(0, 200),
            filePath: destPath,
            source: 'upload',
            categoryId: categoryId || null,
            wordCount,
            readTime,
            userId: req.user!.id,
          },
        });

        // 删除临时上传文件
        fs.unlinkSync(file.path);
        imported.push(title);
      } catch (fileError: any) {
        errors.push(`${file.originalname}: ${fileError.message}`);
      }
    }

    res.json({ success: true, imported, count: imported.length, errors });
  } catch (error: any) {
    res.status(500).json({ error: error.message || '上传失败' });
  }
});

// 导入本地目录
syncRouter.post('/import/directory', async (req, res) => {
  try {
    const { dirPath, categoryId } = req.body;
    console.log('导入目录:', dirPath);

    if (!dirPath || !fs.existsSync(dirPath)) {
      return res.status(400).json({ error: '目录不存在' });
    }

    // 支持 .md, .txt, .pdf 文件
    const allFiles = fs.readdirSync(dirPath);
    console.log('目录中所有文件:', allFiles);

    const files = allFiles.filter(f => {
      const ext = path.extname(f).toLowerCase();
      return SUPPORTED_EXTENSIONS.includes(ext);
    });
    console.log('支持的文件:', files);

    const imported: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        console.log('正在处理文件:', file);
        const srcPath = path.join(dirPath, file);
        console.log('文件路径:', srcPath);
        const content = await readFileContent(srcPath);
        console.log('读取内容长度:', content.length);
        const ext = path.extname(file).toLowerCase();
        const title = path.basename(file, ext);
        const slug = generateSlug(title);
        const fileName = `${uuid()}.md`;
        const destPath = path.join(KNOWLEDGE_DIR, fileName);

        // 保存为 MD 格式
        fs.writeFileSync(destPath, content, 'utf-8');
        const { wordCount, readTime } = calculateReadingStats(content);

        await prisma.knowledgeDoc.create({
          data: {
            title,
            slug,
            summary: content.substring(0, 200),
            filePath: destPath,
            source: 'import',
            categoryId: categoryId || null,
            wordCount,
            readTime,
            userId: req.user!.id,
          },
        });
        imported.push(title);
      } catch (fileError: any) {
        errors.push(`${file}: ${fileError.message}`);
      }
    }

    res.json({ success: true, imported, count: imported.length, errors });
  } catch (error) {
    res.status(500).json({ error: '导入失败' });
  }
});

// 流式导入（支持进度显示）
syncRouter.post('/import/directory-stream', async (req, res) => {
  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendProgress = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { dirPath, categoryId } = req.body;

    if (!dirPath || !fs.existsSync(dirPath)) {
      sendProgress({ type: 'error', message: '目录不存在' });
      res.end();
      return;
    }

    const allFiles = fs.readdirSync(dirPath);
    const files = allFiles.filter(f => {
      const ext = path.extname(f).toLowerCase();
      return SUPPORTED_EXTENSIONS.includes(ext);
    });

    const total = files.length;
    sendProgress({ type: 'start', total, message: `发现 ${total} 个文件` });

    const imported: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const srcPath = path.join(dirPath, file);
        const content = await readFileContent(srcPath);
        const ext = path.extname(file).toLowerCase();
        const title = path.basename(file, ext);
        const slug = generateSlug(title);
        const fileName = `${uuid()}.md`;
        const destPath = path.join(KNOWLEDGE_DIR, fileName);

        fs.writeFileSync(destPath, content, 'utf-8');
        const { wordCount, readTime } = calculateReadingStats(content);

        await prisma.knowledgeDoc.create({
          data: {
            title, slug,
            summary: content.substring(0, 200),
            filePath: destPath,
            source: 'import',
            categoryId: categoryId || null,
            wordCount, readTime,
            userId: req.user!.id,
          },
        });

        imported.push(title);
        sendProgress({
          type: 'progress',
          current: i + 1,
          total,
          file: title,
          success: true,
        });
      } catch (fileError: any) {
        errors.push(`${file}: ${fileError.message}`);
        sendProgress({
          type: 'progress',
          current: i + 1,
          total,
          file,
          success: false,
          error: fileError.message,
        });
      }
    }

    sendProgress({
      type: 'complete',
      imported: imported.length,
      errors: errors.length,
      message: `导入完成：成功 ${imported.length} 个，失败 ${errors.length} 个`,
    });
  } catch (error: any) {
    sendProgress({ type: 'error', message: error.message || '导入失败' });
  }

  res.end();
});

// ========== 导出功能 ==========

// 生成 Obsidian 格式的 frontmatter
function generateFrontmatter(doc: any, categoryName?: string): string {
  const tags = JSON.parse(doc.tags || '[]');
  const lines = ['---'];
  lines.push(`title: "${doc.title.replace(/"/g, '\\"')}"`);
  if (doc.summary) lines.push(`summary: "${doc.summary.replace(/"/g, '\\"')}"`);
  if (categoryName) lines.push(`category: "${categoryName}"`);
  if (tags.length > 0) lines.push(`tags: [${tags.map((t: string) => `"${t}"`).join(', ')}]`);
  lines.push(`created: ${doc.createdAt.toISOString()}`);
  lines.push(`updated: ${doc.updatedAt.toISOString()}`);
  if (doc.sourceUrl) lines.push(`source: "${doc.sourceUrl}"`);
  lines.push('---\n');
  return lines.join('\n');
}

// 导出知识库（多格式支持）
syncRouter.get('/export', async (req, res) => {
  try {
    const { format = 'zip', scope = 'all', id, obsidian = 'false' } = req.query;
    const isObsidian = obsidian === 'true';

    // 构建查询条件
    const where: any = { userId: req.user!.id };
    if (scope === 'category' && id) {
      where.categoryId = id as string;
    } else if (scope === 'doc' && id) {
      where.id = id as string;
    }

    // 获取文档和分类
    const docs = await prisma.knowledgeDoc.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });

    if (docs.length === 0) {
      return res.status(404).json({ error: '没有可导出的文档' });
    }

    // JSON 格式导出
    if (format === 'json') {
      const { exportToJSON } = await import('../../services/knowledge/exportFormats');
      const json = exportToJSON(docs);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="knowledge-export.json"');
      return res.send(json);
    }

    // OPML 格式导出
    if (format === 'opml') {
      const { exportToOPML } = await import('../../services/knowledge/exportFormats');
      const opml = exportToOPML(docs);
      res.setHeader('Content-Type', 'text/xml');
      res.setHeader('Content-Disposition', 'attachment; filename="knowledge-export.opml"');
      return res.send(opml);
    }

    const categories = await prisma.knowledgeCategory.findMany();

    // Notion 兼容 Markdown ZIP
    if (format === 'notion') {
      const { exportToNotionMd } = await import('../../services/knowledge/exportFormats');
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="notion-export.zip"');
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);
      for (const doc of docs) {
        const md = exportToNotionMd(doc);
        const safeName = doc.title.replace(/[<>:"/\\|?*]/g, '_');
        archive.append(md, { name: `${safeName}.md` });
      }
      await archive.finalize();
      return;
    }

    // 默认 ZIP 格式（含 Obsidian 选项）
    const fileName = isObsidian ? 'obsidian-vault.zip' : 'knowledge-export.zip';
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    for (const doc of docs) {
      const exportFilePath = doc.filePath.replace(/\\/g, '/');
      if (!fs.existsSync(exportFilePath)) continue;

      let content = fs.readFileSync(exportFilePath, 'utf-8');
      const categoryName = doc.category?.name;

      if (isObsidian) {
        content = generateFrontmatter(doc, categoryName) + content;
      }

      const folder = isObsidian && categoryName ? `${categoryName}/` : '';
      const safeName = doc.title.replace(/[<>:"/\\|?*]/g, '_');
      archive.append(content, { name: `${folder}${safeName}.md` });
    }

    if (!isObsidian) {
      const metadata = {
        exportedAt: new Date().toISOString(),
        totalDocs: docs.length,
        categories: categories.map(c => ({ id: c.id, name: c.name, slug: c.slug })),
        docs: docs.map(d => ({
          id: d.id, title: d.title, slug: d.slug,
          categoryId: d.categoryId, tags: JSON.parse(d.tags || '[]'),
          createdAt: d.createdAt, updatedAt: d.updatedAt,
        })),
      };
      archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });
    }

    await archive.finalize();
  } catch (error: any) {
    res.status(500).json({ error: error.message || '导出失败' });
  }
});

// ========== Obsidian 同步 ==========

// 从 Obsidian Vault 同步到知识库
syncRouter.post('/sync/obsidian', async (req, res) => {
  try {
    const { vaultPath, categoryId } = req.body;
    if (!vaultPath) {
      return res.status(400).json({ error: '请提供 Obsidian Vault 路径' });
    }

    const { syncFromObsidian } = await import('../../services/knowledge/obsidianSync');
    const result = await syncFromObsidian(vaultPath, req.user!.id, categoryId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || '同步失败' });
  }
});

// ========== Google Drive 导出 ==========

syncRouter.post('/export/google-drive', async (req, res) => {
  try {
    const { accessToken, folderId, docIds, format } = req.body;
    if (!accessToken || !docIds || !Array.isArray(docIds) || docIds.length === 0) {
      return res.status(400).json({ error: '请提供 accessToken 和文档ID列表' });
    }

    const { uploadToGoogleDrive } = await import('../../services/knowledge/googleDrive');
    const result = await uploadToGoogleDrive({
      accessToken,
      folderId,
      docIds,
      userId: req.user!.id,
      format,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Google Drive 导出失败' });
  }
});

// ========== 通用格式导入 ==========

// 从 JSON 导入
syncRouter.post('/import/json', async (req, res) => {
  try {
    const { content, categoryId } = req.body;
    if (!content) {
      return res.status(400).json({ error: '请提供 JSON 内容' });
    }
    const { importFromJSON } = await import('../../services/knowledge/exportFormats');
    const result = await importFromJSON(content, req.user!.id, categoryId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'JSON 导入失败' });
  }
});

// 从 Notion HTML 导入
syncRouter.post('/import/notion', async (req, res) => {
  try {
    const { content, categoryId } = req.body;
    if (!content) {
      return res.status(400).json({ error: '请提供 Notion HTML 内容' });
    }
    const { importFromNotionHTML } = await import('../../services/knowledge/exportFormats');
    const result = await importFromNotionHTML(content, req.user!.id, categoryId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Notion 导入失败' });
  }
});

// 从 Logseq Markdown 导入
syncRouter.post('/import/logseq', async (req, res) => {
  try {
    const { content, title, categoryId } = req.body;
    if (!content || !title) {
      return res.status(400).json({ error: '请提供内容和标题' });
    }
    const { importFromLogseq } = await import('../../services/knowledge/exportFormats');
    const result = await importFromLogseq(content, title, req.user!.id, categoryId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Logseq 导入失败' });
  }
});
