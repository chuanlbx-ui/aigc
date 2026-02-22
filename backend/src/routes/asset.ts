import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import {
  getGenerator,
  getAllProviders,
  getProvidersByType,
  getAvailableProviders,
  GenerateOptions,
} from '../generators/index.js';
import {
  getSearchersInfo,
  getSearcher,
  BatchDownloadItem,
} from '../searchers/index.js';
import { requireAuth } from '../middleware/auth.js';
import { getDefaultAIConfig, createAIService } from '../services/ai/index.js';

const prisma = new PrismaClient();
export const assetRouter = Router();

// 确保上传目录存在
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  }
});

// 获取素材列表
assetRouter.get('/', requireAuth, async (req, res) => {
  const { categoryId } = req.query;
  let where: any = { userId: req.user!.id };

  if (categoryId === 'uncategorized') {
    where.categoryId = null;
  } else if (categoryId) {
    where.categoryId = categoryId as string;
  }

  const assets = await prisma.asset.findMany({
    where,
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(assets);
});

// 上传素材
assetRouter.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '未上传文件' });
  }
  // 修复中文文件名乱码
  const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  // 判断文件类型
  let type = 'image';
  if (req.file.mimetype.startsWith('video')) {
    type = 'video';
  } else if (req.file.mimetype.startsWith('audio')) {
    type = 'audio';
  }
  const asset = await prisma.asset.create({
    data: {
      name: originalName,
      type,
      path: req.file.path,
      userId: req.user!.id,
    },
  });
  res.json(asset);
});

// 删除素材
assetRouter.delete('/:id', requireAuth, async (req, res) => {
  const asset = await prisma.asset.findFirst({
    where: { id: req.params.id, userId: req.user!.id }
  });
  if (!asset) {
    return res.status(404).json({ error: '素材不存在' });
  }
  if (fs.existsSync(asset.path)) {
    fs.unlinkSync(asset.path);
  }
  await prisma.asset.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// 获取素材文件（支持 Range 请求，用于视频 seek）
// 注意：这个路由不使用 requireAuth 中间件，而是手动验证 token
assetRouter.get('/file/:id', async (req, res) => {
  // 从 header 或 query 参数获取 token
  let token = req.headers.authorization?.replace('Bearer ', '');
  if (!token && req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  // 验证 token
  const { validateToken } = await import('../services/auth.js');
  const user = await validateToken(token);
  if (!user) {
    return res.status(401).json({ error: '认证令牌无效' });
  }

  const asset = await prisma.asset.findFirst({
    where: { id: req.params.id, userId: user.id }
  });
  if (!asset) {
    return res.status(404).json({ error: '素材不存在' });
  }
  const filePath = path.resolve(asset.path.replace(/\\/g, '/'));
  console.log(`[资源文件] ID: ${req.params.id}, 路径: ${asset.path}, 解析后: ${filePath}, 存在: ${fs.existsSync(filePath)}`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '文件不存在', path: asset.path, resolved: filePath });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // 设置 MIME 类型
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  if (range) {
    // 处理 Range 请求（视频 seek）
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    });

    const stream = fs.createReadStream(filePath, { start, end });
    stream.pipe(res);
  } else {
    // 普通请求
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

// ========== 分类管理 API ==========

// 获取分类列表
assetRouter.get('/categories', requireAuth, async (req, res) => {
  const { type } = req.query;
  const where = type && type !== 'all' ? { type: type as string } : {};
  const categories = await prisma.assetCategory.findMany({
    where,
    include: { _count: { select: { assets: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(categories);
});

// 创建分类
assetRouter.post('/categories', requireAuth, async (req, res) => {
  const { name, type } = req.body;
  const category = await prisma.assetCategory.create({
    data: { name, type: type || 'all' },
  });
  res.json(category);
});

// 删除分类
assetRouter.delete('/categories/:id', requireAuth, async (req, res) => {
  // 先将该分类下的素材设为未分类
  await prisma.asset.updateMany({
    where: { categoryId: req.params.id },
    data: { categoryId: null },
  });
  await prisma.assetCategory.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// 更新素材分类
assetRouter.put('/:id/category', requireAuth, async (req, res) => {
  const { categoryId } = req.body;
  // 验证素材属于当前用户
  const existing = await prisma.asset.findFirst({
    where: { id: req.params.id, userId: req.user!.id }
  });
  if (!existing) {
    return res.status(404).json({ error: '素材不存在' });
  }
  const asset = await prisma.asset.update({
    where: { id: req.params.id },
    data: { categoryId: categoryId || null },
  });
  res.json(asset);
});

// ========== 批量操作 API ==========

// 批量更新素材分类
assetRouter.put('/batch/category', requireAuth, async (req, res) => {
  const { ids, categoryId } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: '请提供素材ID列表' });
  }
  await prisma.asset.updateMany({
    where: { id: { in: ids }, userId: req.user!.id },
    data: { categoryId: categoryId || null },
  });
  res.json({ success: true, count: ids.length });
});

// 批量重命名素材
assetRouter.put('/batch/rename', requireAuth, async (req, res) => {
  const { renames } = req.body; // [{ id, name }]
  if (!Array.isArray(renames) || renames.length === 0) {
    return res.status(400).json({ error: '请提供重命名列表' });
  }
  const results = await Promise.all(
    renames.map(({ id, name }) =>
      prisma.asset.update({ where: { id }, data: { name } })
    )
  );
  res.json({ success: true, count: results.length });
});

// 批量删除素材
assetRouter.delete('/batch', requireAuth, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: '请提供素材ID列表' });
  }
  // 先获取属于当前用户的文件
  const assets = await prisma.asset.findMany({
    where: { id: { in: ids }, userId: req.user!.id },
  });
  // 删除文件
  for (const asset of assets) {
    if (fs.existsSync(asset.path)) {
      fs.unlinkSync(asset.path);
    }
  }
  // 删除数据库记录
  await prisma.asset.deleteMany({
    where: { id: { in: ids }, userId: req.user!.id },
  });
  res.json({ success: true, count: assets.length });
});

// ========== 清理孤立资源 API ==========

// 检查孤立资源（试运行）
assetRouter.get('/cleanup/check', requireAuth, async (req, res) => {
  try {
    const assets = await prisma.asset.findMany({
      where: { userId: req.user!.id },
      select: { id: true, name: true, type: true, path: true, createdAt: true },
    });

    const missingAssets = [];
    for (const asset of assets) {
      let filePath = asset.path.replace(/\\/g, '/');
      if (!path.isAbsolute(filePath)) {
        filePath = path.resolve(filePath);
      }
      if (!fs.existsSync(filePath)) {
        missingAssets.push({
          id: asset.id,
          name: asset.name,
          type: asset.type,
          path: asset.path,
          resolvedPath: filePath,
          createdAt: asset.createdAt,
        });
      }
    }

    res.json({
      total: assets.length,
      missing: missingAssets.length,
      assets: missingAssets,
    });
  } catch (error) {
    res.status(500).json({ error: '检查失败', message: String(error) });
  }
});

// 执行清理（删除孤立资源记录）
assetRouter.post('/cleanup/execute', requireAuth, async (req, res) => {
  try {
    const assets = await prisma.asset.findMany({
      where: { userId: req.user!.id },
      select: { id: true, name: true, path: true },
    });

    const idsToDelete = [];
    for (const asset of assets) {
      let filePath = asset.path.replace(/\\/g, '/');
      if (!path.isAbsolute(filePath)) {
        filePath = path.resolve(filePath);
      }
      if (!fs.existsSync(filePath)) {
        idsToDelete.push(asset.id);
      }
    }

    if (idsToDelete.length > 0) {
      await prisma.asset.deleteMany({
        where: { id: { in: idsToDelete }, userId: req.user!.id },
      });
    }

    res.json({
      success: true,
      deletedCount: idsToDelete.length,
    });
  } catch (error) {
    res.status(500).json({ error: '清理失败', message: String(error) });
  }
});

// ========== 素材生成 API ==========

// 中文关键词映射表（扩展版）
const KEYWORD_MAP: Record<string, string> = {
  // 科技类
  '人工智能': 'artificial intelligence robot',
  'AI': 'artificial intelligence technology',
  '科技': 'technology digital innovation',
  '互联网': 'internet network connection',
  '数据': 'data analytics chart visualization',
  '机器人': 'robot automation machine',
  '编程': 'programming coding developer laptop',
  '软件': 'software application interface',
  '手机': 'smartphone mobile device',
  '电脑': 'computer laptop workspace',
  '智能': 'smart AI technology',
  '自动': 'automation process',
  '未来': 'future technology innovation',
  '创新': 'innovation creative idea',

  // 商业类
  '商业': 'business meeting office professional',
  '金融': 'finance money investment banking',
  '创业': 'startup entrepreneur business',
  '团队': 'team collaboration teamwork',
  '会议': 'meeting conference business',
  '工作': 'work office professional desk',
  '效率': 'efficiency productivity workspace',
  '管理': 'management leadership business',
  '市场': 'market business commerce',
  '销售': 'sales business deal handshake',

  // 教育类
  '教育': 'education learning classroom',
  '学习': 'study learning student books',
  '学校': 'school education campus',
  '培训': 'training workshop education',
  '知识': 'knowledge books library',

  // 生活类
  '生活': 'lifestyle daily life modern',
  '健康': 'health wellness fitness',
  '美食': 'food cuisine restaurant delicious',
  '旅行': 'travel vacation landscape adventure',
  '家庭': 'family home happiness',
  '运动': 'sports fitness exercise',
  '音乐': 'music concert performance',
  '艺术': 'art creative design',

  // 自然类
  '城市': 'city urban skyline modern',
  '自然': 'nature landscape green',
  '环境': 'environment green eco',
  '海洋': 'ocean sea beach water',
  '山': 'mountain landscape nature',
  '森林': 'forest trees nature green',

  // 医疗类
  '医疗': 'healthcare medical hospital',
  '医生': 'doctor medical professional',
  '健身': 'fitness gym workout',
};

// 从文本提取关键词（基础版，使用映射表）
function extractKeywords(text: string): Array<{ chinese: string; english: string }> {
  const keywords: Array<{ chinese: string; english: string }> = [];
  for (const [cn, en] of Object.entries(KEYWORD_MAP)) {
    if (text.includes(cn)) {
      keywords.push({ chinese: cn, english: en });
    }
  }
  if (keywords.length === 0) {
    keywords.push({ chinese: '科技', english: 'technology abstract' });
  }
  return keywords.slice(0, 10);
}

// AI 智能提取关键词（增强版）
async function extractKeywordsWithAI(text: string): Promise<Array<{ chinese: string; english: string }>> {
  try {
    const config = await getDefaultAIConfig();
    if (!config) {
      return extractKeywords(text);
    }

    const prompt = `从以下文本中提取5-8个最能代表内容主题的关键词，用于搜索配图素材。

要求：
1. 提取具体、可视化的名词（如"办公室"、"医生"、"城市夜景"、"笔记本电脑"）
2. 避免抽象概念（如"效率"、"创新"、"价值"）
3. 优先选择能找到高质量图片的词汇
4. 返回JSON数组格式

文本内容：
${text.substring(0, 800)}

请直接返回JSON数组，格式如下：
[{"chinese": "中文关键词", "english": "English keywords for image search"}]`;

    const service = createAIService(config);
    const result = await service.generateContent(prompt);

    // 解析 JSON 结果
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 8);
      }
    }
  } catch (error) {
    console.error('AI 提取关键词失败，降级到映射表:', error);
  }

  // 降级到基础版
  return extractKeywords(text);
}

// 获取可用的生成服务列表
assetRouter.get('/generators', requireAuth, async (req, res) => {
  const { type } = req.query;
  if (type === 'image' || type === 'video') {
    res.json(getProvidersByType(type));
  } else {
    res.json(getAllProviders());
  }
});

// 获取已配置的生成服务
assetRouter.get('/generators/available', requireAuth, async (req, res) => {
  res.json(getAvailableProviders());
});

// 从文稿提取关键词（预览）
assetRouter.post('/extract-keywords', requireAuth, async (req, res) => {
  const { text, useAI = true } = req.body;
  if (!text) {
    return res.status(400).json({ error: '请提供文稿内容' });
  }
  const keywords = useAI ? await extractKeywordsWithAI(text) : extractKeywords(text);
  const suggestedCount = Math.min(Math.ceil(text.length / 100), 10);
  res.json({ keywords, suggestedCount });
});

// 生成素材
assetRouter.post('/generate', requireAuth, async (req, res) => {
  const { text, projectName, provider, mediaType, count, orientation } = req.body;

  if (!text) {
    return res.status(400).json({ error: '请提供文稿内容' });
  }
  if (!provider) {
    return res.status(400).json({ error: '请选择生成服务' });
  }

  const generator = getGenerator(provider);
  if (!generator) {
    return res.status(400).json({ error: `不支持的生成服务: ${provider}` });
  }

  if (!generator.checkApiKey()) {
    return res.status(400).json({
      error: `未配置 ${generator.info.apiKeyEnvVar}`
    });
  }

  try {
    // 提取关键词（使用 AI 智能提取）
    const keywords = await extractKeywordsWithAI(text);
    const englishKeywords = keywords.map(k => k.english);
    const generateCount = count || Math.min(Math.ceil(text.length / 100), 5);

    // 创建分类
    const date = new Date().toISOString().split('T')[0];
    const categoryName = `AI生成-${projectName || '未命名'}-${date}`;

    const category = await prisma.assetCategory.create({
      data: { name: categoryName, type: mediaType || 'image' },
    });

    // 生成素材
    const assets = [];
    for (let i = 0; i < generateCount; i++) {
      const keywordSet = englishKeywords.slice(
        i % englishKeywords.length,
        (i % englishKeywords.length) + 3
      );

      const options: GenerateOptions = {
        prompt: keywordSet.join(', '),
        keywords: keywordSet,
        orientation: orientation || 'landscape',
      };

      const media = await generator.generate(options);
      const localPath = await generator.downloadToLocal(media, uploadDir);

      const asset = await prisma.asset.create({
        data: {
          name: `${provider}-${i + 1}-${Date.now()}`,
          type: media.type,
          path: localPath,
          categoryId: category.id,
          userId: req.user!.id,
        },
      });

      // 添加 url 字段供前端使用
      assets.push({
        ...asset,
        url: `/api/assets/file/${asset.id}`,
      });
    }

    res.json({
      success: true,
      assets,
      categoryId: category.id,
      categoryName,
    });
  } catch (error: any) {
    console.error('生成素材失败:', error);
    res.status(500).json({ error: error.message || '生成失败' });
  }
});

// ========== 素材搜索 API ==========

// 获取可用的搜索器列表
assetRouter.get('/searchers', requireAuth, async (_req, res) => {
  res.json({ searchers: getSearchersInfo() });
});

// 执行搜索
assetRouter.post('/search', requireAuth, async (req, res) => {
  const { searcher, query, type, page = 1, perPage = 20 } = req.body;

  if (!searcher) {
    return res.status(400).json({ error: '请选择搜索源' });
  }
  if (!query) {
    return res.status(400).json({ error: '请输入搜索关键词' });
  }

  const searcherInstance = getSearcher(searcher);
  if (!searcherInstance) {
    return res.status(400).json({ error: `不支持的搜索源: ${searcher}` });
  }

  if (!searcherInstance.isConfigured()) {
    return res.status(400).json({ error: `${searcher} API Key 未配置` });
  }

  try {
    const result = await searcherInstance.search({ query, type, page, perPage });
    res.json(result);
  } catch (error: any) {
    console.error('搜索失败:', error);
    res.status(500).json({ error: error.message || '搜索失败' });
  }
});

// 批量下载素材
assetRouter.post('/batch-download', requireAuth, async (req, res) => {
  const { items, categoryId } = req.body as {
    items: BatchDownloadItem[];
    categoryId?: string;
  };

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '请选择要下载的素材' });
  }

  const results: Array<{ id: string; name: string; url: string }> = [];
  const errors: string[] = [];

  for (const item of items) {
    try {
      // 下载文件
      const response = await fetch(item.downloadUrl);
      if (!response.ok) {
        throw new Error(`下载失败: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();

      // 确定文件扩展名
      let ext = '.jpg';
      if (item.type === 'video') ext = '.mp4';
      else if (item.type === 'audio') ext = '.mp3';

      const filename = `${uuid()}${ext}`;
      const filePath = path.join(uploadDir, filename);

      fs.writeFileSync(filePath, Buffer.from(buffer));

      // 创建素材记录
      const asset = await prisma.asset.create({
        data: {
          name: item.title || `${item.source}-${Date.now()}`,
          type: item.type,
          path: filePath,
          categoryId: categoryId || null,
          userId: req.user!.id,
        },
      });

      results.push({
        id: asset.id,
        name: asset.name,
        url: `/api/assets/file/${asset.id}`,
      });
    } catch (error: any) {
      errors.push(`${item.title}: ${error.message}`);
    }
  }

  res.json({
    success: results.length,
    failed: errors.length,
    assets: results,
    errors: errors.length > 0 ? errors : undefined,
  });
});
