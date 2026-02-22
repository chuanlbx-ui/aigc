import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import * as cheerio from 'cheerio';
import archiver from 'archiver';
import { getDefaultAIConfig, createAIService, getAIConfigOrDefault } from '../services/ai/index';
import { searchService } from '../services/search';
import { requireAuth } from '../middleware/auth.js';
import { createEmbeddingService, preprocessText, EMBEDDING_DIMENSION } from '../services/embedding';
// PDF 解析将在运行时动态导入，避免启动时的测试文件问题

const prisma = new PrismaClient();
export const knowledgeRouter = Router();

// 所有知识库路由都需要登录
knowledgeRouter.use(requireAuth);

// 支持的文件扩展名
const SUPPORTED_EXTENSIONS = ['.md', '.txt', '.pdf'];

// 知识库文件存储目录
const KNOWLEDGE_DIR = './knowledge-base';
const VERSIONS_DIR = path.join(KNOWLEDGE_DIR, 'versions');
const UPLOADS_DIR = path.join(KNOWLEDGE_DIR, 'uploads');

// 确保目录存在
if (!fs.existsSync(KNOWLEDGE_DIR)) {
  fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
}
if (!fs.existsSync(VERSIONS_DIR)) {
  fs.mkdirSync(VERSIONS_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer 配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`),
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (SUPPORTED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${ext}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// 生成 slug
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
}

// 计算字数和阅读时间
function calculateReadingStats(content: string) {
  const wordCount = content.replace(/\s+/g, '').length;
  const readTime = Math.ceil(wordCount / 400); // 假设每分钟400字
  return { wordCount, readTime };
}

// ========== 文档 API ==========

// 获取文档列表
knowledgeRouter.get('/docs', async (req, res) => {
  try {
    const { categoryId, tag, search, page = '1', pageSize = '20', isPinned } = req.query;

    const where: any = { userId: req.user!.id };

    if (categoryId === 'uncategorized') {
      where.categoryId = null;
    } else if (categoryId) {
      where.categoryId = categoryId as string;
    }

    if (tag) {
      where.tags = { contains: tag as string };
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { summary: { contains: search as string } },
      ];
    }

    if (isPinned === 'true') {
      where.isPinned = true;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const [docs, total] = await Promise.all([
      prisma.knowledgeDoc.findMany({
        where,
        include: { category: true },
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
        skip,
        take,
      }),
      prisma.knowledgeDoc.count({ where }),
    ]);

    res.json({ docs, total, page: parseInt(page as string), pageSize: parseInt(pageSize as string) });
  } catch (error) {
    res.status(500).json({ error: '获取文档列表失败' });
  }
});

// 获取单个文档
knowledgeRouter.get('/docs/:id', async (req, res) => {
  try {
    const doc = await prisma.knowledgeDoc.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { category: true },
    });
    if (!doc) {
      return res.status(404).json({ error: '文档不存在' });
    }
    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: '获取文档失败' });
  }
});

// 获取文档内容
knowledgeRouter.get('/docs/:id/content', async (req, res) => {
  try {
    const doc = await prisma.knowledgeDoc.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!doc) {
      return res.status(404).json({ error: '文档不存在' });
    }

    const filePath = path.resolve(doc.filePath.replace(/\\/g, '/'));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: '获取文档内容失败' });
  }
});

// 创建文档
knowledgeRouter.post('/docs', async (req, res) => {
  try {
    const { title, content, summary, categoryId, tags, source, sourceUrl } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }

    const slug = generateSlug(title);
    const fileName = `${uuid()}.md`;
    const filePath = path.join(KNOWLEDGE_DIR, fileName);

    // 写入文件
    fs.writeFileSync(filePath, content, 'utf-8');

    const { wordCount, readTime } = calculateReadingStats(content);

    const doc = await prisma.knowledgeDoc.create({
      data: {
        title,
        slug,
        summary: summary || content.substring(0, 200),
        filePath,
        source: source || 'manual',
        sourceUrl,
        categoryId: categoryId || null,
        tags: JSON.stringify(tags || []),
        wordCount,
        readTime,
        userId: req.user!.id,
      },
      include: { category: true },
    });

    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: '创建文档失败' });
  }
});

// 更新文档元数据
knowledgeRouter.put('/docs/:id', async (req, res) => {
  try {
    const { title, summary, categoryId, tags, isPinned } = req.body;

    // 验证文档属于当前用户
    const existing = await prisma.knowledgeDoc.findFirst({
      where: { id: req.params.id, userId: req.user!.id }
    });
    if (!existing) {
      return res.status(404).json({ error: '文档不存在' });
    }

    const doc = await prisma.knowledgeDoc.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(summary !== undefined && { summary }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(tags && { tags: JSON.stringify(tags) }),
        ...(isPinned !== undefined && { isPinned }),
      },
      include: { category: true },
    });

    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: '更新文档失败' });
  }
});

// 更新文档内容（自动创建版本）
knowledgeRouter.put('/docs/:id/content', async (req, res) => {
  try {
    const { content, changeNote } = req.body;
    if (!content) {
      return res.status(400).json({ error: '内容不能为空' });
    }

    const doc = await prisma.knowledgeDoc.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!doc) {
      return res.status(404).json({ error: '文档不存在' });
    }

    // 保存当前版本到历史
    const versionFileName = `${doc.id}_v${doc.version}.md`;
    const versionFilePath = path.join(VERSIONS_DIR, versionFileName);

    const docFilePath = doc.filePath.replace(/\\/g, '/');
    if (fs.existsSync(docFilePath)) {
      fs.copyFileSync(docFilePath, versionFilePath);
    }

    await prisma.knowledgeVersion.create({
      data: {
        docId: doc.id,
        version: doc.version,
        filePath: versionFilePath,
        changeNote,
      },
    });

    // 清理旧版本（只保留最近5个）
    const versions = await prisma.knowledgeVersion.findMany({
      where: { docId: doc.id },
      orderBy: { version: 'desc' },
    });
    if (versions.length > 5) {
      const toDelete = versions.slice(5);
      for (const v of toDelete) {
        if (fs.existsSync(v.filePath)) {
          fs.unlinkSync(v.filePath);
        }
        await prisma.knowledgeVersion.delete({ where: { id: v.id } });
      }
    }

    // 写入新内容
    fs.writeFileSync(docFilePath, content, 'utf-8');
    const { wordCount, readTime } = calculateReadingStats(content);

    const updated = await prisma.knowledgeDoc.update({
      where: { id: req.params.id },
      data: {
        version: doc.version + 1,
        wordCount,
        readTime,
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '更新文档内容失败' });
  }
});

// 删除文档
knowledgeRouter.delete('/docs/:id', async (req, res) => {
  try {
    const doc = await prisma.knowledgeDoc.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { versions: true },
    });
    if (!doc) {
      return res.status(404).json({ error: '文档不存在' });
    }

    // 删除主文件
    const mainFilePath = doc.filePath.replace(/\\/g, '/');
    if (fs.existsSync(mainFilePath)) {
      fs.unlinkSync(mainFilePath);
    }

    // 删除版本文件
    for (const v of doc.versions) {
      const vFilePath = v.filePath.replace(/\\/g, '/');
      if (fs.existsSync(vFilePath)) {
        fs.unlinkSync(vFilePath);
      }
    }

    await prisma.knowledgeDoc.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除文档失败' });
  }
});

// ========== 批量操作 API ==========

// 批量删除文档
knowledgeRouter.post('/docs/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供要删除的文档ID列表' });
    }

    const docs = await prisma.knowledgeDoc.findMany({
      where: { id: { in: ids }, userId: req.user!.id },
      include: { versions: true },
    });

    // 删除文件
    for (const doc of docs) {
      const docPath = doc.filePath.replace(/\\/g, '/');
      if (fs.existsSync(docPath)) {
        fs.unlinkSync(docPath);
      }
      for (const v of doc.versions) {
        const vPath = v.filePath.replace(/\\/g, '/');
        if (fs.existsSync(vPath)) {
          fs.unlinkSync(vPath);
        }
      }
    }

    await prisma.knowledgeDoc.deleteMany({ where: { id: { in: ids }, userId: req.user!.id } });
    res.json({ success: true, count: docs.length });
  } catch (error) {
    res.status(500).json({ error: '批量删除失败' });
  }
});

// 批量修改分类
knowledgeRouter.post('/docs/batch-category', async (req, res) => {
  try {
    const { ids, categoryId } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供要修改的文档ID列表' });
    }

    await prisma.knowledgeDoc.updateMany({
      where: { id: { in: ids }, userId: req.user!.id },
      data: { categoryId: categoryId || null },
    });

    res.json({ success: true, count: ids.length });
  } catch (error) {
    res.status(500).json({ error: '批量修改分类失败' });
  }
});

// 批量添加标签
knowledgeRouter.post('/docs/batch-tags', async (req, res) => {
  try {
    const { ids, tags, mode } = req.body; // mode: 'add' | 'replace'
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供要修改的文档ID列表' });
    }

    if (mode === 'replace') {
      await prisma.knowledgeDoc.updateMany({
        where: { id: { in: ids }, userId: req.user!.id },
        data: { tags: JSON.stringify(tags || []) },
      });
    } else {
      // 添加模式：需要逐个处理
      const docs = await prisma.knowledgeDoc.findMany({
        where: { id: { in: ids }, userId: req.user!.id },
        select: { id: true, tags: true },
      });

      for (const doc of docs) {
        const existingTags = JSON.parse(doc.tags || '[]');
        const newTags = [...new Set([...existingTags, ...(tags || [])])];
        await prisma.knowledgeDoc.update({
          where: { id: doc.id },
          data: { tags: JSON.stringify(newTags) },
        });
      }
    }

    res.json({ success: true, count: ids.length });
  } catch (error) {
    res.status(500).json({ error: '批量修改标签失败' });
  }
});

// ========== 版本管理 API ==========

// 获取版本列表
knowledgeRouter.get('/docs/:id/versions', async (req, res) => {
  try {
    const versions = await prisma.knowledgeVersion.findMany({
      where: { docId: req.params.id },
      orderBy: { version: 'desc' },
    });
    res.json(versions);
  } catch (error) {
    res.status(500).json({ error: '获取版本列表失败' });
  }
});

// 获取特定版本内容
knowledgeRouter.get('/docs/:id/versions/:version/content', async (req, res) => {
  try {
    const version = await prisma.knowledgeVersion.findFirst({
      where: {
        docId: req.params.id,
        version: parseInt(req.params.version),
      },
    });
    const versionFilePath = version?.filePath.replace(/\\/g, '/');
    if (!version || !versionFilePath || !fs.existsSync(versionFilePath)) {
      return res.status(404).json({ error: '版本不存在' });
    }
    const content = fs.readFileSync(versionFilePath, 'utf-8');
    res.json({ content, version: version.version });
  } catch (error) {
    res.status(500).json({ error: '获取版本内容失败' });
  }
});

// 回滚到指定版本
knowledgeRouter.post('/docs/:id/rollback', async (req, res) => {
  try {
    const { version } = req.body;
    const versionRecord = await prisma.knowledgeVersion.findFirst({
      where: { docId: req.params.id, version },
    });
    if (!versionRecord || !fs.existsSync(versionRecord.filePath)) {
      return res.status(404).json({ error: '版本不存在' });
    }

    const doc = await prisma.knowledgeDoc.findUnique({
      where: { id: req.params.id },
    });
    if (!doc) {
      return res.status(404).json({ error: '文档不存在' });
    }

    // 读取旧版本内容并写入当前文件
    const content = fs.readFileSync(versionRecord.filePath, 'utf-8');
    fs.writeFileSync(doc.filePath, content, 'utf-8');

    const { wordCount, readTime } = calculateReadingStats(content);
    const updated = await prisma.knowledgeDoc.update({
      where: { id: req.params.id },
      data: { wordCount, readTime },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '回滚失败' });
  }
});

// ========== 分类管理 API ==========

// 获取分类树
knowledgeRouter.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.knowledgeCategory.findMany({
      include: {
        children: true,
        _count: { select: { docs: true } },
      },
      where: { parentId: null },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: '获取分类失败' });
  }
});

// 创建分类
knowledgeRouter.post('/categories', async (req, res) => {
  try {
    const { name, icon, color, parentId } = req.body;
    if (!name) {
      return res.status(400).json({ error: '分类名称不能为空' });
    }
    const slug = generateSlug(name);
    const category = await prisma.knowledgeCategory.create({
      data: { name, slug, icon, color, parentId },
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: '创建分类失败' });
  }
});

// 更新分类
knowledgeRouter.put('/categories/:id', async (req, res) => {
  try {
    const { name, icon, color, sortOrder } = req.body;
    const category = await prisma.knowledgeCategory.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: '更新分类失败' });
  }
});

// 删除分类
knowledgeRouter.delete('/categories/:id', async (req, res) => {
  try {
    // 将该分类下的文档设为未分类
    await prisma.knowledgeDoc.updateMany({
      where: { categoryId: req.params.id },
      data: { categoryId: null },
    });
    await prisma.knowledgeCategory.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除分类失败' });
  }
});

// ========== 标签 API ==========

// 获取所有标签及统计
knowledgeRouter.get('/tags', async (req, res) => {
  try {
    const docs = await prisma.knowledgeDoc.findMany({
      where: { userId: req.user!.id },
      select: { tags: true },
    });

    const tagCount: Record<string, number> = {};
    for (const doc of docs) {
      const tags = JSON.parse(doc.tags || '[]');
      for (const tag of tags) {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      }
    }

    const result = Object.entries(tagCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '获取标签失败' });
  }
});

// 重命名标签
knowledgeRouter.post('/tags/rename', async (req, res) => {
  try {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) {
      return res.status(400).json({ error: '标签名称不能为空' });
    }

    const docs = await prisma.knowledgeDoc.findMany({
      where: { userId: req.user!.id },
      select: { id: true, tags: true },
    });

    for (const doc of docs) {
      try {
        const tags = JSON.parse(doc.tags || '[]');
        if (Array.isArray(tags) && tags.includes(oldName)) {
          const newTags = tags.map(t => t === oldName ? newName : t);
          await prisma.knowledgeDoc.update({
            where: { id: doc.id },
            data: { tags: JSON.stringify(newTags) },
          });
        }
      } catch (e) {
        console.error(`处理文档 ${doc.id} 标签失败:`, e);
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '重命名标签失败' });
  }
});

// 删除标签
knowledgeRouter.post('/tags/delete', async (req, res) => {
  try {
    const { tagName } = req.body;
    if (!tagName) {
      return res.status(400).json({ error: '标签名称不能为空' });
    }

    const docs = await prisma.knowledgeDoc.findMany({
      where: { userId: req.user!.id },
      select: { id: true, tags: true },
    });

    for (const doc of docs) {
      try {
        const tags = JSON.parse(doc.tags || '[]');
        if (Array.isArray(tags) && tags.includes(tagName)) {
          const newTags = tags.filter(t => t !== tagName);
          await prisma.knowledgeDoc.update({
            where: { id: doc.id },
            data: { tags: JSON.stringify(newTags) },
          });
        }
      } catch (e) {
        console.error(`处理文档 ${doc.id} 标签失败:`, e);
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除标签失败' });
  }
});

// ========== 导入 API ==========

// 从文件读取内容（支持多种格式）
async function readFileContent(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    // 动态导入 pdf-parse 避免启动时的测试文件问题
    const pdfParse = (await import('pdf-parse')).default;
    const pdfData = await pdfParse(dataBuffer);
    return pdfData.text || '';
  } else {
    // .md 和 .txt 直接读取
    return fs.readFileSync(filePath, 'utf-8');
  }
}

// 文件上传导入（带错误处理）
knowledgeRouter.post('/import/upload', (req, res, next) => {
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
knowledgeRouter.post('/import/directory', async (req, res) => {
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
knowledgeRouter.post('/import/directory-stream', async (req, res) => {
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

// ========== AI 服务配置 API ==========

// 获取 AI 服务列表
knowledgeRouter.get('/config/services', async (req, res) => {
  try {
    const services = await prisma.aIServiceConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });
    // 隐藏 API Key 的部分内容
    const masked = services.map(s => ({
      ...s,
      apiKey: s.apiKey ? `${s.apiKey.substring(0, 8)}...${s.apiKey.slice(-4)}` : '',
    }));
    res.json(masked);
  } catch (error) {
    res.status(500).json({ error: '获取服务配置失败' });
  }
});

// 添加 AI 服务
knowledgeRouter.post('/config/services', async (req, res) => {
  try {
    const { name, provider, apiKey, baseUrl, model, isDefault } = req.body;
    if (!name || !provider || !apiKey || !model) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 如果设为默认，先取消其他默认
    if (isDefault) {
      await prisma.aIServiceConfig.updateMany({
        data: { isDefault: false },
      });
    }

    const service = await prisma.aIServiceConfig.create({
      data: { name, provider, apiKey, baseUrl, model, isDefault: isDefault || false },
    });
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: '添加服务失败' });
  }
});

// 更新 AI 服务
knowledgeRouter.put('/config/services/:id', async (req, res) => {
  try {
    const { name, apiKey, baseUrl, model, isDefault, isEnabled } = req.body;

    if (isDefault) {
      await prisma.aIServiceConfig.updateMany({
        data: { isDefault: false },
      });
    }

    const service = await prisma.aIServiceConfig.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(apiKey && { apiKey }),
        ...(baseUrl !== undefined && { baseUrl }),
        ...(model && { model }),
        ...(isDefault !== undefined && { isDefault }),
        ...(isEnabled !== undefined && { isEnabled }),
      },
    });
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: '更新服务失败' });
  }
});

// 删除 AI 服务
knowledgeRouter.delete('/config/services/:id', async (req, res) => {
  try {
    await prisma.aIServiceConfig.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除服务失败' });
  }
});

// ========== AI 功能 API ==========

// AI 生成内容
knowledgeRouter.post('/ai/generate', async (req, res) => {
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
knowledgeRouter.post('/ai/summarize', async (req, res) => {
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
knowledgeRouter.post('/ai/search', async (req, res) => {
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
knowledgeRouter.post('/ai/fetch-url', async (req, res) => {
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
knowledgeRouter.get('/export', async (req, res) => {
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
      const { exportToJSON } = await import('../services/knowledge/exportFormats');
      const json = exportToJSON(docs);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="knowledge-export.json"');
      return res.send(json);
    }

    // OPML 格式导出
    if (format === 'opml') {
      const { exportToOPML } = await import('../services/knowledge/exportFormats');
      const opml = exportToOPML(docs);
      res.setHeader('Content-Type', 'text/xml');
      res.setHeader('Content-Disposition', 'attachment; filename="knowledge-export.opml"');
      return res.send(opml);
    }

    const categories = await prisma.knowledgeCategory.findMany();

    // Notion 兼容 Markdown ZIP
    if (format === 'notion') {
      const { exportToNotionMd } = await import('../services/knowledge/exportFormats');
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
knowledgeRouter.post('/sync/obsidian', async (req, res) => {
  try {
    const { vaultPath, categoryId } = req.body;
    if (!vaultPath) {
      return res.status(400).json({ error: '请提供 Obsidian Vault 路径' });
    }

    const { syncFromObsidian } = await import('../services/knowledge/obsidianSync');
    const result = await syncFromObsidian(vaultPath, req.user!.id, categoryId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || '同步失败' });
  }
});

// ========== Google Drive 导出 ==========

knowledgeRouter.post('/export/google-drive', async (req, res) => {
  try {
    const { accessToken, folderId, docIds, format } = req.body;
    if (!accessToken || !docIds || !Array.isArray(docIds) || docIds.length === 0) {
      return res.status(400).json({ error: '请提供 accessToken 和文档ID列表' });
    }

    const { uploadToGoogleDrive } = await import('../services/knowledge/googleDrive');
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
knowledgeRouter.post('/import/json', async (req, res) => {
  try {
    const { content, categoryId } = req.body;
    if (!content) {
      return res.status(400).json({ error: '请提供 JSON 内容' });
    }
    const { importFromJSON } = await import('../services/knowledge/exportFormats');
    const result = await importFromJSON(content, req.user!.id, categoryId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'JSON 导入失败' });
  }
});

// 从 Notion HTML 导入
knowledgeRouter.post('/import/notion', async (req, res) => {
  try {
    const { content, categoryId } = req.body;
    if (!content) {
      return res.status(400).json({ error: '请提供 Notion HTML 内容' });
    }
    const { importFromNotionHTML } = await import('../services/knowledge/exportFormats');
    const result = await importFromNotionHTML(content, req.user!.id, categoryId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Notion 导入失败' });
  }
});

// 从 Logseq Markdown 导入
knowledgeRouter.post('/import/logseq', async (req, res) => {
  try {
    const { content, title, categoryId } = req.body;
    if (!content || !title) {
      return res.status(400).json({ error: '请提供内容和标题' });
    }
    const { importFromLogseq } = await import('../services/knowledge/exportFormats');
    const result = await importFromLogseq(content, title, req.user!.id, categoryId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Logseq 导入失败' });
  }
});

// ========== 全文搜索 ==========

// 全文搜索（搜索文档内容）
knowledgeRouter.get('/search/fulltext', async (req, res) => {
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
knowledgeRouter.get('/graph', async (req, res) => {
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
knowledgeRouter.get('/docs/:id/related', async (req, res) => {
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
knowledgeRouter.post('/docs/:id/embed', async (req, res) => {
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
knowledgeRouter.post('/embed/batch', async (req, res) => {
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
knowledgeRouter.get('/embed/status', async (req, res) => {
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
knowledgeRouter.get('/search/semantic', async (req, res) => {
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
