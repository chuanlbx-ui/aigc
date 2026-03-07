/**
 * SEO/算法优化分析服务
 * 提供关键词分析、标题优化建议、平台特定优化等功能
 */

// 平台 SEO 配置
const PLATFORM_SEO_CONFIG = {
  wechat: {
    titleMaxLength: 64,
    titleOptimalLength: [20, 35],
    keywordsDensity: { min: 0.01, max: 0.03 },
    descriptionMaxLength: 120,
    features: ['标题吸引力', '关键词密度', '段落结构', '配图优化'],
  },
  xiaohongshu: {
    titleMaxLength: 20,
    titleOptimalLength: [10, 18],
    keywordsDensity: { min: 0.02, max: 0.05 },
    descriptionMaxLength: 1000,
    features: ['标题吸引力', '标签数量', '关键词密度', 'emoji使用'],
  },
  toutiao: {
    titleMaxLength: 30,
    titleOptimalLength: [15, 25],
    keywordsDensity: { min: 0.01, max: 0.03 },
    descriptionMaxLength: 200,
    features: ['标题吸引力', '关键词密度', '段落结构', '热点关联'],
  },
  zhihu: {
    titleMaxLength: 50,
    titleOptimalLength: [15, 30],
    keywordsDensity: { min: 0.005, max: 0.02 },
    descriptionMaxLength: 200,
    features: ['标题专业性', '关键词密度', '结构化内容', '引用标注'],
  },
};

// 中文停用词列表
const STOP_WORDS = new Set([
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '那', '什么', '他', '她', '它', '们', '这个', '那个', '可以',
  '因为', '所以', '但是', '而且', '或者', '如果', '虽然', '还是', '已经',
]);

export interface SEOAnalysisResult {
  // 关键词分析
  keywords: Array<{
    word: string;
    count: number;
    density: number;
    inTitle: boolean;
    inFirstParagraph: boolean;
  }>;
  // 标题分析
  title: {
    length: number;
    isOptimal: boolean;
    suggestions: string[];
    score: number;
  };
  // 内容结构
  structure: {
    paragraphCount: number;
    avgParagraphLength: number;
    hasHeadings: boolean;
    headingCount: number;
    imageCount: number;
    linkCount: number;
  };
  // 平台特定建议
  platformSuggestions: string[];
  // 综合评分
  overallScore: number;
  // 改进建议
  improvements: string[];
}

/**
 * 分词（简单实现，按字符和空格分割）
 */
function tokenize(text: string): string[] {
  // 移除标点符号，保留中文、英文、数字
  const cleaned = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ');
  
  // 分割为词语
  const tokens: string[] = [];
  let currentWord = '';
  
  for (const char of cleaned) {
    if (char === ' ') {
      if (currentWord.length > 1) {
        tokens.push(currentWord);
      }
      currentWord = '';
    } else if (/[\u4e00-\u9fa5]/.test(char)) {
      // 中文字符
      currentWord += char;
      // 中文按单字和双字组合
      if (currentWord.length >= 2) {
        tokens.push(currentWord);
        currentWord = currentWord.slice(-1);
      }
    } else {
      // 英文或数字
      currentWord += char.toLowerCase();
    }
  }
  
  if (currentWord.length > 1) {
    tokens.push(currentWord);
  }
  
  return tokens;
}

/**
 * 提取关键词
 */
function extractKeywords(text: string, topN: number = 10): Map<string, number> {
  const tokens = tokenize(text);
  const wordCount = new Map<string, number>();
  
  for (const word of tokens) {
    if (STOP_WORDS.has(word) || word.length < 2) continue;
    wordCount.set(word, (wordCount.get(word) || 0) + 1);
  }
  
  // 排序并取前N个
  const sorted = [...wordCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
  
  return new Map(sorted);
}

/**
 * 分析标题
 */
function analyzeTitle(title: string, platform: string): {
  length: number;
  isOptimal: boolean;
  suggestions: string[];
  score: number;
} {
  const config = PLATFORM_SEO_CONFIG[platform as keyof typeof PLATFORM_SEO_CONFIG] || PLATFORM_SEO_CONFIG.wechat;
  const length = title.length;
  const [minOptimal, maxOptimal] = config.titleOptimalLength;
  
  const suggestions: string[] = [];
  let score = 100;
  
  // 检查长度
  if (length > config.titleMaxLength) {
    suggestions.push(`标题过长（${length}字），超过平台限制（${config.titleMaxLength}字）`);
    score -= 30;
  } else if (length < minOptimal) {
    suggestions.push(`标题过短（${length}字），建议${minOptimal}-${maxOptimal}字`);
    score -= 20;
  } else if (length > maxOptimal) {
    suggestions.push(`标题略长（${length}字），建议${minOptimal}-${maxOptimal}字`);
    score -= 10;
  }
  
  // 检查吸引力关键词
  const attractionWords = ['如何', '为什么', '最', '必备', '必看', '秘密', '惊人', '独家', '首次', '最新'];
  const hasAttraction = attractionWords.some(w => title.includes(w));
  if (!hasAttraction && !title.includes('？') && !title.includes('！')) {
    suggestions.push('建议在标题中使用疑问句或吸引注意力的词语');
    score -= 10;
  }
  
  // 检查数字
  if (!/\d+/.test(title)) {
    suggestions.push('标题中加入数字可以提高点击率');
    score -= 5;
  }
  
  const isOptimal = score >= 80;
  
  return { length, isOptimal, suggestions, score: Math.max(0, score) };
}

/**
 * 分析内容结构
 */
function analyzeStructure(content: string): {
  paragraphCount: number;
  avgParagraphLength: number;
  hasHeadings: boolean;
  headingCount: number;
  imageCount: number;
  linkCount: number;
} {
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const paragraphCount = paragraphs.length;
  const totalLength = paragraphs.reduce((sum, p) => sum + p.length, 0);
  const avgParagraphLength = paragraphCount > 0 ? Math.round(totalLength / paragraphCount) : 0;
  
  const headingMatches = content.match(/^#{1,3}\s+.+$/gm);
  const headingCount = headingMatches ? headingMatches.length : 0;
  const hasHeadings = headingCount > 0;
  
  const imageMatches = content.match(/!\[.*?\]\(.*?\)/g);
  const imageCount = imageMatches ? imageMatches.length : 0;
  
  const linkMatches = content.match(/\[([^\]]+)\]\(([^)]+)\)/g);
  const linkCount = linkMatches ? linkMatches.length : 0;
  
  return {
    paragraphCount,
    avgParagraphLength,
    hasHeadings,
    headingCount,
    imageCount,
    linkCount,
  };
}

/**
 * 生成平台特定建议
 */
function generatePlatformSuggestions(
  platform: string,
  keywords: Map<string, number>,
  structure: ReturnType<typeof analyzeStructure>,
  content: string
): string[] {
  const suggestions: string[] = [];
  const config = PLATFORM_SEO_CONFIG[platform as keyof typeof PLATFORM_SEO_CONFIG];
  
  if (!config) return suggestions;
  
  switch (platform) {
    case 'wechat':
      if (structure.imageCount < 3) {
        suggestions.push('公众号文章建议配图3-5张，提高阅读体验');
      }
      if (structure.avgParagraphLength > 200) {
        suggestions.push('段落过长，建议每段控制在150字以内');
      }
      if (!content.includes('```')) {
        // 没有代码块或引用块，可能是好文章
      }
      break;
      
    case 'xiaohongshu':
      if (structure.imageCount < 3) {
        suggestions.push('小红书笔记建议配图3-9张，封面图尤其重要');
      }
      const emojiCount = (content.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
      if (emojiCount < 3) {
        suggestions.push('小红书笔记建议使用emoji增加亲和力');
      }
      // 检查标签
      const tagMatches = content.match(/#[^#\s]+/g);
      if (!tagMatches || tagMatches.length < 3) {
        suggestions.push('建议添加3-5个话题标签，如 #教程 #攻略');
      }
      break;
      
    case 'toutiao':
      if (structure.paragraphCount < 5) {
        suggestions.push('头条号文章建议分段明确，至少5个段落');
      }
      if (!content.includes('点击') && !content.includes('关注')) {
        suggestions.push('建议在文末添加关注引导');
      }
      break;
      
    case 'zhihu':
      if (structure.headingCount < 3) {
        suggestions.push('知乎回答建议使用小标题组织内容');
      }
      if (!content.includes('引用') && !content.includes('来源')) {
        suggestions.push('知乎内容建议添加引用和来源标注');
      }
      break;
  }
  
  return suggestions;
}

/**
 * 执行 SEO 分析
 */
export function analyzeSEO(
  title: string,
  content: string,
  platform: string = 'wechat'
): SEOAnalysisResult {
  // 提取关键词
  const keywordsMap = extractKeywords(content + ' ' + title, 15);
  const totalWords = tokenize(content).length;
  
  // 分析关键词
  const keywords = [...keywordsMap.entries()].map(([word, count]) => ({
    word,
    count,
    density: totalWords > 0 ? count / totalWords : 0,
    inTitle: title.includes(word),
    inFirstParagraph: content.split('\n')[0]?.includes(word) || false,
  }));
  
  // 分析标题
  const titleAnalysis = analyzeTitle(title, platform);
  
  // 分析结构
  const structure = analyzeStructure(content);
  
  // 平台特定建议
  const platformSuggestions = generatePlatformSuggestions(
    platform,
    keywordsMap,
    structure,
    content
  );
  
  // 计算综合评分
  let overallScore = 0;
  overallScore += titleAnalysis.score * 0.3;
  
  // 关键词覆盖率
  const keywordsInTitle = keywords.filter(k => k.inTitle).length;
  const keywordsInFirstPara = keywords.filter(k => k.inFirstParagraph).length;
  overallScore += Math.min(100, (keywordsInTitle + keywordsInFirstPara) * 20) * 0.2;
  
  // 结构分
  let structureScore = 100;
  if (!structure.hasHeadings) structureScore -= 20;
  if (structure.avgParagraphLength > 200) structureScore -= 15;
  if (structure.imageCount < 2) structureScore -= 10;
  overallScore += structureScore * 0.3;
  
  // 内容长度
  const contentLength = content.replace(/\s/g, '').length;
  if (contentLength < 500) overallScore -= 20;
  else if (contentLength > 3000) overallScore += 10;
  overallScore *= 0.2;
  
  // 生成改进建议
  const improvements: string[] = [];
  
  if (titleAnalysis.score < 80) {
    improvements.push(...titleAnalysis.suggestions);
  }
  
  if (keywordsInTitle === 0) {
    improvements.push('建议在标题中包含核心关键词');
  }
  
  if (keywordsInFirstPara === 0) {
    improvements.push('建议在首段包含核心关键词，提高SEO权重');
  }
  
  if (!structure.hasHeadings) {
    improvements.push('添加小标题可以提高内容可读性和SEO效果');
  }
  
  improvements.push(...platformSuggestions);
  
  return {
    keywords: keywords.slice(0, 10),
    title: titleAnalysis,
    structure,
    platformSuggestions,
    overallScore: Math.round(Math.max(0, Math.min(100, overallScore))),
    improvements,
  };
}

/**
 * 生成 SEO 优化建议的 prompt
 */
export function buildSEOAnalysisPrompt(content: string, title: string, platform: string): string {
  const config = PLATFORM_SEO_CONFIG[platform as keyof typeof PLATFORM_SEO_CONFIG] || PLATFORM_SEO_CONFIG.wechat;
  
  return `请分析以下文章的SEO和平台算法优化空间，给出具体的改进建议。

## 文章信息
- 标题：${title}
- 平台：${platform}
- 平台SEO要求：
  - 标题最优长度：${config.titleOptimalLength[0]}-${config.titleOptimalLength[1]}字
  - 标题最大长度：${config.titleMaxLength}字
  - 关键词密度建议：${(config.keywordsDensity.min * 100).toFixed(1)}%-${(config.keywordsDensity.max * 100).toFixed(1)}%

## 文章内容
${content.substring(0, 3000)}${content.length > 3000 ? '\n...(内容过长，已截断)' : ''}

## 分析要求

### 1. 关键词分析
- 识别文章核心关键词（3-5个）
- 分析关键词密度是否合理
- 检查关键词在标题、首段、小标题中的分布

### 2. 标题优化
- 评估标题吸引力（打分1-10）
- 提供2-3个优化后的标题建议
- 说明优化理由

### 3. 内容结构优化
- 段落长度是否合理
- 小标题是否清晰
- 配图建议

### 4. 平台特定优化
- 针对${platform}平台的特点给出建议
- 如何提高内容在该平台的推荐权重

## 输出格式
请输出 JSON 格式：
{
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "keywordDensity": 0.02,
  "titleScore": 7,
  "titleSuggestions": ["建议标题1", "建议标题2"],
  "structureScore": 8,
  "structureSuggestions": ["建议1", "建议2"],
  "platformScore": 7,
  "platformSuggestions": ["建议1", "建议2"],
  "overallScore": 75,
  "topPriority": "最优先改进的事项"
}`;
}
