import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { KeywordExtractor } from '../services/nlp/KeywordExtractor.js';
import { TimePointCalculator } from '../services/nlp/TimePointCalculator.js';

const prisma = new PrismaClient();
export const popupTemplateRouter = Router();

// NLP 服务实例
const keywordExtractor = new KeywordExtractor();
const timePointCalculator = new TimePointCalculator();

// 系统预设模板
const systemTemplates = [
  {
    name: '标准文字提示',
    description: '居中显示的半透明文字弹窗，适合重点提示',
    config: {
      contentType: 'text',
      textContent: '提示文字',
      textAlign: 'center',
      fontSize: 28,
      textColor: '#ffffff',
      fontWeight: 'bold',
      width: 400,
      height: 120,
      position: 'center',
      enterAnimation: 'fade',
      exitAnimation: 'fade',
      animationDuration: 15,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      borderRadius: 12,
      padding: 20,
      zIndex: 100,
    },
  },
  {
    name: '底部字幕条',
    description: '视频底部的字幕样式弹窗',
    config: {
      contentType: 'text',
      textContent: '字幕内容',
      textAlign: 'center',
      fontSize: 24,
      textColor: '#ffffff',
      width: 800,
      height: 60,
      position: 'bottom-center',
      offsetY: -50,
      enterAnimation: 'fade',
      exitAnimation: 'fade',
      animationDuration: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      borderRadius: 8,
      padding: 12,
      zIndex: 100,
    },
  },
  {
    name: '角标提示',
    description: '右上角小型提示标签',
    config: {
      contentType: 'text',
      textContent: 'NEW',
      textAlign: 'center',
      fontSize: 16,
      textColor: '#ffffff',
      fontWeight: 'bold',
      width: 80,
      height: 36,
      position: 'top-right',
      offsetX: -20,
      offsetY: 20,
      enterAnimation: 'scale',
      exitAnimation: 'fade',
      animationDuration: 15,
      backgroundColor: '#ff4d4f',
      borderRadius: 18,
      padding: 8,
      zIndex: 100,
    },
  },
  {
    name: '左侧滑入信息卡',
    description: '从左侧滑入的信息展示卡片',
    config: {
      contentType: 'text',
      textContent: '信息内容',
      textAlign: 'left',
      fontSize: 20,
      textColor: '#333333',
      width: 300,
      height: 150,
      position: 'center-left',
      offsetX: 30,
      enterAnimation: 'slideLeft',
      exitAnimation: 'slideLeft',
      animationDuration: 20,
      backgroundColor: '#ffffff',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#e8e8e8',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      padding: 20,
      zIndex: 100,
    },
  },
  {
    name: '弹跳强调框',
    description: '带弹跳动画的强调提示',
    config: {
      contentType: 'text',
      textContent: '重要提示！',
      textAlign: 'center',
      fontSize: 32,
      textColor: '#ffffff',
      fontWeight: 'bold',
      width: 350,
      height: 100,
      position: 'center',
      enterAnimation: 'bounce',
      exitAnimation: 'scale',
      animationDuration: 25,
      backgroundColor: '#1890ff',
      borderRadius: 16,
      padding: 24,
      boxShadow: '0 8px 30px rgba(24,144,255,0.4)',
      zIndex: 100,
    },
  },
  {
    name: '图片展示框',
    description: '居中图片展示，带阴影效果',
    config: {
      contentType: 'image',
      mediaFit: 'contain',
      width: 400,
      height: 300,
      position: 'center',
      enterAnimation: 'scale',
      exitAnimation: 'fade',
      animationDuration: 20,
      backgroundColor: '#ffffff',
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#f0f0f0',
      boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      padding: 8,
      zIndex: 100,
    },
  },
  {
    name: '画中画视频',
    description: '右下角小窗视频',
    config: {
      contentType: 'video',
      mediaFit: 'cover',
      videoMuted: true,
      width: 320,
      height: 180,
      position: 'bottom-right',
      offsetX: -20,
      offsetY: -20,
      enterAnimation: 'slideRight',
      exitAnimation: 'slideRight',
      animationDuration: 15,
      backgroundColor: '#000000',
      borderRadius: 8,
      borderWidth: 2,
      borderColor: '#ffffff',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      zIndex: 100,
    },
  },
  {
    name: '霓虹发光文字',
    description: '带霓虹发光效果的文字',
    config: {
      contentType: 'text',
      textContent: 'GLOW',
      textAlign: 'center',
      fontSize: 48,
      textColor: '#00ffff',
      fontWeight: 'bold',
      width: 300,
      height: 100,
      position: 'center',
      enterAnimation: 'fade',
      exitAnimation: 'fade',
      animationDuration: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      borderRadius: 8,
      boxShadow: '0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 30px #00ffff',
      padding: 20,
      zIndex: 100,
    },
  },
  {
    name: '顶部通知栏',
    description: '从顶部滑入的通知条',
    config: {
      contentType: 'text',
      textContent: '通知消息',
      textAlign: 'center',
      fontSize: 18,
      textColor: '#ffffff',
      width: 600,
      height: 50,
      position: 'top-center',
      offsetY: 20,
      enterAnimation: 'slideDown',
      exitAnimation: 'slideUp',
      animationDuration: 15,
      backgroundColor: '#52c41a',
      borderRadius: 25,
      padding: 12,
      zIndex: 100,
    },
  },
  {
    name: '全屏遮罩提示',
    description: '大面积半透明遮罩配合居中文字',
    config: {
      contentType: 'text',
      textContent: '请注意',
      textAlign: 'center',
      fontSize: 56,
      textColor: '#ffffff',
      fontWeight: 'bold',
      width: 800,
      height: 400,
      position: 'center',
      enterAnimation: 'fade',
      exitAnimation: 'fade',
      animationDuration: 30,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      borderRadius: 0,
      padding: 40,
      zIndex: 100,
    },
  },
  // ========== 大字报样式模板 ==========
  {
    name: '大字报-经典红',
    description: '醒目的红底白字大字报样式，适合强调重点',
    config: {
      contentType: 'text',
      textContent: '关键词',
      textAlign: 'center',
      fontSize: 72,
      textColor: '#ffffff',
      fontWeight: 'bold',
      width: 500,
      height: 160,
      position: 'center',
      enterAnimation: 'scale',
      exitAnimation: 'fade',
      animationDuration: 20,
      backgroundColor: '#e53935',
      borderRadius: 0,
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      padding: 32,
      zIndex: 100,
    },
  },
  {
    name: '大字报-科技蓝',
    description: '科技感蓝色大字报，适合科技类内容',
    config: {
      contentType: 'text',
      textContent: '关键词',
      textAlign: 'center',
      fontSize: 72,
      textColor: '#ffffff',
      fontWeight: 'bold',
      width: 500,
      height: 160,
      position: 'center',
      enterAnimation: 'bounce',
      exitAnimation: 'fade',
      animationDuration: 20,
      backgroundColor: '#1976d2',
      borderRadius: 8,
      boxShadow: '0 0 20px rgba(25,118,210,0.5)',
      padding: 32,
      zIndex: 100,
    },
  },
  {
    name: '大字报-金色高端',
    description: '金色渐变大字报，适合高端品质内容',
    config: {
      contentType: 'text',
      textContent: '关键词',
      textAlign: 'center',
      fontSize: 72,
      textColor: '#ffd700',
      fontWeight: 'bold',
      width: 500,
      height: 160,
      position: 'center',
      enterAnimation: 'fade',
      exitAnimation: 'fade',
      animationDuration: 25,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      borderRadius: 4,
      borderWidth: 2,
      borderColor: '#ffd700',
      boxShadow: '0 0 30px rgba(255,215,0,0.3)',
      padding: 32,
      zIndex: 100,
    },
  },
  {
    name: '大字报-清新绿',
    description: '清新绿色大字报，适合环保健康类内容',
    config: {
      contentType: 'text',
      textContent: '关键词',
      textAlign: 'center',
      fontSize: 72,
      textColor: '#ffffff',
      fontWeight: 'bold',
      width: 500,
      height: 160,
      position: 'center',
      enterAnimation: 'slideUp',
      exitAnimation: 'slideDown',
      animationDuration: 18,
      backgroundColor: '#43a047',
      borderRadius: 12,
      boxShadow: '0 8px 24px rgba(67,160,71,0.4)',
      padding: 32,
      zIndex: 100,
    },
  },
  {
    name: '大字报-渐变紫',
    description: '渐变紫色大字报，适合创意类内容',
    config: {
      contentType: 'text',
      textContent: '关键词',
      textAlign: 'center',
      fontSize: 72,
      textColor: '#ffffff',
      fontWeight: 'bold',
      width: 500,
      height: 160,
      position: 'center',
      enterAnimation: 'scale',
      exitAnimation: 'scale',
      animationDuration: 20,
      backgroundColor: '#7b1fa2',
      borderRadius: 16,
      boxShadow: '0 12px 40px rgba(123,31,162,0.5)',
      padding: 32,
      zIndex: 100,
    },
  },
];

// 初始化系统模板
async function initSystemTemplates() {
  const count = await prisma.popupTemplate.count({ where: { isSystem: true } });
  if (count === 0) {
    for (const template of systemTemplates) {
      await prisma.popupTemplate.create({
        data: {
          name: template.name,
          description: template.description,
          category: 'system',
          isSystem: true,
          config: JSON.stringify(template.config),
        },
      });
    }
    console.log('[PopupTemplate] 系统预设模板初始化完成');
  }
}

// 启动时初始化
initSystemTemplates().catch(console.error);

// 获取模板列表
popupTemplateRouter.get('/', async (req, res) => {
  const { category } = req.query;
  const where = category ? { category: category as string } : {};
  const templates = await prisma.popupTemplate.findMany({
    where,
    orderBy: [{ isSystem: 'desc' }, { createdAt: 'desc' }],
  });
  res.json(templates.map(t => ({
    ...t,
    config: JSON.parse(t.config),
  })));
});

// 获取大字报样式模板列表（必须在 /:id 之前定义）
popupTemplateRouter.get('/poster-styles', async (req, res) => {
  const posterTemplates = systemTemplates
    .filter(t => t.name.startsWith('大字报'))
    .map((t, index) => ({
      id: `poster-${index}`,
      name: t.name,
      description: t.description,
      config: t.config,
    }));
  res.json(posterTemplates);
});

// 获取单个模板
popupTemplateRouter.get('/:id', async (req, res) => {
  const template = await prisma.popupTemplate.findUnique({
    where: { id: req.params.id },
  });
  if (!template) {
    return res.status(404).json({ error: '模板不存在' });
  }
  res.json({ ...template, config: JSON.parse(template.config) });
});

// 创建自定义模板
popupTemplateRouter.post('/', async (req, res) => {
  const { name, description, config } = req.body;
  if (!name || !config) {
    return res.status(400).json({ error: '名称和配置不能为空' });
  }
  const template = await prisma.popupTemplate.create({
    data: {
      name,
      description,
      category: 'custom',
      isSystem: false,
      config: JSON.stringify(config),
    },
  });
  res.json({ ...template, config: JSON.parse(template.config) });
});

// 更新模板
popupTemplateRouter.put('/:id', async (req, res) => {
  const existing = await prisma.popupTemplate.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) {
    return res.status(404).json({ error: '模板不存在' });
  }
  if (existing.isSystem) {
    return res.status(403).json({ error: '系统预设模板不可修改' });
  }
  const { name, description, config } = req.body;
  const template = await prisma.popupTemplate.update({
    where: { id: req.params.id },
    data: {
      name: name || existing.name,
      description: description !== undefined ? description : existing.description,
      config: config ? JSON.stringify(config) : existing.config,
    },
  });
  res.json({ ...template, config: JSON.parse(template.config) });
});

// 删除模板
popupTemplateRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.popupTemplate.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) {
    return res.status(404).json({ error: '模板不存在' });
  }
  if (existing.isSystem) {
    return res.status(403).json({ error: '系统预设模板不可删除' });
  }
  await prisma.popupTemplate.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// ========== 自动生成弹窗 API ==========

// 关键词映射表（用于弹窗关键词提取）
const POPUP_KEYWORD_MAP: Record<string, number> = {
  // 科技类
  '人工智能': 10, 'AI': 10, '机器学习': 9, '深度学习': 9,
  '大模型': 9, 'GPT': 9, 'ChatGPT': 10, '算法': 8,
  '数据': 7, '云计算': 8, '区块链': 8, '元宇宙': 8,
  '智能': 7, '自动化': 7, '机器人': 8, '神经网络': 8,
  // 商业类
  '增长': 8, '效率': 7, '成本': 7, '利润': 8,
  '用户': 7, '流量': 8, '转化': 8, '变现': 9,
  '营销': 7, '品牌': 7, '市场': 6, '销售': 7,
  '收入': 8, '投资': 8, '融资': 8, '估值': 8,
  // 数字类
  '亿': 9, '万': 8, '%': 8, '倍': 9,
  // 强调词
  '重要': 9, '关键': 9, '核心': 9, '必须': 8,
  '首次': 9, '最新': 8, '突破': 9, '颠覆': 9,
  '创新': 8, '领先': 8, '独家': 9, '唯一': 9,
  '免费': 9, '限时': 9, '秘密': 8, '揭秘': 8,
  // 行业类
  '医疗': 7, '教育': 7, '金融': 7, '电商': 7,
  '游戏': 7, '社交': 7, '短视频': 8, '直播': 8,
  '汽车': 7, '房产': 7, '旅游': 7, '餐饮': 7,
  // 情感词
  '惊人': 9, '震惊': 9, '意外': 8, '神奇': 8,
  '简单': 7, '快速': 7, '轻松': 7, '高效': 8,
  // 动作词
  '学会': 7, '掌握': 7, '了解': 6, '发现': 7,
  '提升': 7, '改变': 7, '解决': 7, '实现': 7,
};

// 停用词列表（不作为关键词的常见词）
const STOP_WORDS = new Set([
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '那', '他', '她', '它', '们', '这个', '那个', '什么', '怎么',
  '可以', '因为', '所以', '但是', '如果', '虽然', '而且', '或者', '以及',
  '通过', '进行', '使用', '需要', '能够', '已经', '正在', '将会', '应该',
]);

// 从文本中提取有意义的短语
function extractPhrases(
  text: string,
  minLength: number,
  maxLength: number,
  density: number
): Array<{ text: string; importance: number }> {
  const phrases: Array<{ text: string; importance: number; count: number }> = [];

  // 使用正则提取中文词组
  const chinesePattern = /[\u4e00-\u9fa5]{2,}/g;
  const matches = text.match(chinesePattern) || [];

  // 统计词频
  const wordCount = new Map<string, number>();
  for (const word of matches) {
    if (word.length >= minLength && word.length <= maxLength && !STOP_WORDS.has(word)) {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    }
  }

  // 转换为数组并按频率排序
  for (const [word, count] of wordCount.entries()) {
    // 根据词频和长度计算重要性
    const importance = Math.min(10, count * 2 + word.length);
    phrases.push({ text: word, importance, count });
  }

  // 根据密度决定返回数量
  const targetCount = Math.ceil(density * 1.5);

  return phrases
    .sort((a, b) => b.count - a.count)
    .slice(0, targetCount)
    .map(p => ({ text: p.text, importance: p.importance }));
}

// 关键词提取配置
interface KeywordExtractConfig {
  minLength: number;      // 最小关键词长度
  maxLength: number;      // 最大关键词长度
  density: number;        // 密度（1-10，越大关键词越多）
  maxCount: number;       // 最大关键词数量
}

// 从文本提取弹窗关键词（增强版）
function extractPopupKeywords(
  text: string,
  estimatedDurationMs: number,
  config?: Partial<KeywordExtractConfig>
): Array<{ text: string; position: number; importance: number; suggestedTime: number }> {
  const {
    minLength = 2,
    maxLength = 6,
    density = 5,
    maxCount = 15,
  } = config || {};

  const keywords: Array<{ text: string; position: number; importance: number; suggestedTime: number }> = [];
  const textLength = text.length;
  const durationSec = estimatedDurationMs / 1000;

  // 1. 匹配预设关键词词典
  for (const [keyword, importance] of Object.entries(POPUP_KEYWORD_MAP)) {
    if (keyword.length < minLength || keyword.length > maxLength) continue;
    let pos = 0;
    while ((pos = text.indexOf(keyword, pos)) !== -1) {
      const ratio = pos / textLength;
      const suggestedTime = Math.round(ratio * durationSec);
      keywords.push({
        text: keyword,
        position: pos,
        importance,
        suggestedTime: Math.max(1, suggestedTime),
      });
      pos += keyword.length;
    }
  }

  // 2. 匹配数字+单位模式
  const numberPattern = /(\d+(?:\.\d+)?)(亿|万|%|倍|个|次|年|天|小时|分钟)/g;
  let match;
  while ((match = numberPattern.exec(text)) !== null) {
    if (match[0].length >= minLength && match[0].length <= maxLength) {
      const ratio = match.index / textLength;
      const suggestedTime = Math.round(ratio * durationSec);
      keywords.push({
        text: match[0],
        position: match.index,
        importance: 9,
        suggestedTime: Math.max(1, suggestedTime),
      });
    }
  }

  // 3. 基于密度提取高频词/短语（新增）
  if (density >= 3) {
    const phrases = extractPhrases(text, minLength, maxLength, density);
    phrases.forEach(phrase => {
      const pos = text.indexOf(phrase.text);
      if (pos !== -1) {
        const ratio = pos / textLength;
        const suggestedTime = Math.round(ratio * durationSec);
        keywords.push({
          text: phrase.text,
          position: pos,
          importance: phrase.importance,
          suggestedTime: Math.max(1, suggestedTime),
        });
      }
    });
  }

  // 去重
  const seen = new Set<string>();
  const uniqueKeywords = keywords.filter(k => {
    if (seen.has(k.text)) return false;
    seen.add(k.text);
    return true;
  });

  // 根据密度调整返回数量
  const targetCount = Math.min(maxCount, Math.ceil(density * 2));

  return uniqueKeywords
    .sort((a, b) => b.importance - a.importance)
    .slice(0, targetCount)
    .sort((a, b) => a.suggestedTime - b.suggestedTime);
}

// 提取弹窗关键词 API
popupTemplateRouter.post('/extract-keywords', async (req, res) => {
  const { text, estimatedDurationMs, config } = req.body;

  if (!text) {
    return res.status(400).json({ error: '请提供文稿内容' });
  }

  const duration = estimatedDurationMs || 60000;
  const keywords = extractPopupKeywords(text, duration, config);
  const suggestedCount = Math.min(keywords.length, Math.ceil((config?.density || 5) * 1.2));

  res.json({ keywords, suggestedCount });
});

// ========== 图片搜索 API ==========

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    tiny: string;
  };
  photographer: string;
}

// 中文关键词到英文的简单映射（用于搜索）
const KEYWORD_TRANSLATION: Record<string, string> = {
  '人工智能': 'artificial intelligence',
  'AI': 'artificial intelligence',
  '机器学习': 'machine learning',
  '深度学习': 'deep learning',
  '大模型': 'large language model',
  'GPT': 'AI chatbot',
  'ChatGPT': 'AI chatbot',
  '算法': 'algorithm',
  '数据': 'data analytics',
  '云计算': 'cloud computing',
  '区块链': 'blockchain',
  '元宇宙': 'metaverse VR',
  '增长': 'growth chart',
  '效率': 'efficiency productivity',
  '成本': 'cost money',
  '利润': 'profit business',
  '用户': 'user customer',
  '流量': 'traffic analytics',
  '转化': 'conversion funnel',
  '变现': 'monetization',
  '医疗': 'healthcare medical',
  '教育': 'education learning',
  '金融': 'finance banking',
  '电商': 'ecommerce shopping',
  '游戏': 'gaming video game',
  '社交': 'social media',
  '短视频': 'short video',
  '直播': 'live streaming',
  '科技': 'technology',
  '未来': 'future innovation',
  '重要': 'important',
  '关键': 'key success',
  '核心': 'core essential',
  '突破': 'breakthrough',
  '颠覆': 'disruption innovation',
};

// 翻译中文关键词为英文
function translateKeyword(keyword: string): string {
  // 先检查是否有直接映射
  if (KEYWORD_TRANSLATION[keyword]) {
    return KEYWORD_TRANSLATION[keyword];
  }
  // 检查是否包含映射中的词
  for (const [cn, en] of Object.entries(KEYWORD_TRANSLATION)) {
    if (keyword.includes(cn)) {
      return en;
    }
  }
  // 如果是纯中文，返回通用搜索词
  if (/^[\u4e00-\u9fa5]+$/.test(keyword)) {
    return 'abstract concept';
  }
  return keyword;
}

// Unsplash 图片接口
interface UnsplashPhoto {
  id: string;
  width: number;
  height: number;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  user: { name: string };
}

// Pixabay 图片接口
interface PixabayHit {
  id: number;
  webformatURL: string;
  largeImageURL: string;
  previewURL: string;
  imageWidth: number;
  imageHeight: number;
  user: string;
}

// Pixabay 视频接口
interface PixabayVideoHit {
  id: number;
  videos: {
    large?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    small?: { url: string; width: number; height: number };
    tiny?: { url: string; width: number; height: number };
  };
  user: string;
}

// 搜索图片 API（支持多个图片源）
popupTemplateRouter.post('/search-images', async (req, res) => {
  const { keyword, count = 12, source = 'all' } = req.body;

  if (!keyword) {
    return res.status(400).json({ error: '请提供搜索关键词' });
  }

  const searchQuery = translateKeyword(keyword);
  const allImages: Array<{
    id: string;
    url: string;
    thumbUrl: string;
    source: 'pexels' | 'unsplash' | 'pixabay';
    photographer?: string;
    width?: number;
    height?: number;
  }> = [];

  const perSourceCount = source === 'all' ? Math.ceil(count / 3) : count;

  // Pexels 搜索
  if (source === 'all' || source === 'pexels') {
    const pexelsKey = process.env.PEXELS_API_KEY;
    if (pexelsKey) {
      try {
        const url = new URL('https://api.pexels.com/v1/search');
        url.searchParams.set('query', searchQuery);
        url.searchParams.set('per_page', String(perSourceCount));
        url.searchParams.set('orientation', 'square');

        const response = await fetch(url.toString(), {
          headers: { Authorization: pexelsKey },
        });

        if (response.ok) {
          const data = await response.json();
          const photos: PexelsPhoto[] = data.photos || [];
          photos.forEach(photo => {
            allImages.push({
              id: `pexels-${photo.id}`,
              url: photo.src.large2x || photo.src.original,
              thumbUrl: photo.src.medium || photo.src.small,
              source: 'pexels',
              photographer: photo.photographer,
              width: photo.width,
              height: photo.height,
            });
          });
        }
      } catch (e) {
        console.error('[Pexels] 搜索失败:', e);
      }
    }
  }

  // Unsplash 搜索
  if (source === 'all' || source === 'unsplash') {
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    if (unsplashKey) {
      try {
        const url = new URL('https://api.unsplash.com/search/photos');
        url.searchParams.set('query', searchQuery);
        url.searchParams.set('per_page', String(perSourceCount));

        const response = await fetch(url.toString(), {
          headers: { Authorization: `Client-ID ${unsplashKey}` },
        });

        if (response.ok) {
          const data = await response.json();
          const photos: UnsplashPhoto[] = data.results || [];
          photos.forEach(photo => {
            allImages.push({
              id: `unsplash-${photo.id}`,
              url: photo.urls.regular,
              thumbUrl: photo.urls.small,
              source: 'unsplash',
              photographer: photo.user.name,
              width: photo.width,
              height: photo.height,
            });
          });
        }
      } catch (e) {
        console.error('[Unsplash] 搜索失败:', e);
      }
    }
  }

  // Pixabay 搜索
  if (source === 'all' || source === 'pixabay') {
    const pixabayKey = process.env.PIXABAY_API_KEY;
    if (pixabayKey) {
      try {
        const url = new URL('https://pixabay.com/api/');
        url.searchParams.set('key', pixabayKey);
        url.searchParams.set('q', searchQuery);
        url.searchParams.set('per_page', String(perSourceCount));
        url.searchParams.set('image_type', 'photo');
        url.searchParams.set('safesearch', 'true');

        const response = await fetch(url.toString());

        if (response.ok) {
          const data = await response.json();
          const hits: PixabayHit[] = data.hits || [];
          hits.forEach(hit => {
            allImages.push({
              id: `pixabay-${hit.id}`,
              url: hit.largeImageURL,
              thumbUrl: hit.webformatURL,
              source: 'pixabay',
              photographer: hit.user,
              width: hit.imageWidth,
              height: hit.imageHeight,
            });
          });
        }
      } catch (e) {
        console.error('[Pixabay] 搜索失败:', e);
      }
    }
  }

  // 混合排序（交替显示不同来源）
  if (source === 'all') {
    const pexels = allImages.filter(i => i.source === 'pexels');
    const unsplash = allImages.filter(i => i.source === 'unsplash');
    const pixabay = allImages.filter(i => i.source === 'pixabay');
    const mixed: typeof allImages = [];
    const maxLen = Math.max(pexels.length, unsplash.length, pixabay.length);
    for (let i = 0; i < maxLen; i++) {
      if (pexels[i]) mixed.push(pexels[i]);
      if (unsplash[i]) mixed.push(unsplash[i]);
      if (pixabay[i]) mixed.push(pixabay[i]);
    }
    return res.json({ images: mixed.slice(0, count), keyword, searchQuery });
  }

  res.json({ images: allImages.slice(0, count), keyword, searchQuery });
});

// ========== 增强关键词提取 API（使用 NLP 服务）==========

// 智能关键词提取
popupTemplateRouter.post('/extract-keywords-enhanced', async (req, res) => {
  const { text, totalDuration = 60, maxKeywords = 10 } = req.body;

  if (!text) {
    return res.status(400).json({ error: '请提供文稿内容' });
  }

  try {
    // 使用 NLP 服务提取关键词
    const keywords = keywordExtractor.extractKeywords(text, {
      maxKeywords: maxKeywords * 2,
      minWordLength: 2,
      includeEnglish: true,
    });

    // 计算时间点
    const timePoints = timePointCalculator.calculate(keywords, {
      totalDuration,
      minInterval: 2,
      maxPoints: maxKeywords,
    });

    res.json({
      keywords: timePoints,
      totalExtracted: keywords.length,
    });
  } catch (error: any) {
    console.error('关键词提取失败:', error);
    res.status(500).json({ error: error.message || '关键词提取失败' });
  }
});
