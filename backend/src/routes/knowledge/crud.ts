import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import {
  prisma,
  KNOWLEDGE_DIR,
  VERSIONS_DIR,
  generateSlug,
  calculateReadingStats,
} from './shared.js';

export const crudRouter = Router();

// ========== 文档 API ==========

// 获取文档列表
crudRouter.get('/docs', async (req, res) => {
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
crudRouter.get('/docs/:id', async (req, res) => {
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
crudRouter.get('/docs/:id/content', async (req, res) => {
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
crudRouter.post('/docs', async (req, res) => {
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
crudRouter.put('/docs/:id', async (req, res) => {
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
crudRouter.put('/docs/:id/content', async (req, res) => {
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
crudRouter.delete('/docs/:id', async (req, res) => {
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
crudRouter.post('/docs/batch-delete', async (req, res) => {
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
crudRouter.post('/docs/batch-category', async (req, res) => {
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
crudRouter.post('/docs/batch-tags', async (req, res) => {
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
crudRouter.get('/docs/:id/versions', async (req, res) => {
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
crudRouter.get('/docs/:id/versions/:version/content', async (req, res) => {
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
crudRouter.post('/docs/:id/rollback', async (req, res) => {
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
crudRouter.get('/categories', async (req, res) => {
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
crudRouter.post('/categories', async (req, res) => {
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
crudRouter.put('/categories/:id', async (req, res) => {
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
crudRouter.delete('/categories/:id', async (req, res) => {
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
crudRouter.get('/tags', async (req, res) => {
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
crudRouter.post('/tags/rename', async (req, res) => {
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
crudRouter.post('/tags/delete', async (req, res) => {
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

// ========== AI 服务配置 API ==========

// 获取 AI 服务列表
crudRouter.get('/config/services', async (req, res) => {
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
crudRouter.post('/config/services', async (req, res) => {
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
crudRouter.put('/config/services/:id', async (req, res) => {
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
crudRouter.delete('/config/services/:id', async (req, res) => {
  try {
    await prisma.aIServiceConfig.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除服务失败' });
  }
});
