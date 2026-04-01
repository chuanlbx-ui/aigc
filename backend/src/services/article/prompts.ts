// AI 创作提示词服务
// 基于 content-creation-skill 的方法论

// 平台栏目风格配置
export const COLUMN_STYLES: Record<string, Record<string, string>> = {
  wechat: {
    '深度': '深度分析类文章，需要有独特观点、详实数据、逻辑严密，字数3000-5000字',
    '速递': '快讯类文章，简洁明了、信息密度高、时效性强，字数800-1500字',
    '体验': '产品体验类文章，真实使用感受、优缺点分析、适合人群，字数1500-2500字',
    '教程': '教程类文章，步骤清晰、配图说明、常见问题解答，字数1500-3000字',
    '对话': '访谈对话类文章，问答形式、人物特色、金句提炼，字数2000-4000字',
  },
  xiaohongshu: {
    '种草': '种草推荐类，真实体验、痛点解决、情绪共鸣，字数300-800字',
    '教程': '教程攻略类，步骤简洁、重点突出、易于模仿，字数400-1000字',
    '观点': '观点输出类，态度鲜明、引发讨论、有记忆点，字数300-600字',
  },
  video: {
    '演示': '产品演示类脚本，节奏紧凑、重点突出、视觉引导',
    '教程': '教程类脚本，步骤分明、口播清晰、画面配合',
    '观点': '观点类脚本，开头抓人、论证有力、结尾有力',
  },
};

// HKR 评估维度
export const HKR_DIMENSIONS = {
  H: {
    name: 'Happiness/Hook',
    description: '开头吸引力，前3秒/前50字能否抓住注意力',
    criteria: [
      '是否有悬念或冲突',
      '是否直击痛点',
      '是否有意外或反转',
      '是否引发好奇',
    ],
  },
  K: {
    name: 'Knowledge',
    description: '知识价值，读者能获得什么',
    criteria: [
      '信息是否准确可靠',
      '是否有独特见解',
      '是否有实用价值',
      '是否有数据支撑',
    ],
  },
  R: {
    name: 'Resonance',
    description: '情感共鸣，能否引发认同',
    criteria: [
      '是否有真实感受',
      '是否触及情绪',
      '是否有代入感',
      '是否引发思考或行动',
    ],
  },
};

// 降AI味检查清单（分级：must=必须修改，suggest=建议修改）
export const ANTI_AI_CHECKLIST: Array<{ pattern: string; action: string; level: 'must' | 'suggest' }> = [
  // === 必须修改：套话和过渡词 ===
  { pattern: '在当今时代', action: '删除或替换为具体时间', level: 'must' },
  { pattern: '综上所述', action: '删除，直接给结论', level: 'must' },
  { pattern: '值得注意的是', action: '删除，直接说重点', level: 'must' },
  { pattern: '总的来说', action: '删除，直接给结论', level: 'must' },
  { pattern: '总而言之', action: '删除，直接给结论', level: 'must' },
  { pattern: '不言而喻', action: '删除，直接陈述', level: 'must' },
  { pattern: '毋庸置疑', action: '删除，直接陈述', level: 'must' },
  { pattern: '众所周知', action: '删除，直接陈述', level: 'must' },
  { pattern: '不得不说', action: '删除，直接说', level: 'must' },
  { pattern: '话虽如此', action: '删除，直接转折', level: 'must' },
  // === 必须修改：书面/AI 词汇 ===
  { pattern: '显著提升', action: '替换为具体数字', level: 'must' },
  { pattern: '显著改善', action: '替换为具体描述', level: 'must' },
  { pattern: '充分利用', action: '替换为"用好"', level: 'must' },
  { pattern: '充分发挥', action: '替换为具体动作', level: 'must' },
  { pattern: '进行.*操作', action: '简化为动词', level: 'must' },
  { pattern: '相关.*工作', action: '具体说明是什么工作', level: 'must' },
  { pattern: '有效.*提升', action: '替换为具体数字或案例', level: 'must' },
  { pattern: '深度.*赋能', action: '删除，说清楚做了什么', level: 'must' },
  { pattern: '全面.*升级', action: '说清楚升级了什么', level: 'must' },
  { pattern: '持续.*优化', action: '说清楚优化了什么', level: 'must' },
  // === 必须修改：AI 特有句式 ===
  { pattern: '不是.*而是', action: '拆解为两个独立句子', level: 'must' },
  { pattern: '不仅.*还.*更', action: '拆解，避免三重递进', level: 'must' },
  { pattern: '既.*又.*还', action: '拆解，避免三重并列', level: 'must' },
  { pattern: '一方面.*另一方面', action: '直接分段陈述', level: 'must' },
  // === 建议修改：过于正式的表达 ===
  { pattern: '在此基础上', action: '改为"然后"或直接连接', level: 'suggest' },
  { pattern: '与此同时', action: '改为"同时"或分句', level: 'suggest' },
  { pattern: '从某种意义上说', action: '删除，直接说', level: 'suggest' },
  { pattern: '在一定程度上', action: '删除或量化', level: 'suggest' },
  { pattern: '可以说', action: '删除，直接断言', level: 'suggest' },
  { pattern: '某种程度上', action: '删除或量化', level: 'suggest' },
  { pattern: '不难发现', action: '删除，直接陈述发现', level: 'suggest' },
  { pattern: '由此可见', action: '删除，直接给结论', level: 'suggest' },
  // === 建议修改：抽象词汇 ===
  { pattern: '赋能', action: '说清楚具体帮助了什么', level: 'suggest' },
  { pattern: '生态.*体系', action: '具体说明包含什么', level: 'suggest' },
  { pattern: '闭环', action: '说清楚流程是什么', level: 'suggest' },
  { pattern: '底层逻辑', action: '直接说原因', level: 'suggest' },
  { pattern: '顶层设计', action: '直接说方案', level: 'suggest' },
];

/**
 * 构建带历史表现数据的选题讨论 prompt
 * 注入同平台同栏目的高表现文章数据，实现数据驱动选题
 */
export function buildContextEnrichedTopicPrompt(params: {
  topic: string;
  platform: string;
  column: string;
  context?: string;
  topPerformingData?: Array<{
    title: string;
    platform: string;
    views: number;
    likes: number;
    engagementRate: number;
    publishedAt: string;
  }>;
}): string {
  const basePrompt = buildTopicDiscussionPrompt(params);

  if (!params.topPerformingData || params.topPerformingData.length === 0) {
    return basePrompt;
  }

  // 构建历史表现数据摘要
  const performanceSection = params.topPerformingData
    .slice(0, 5)
    .map((item, i) => {
      return `${i + 1}. 「${item.title}」- 阅读 ${item.views}，点赞 ${item.likes}，互动率 ${(item.engagementRate * 100).toFixed(1)}%`;
    })
    .join('\n');

  // 在基础 prompt 的"请分析以下方面"之前插入历史数据
  const insertPoint = '## 请分析以下方面';
  const dataSection = `## 历史高表现内容参考
以下是同平台（${params.platform}）近期表现最好的文章，请参考其选题方向和角度：

${performanceSection}

请在分析中考虑这些成功案例的共性特征，并评估当前选题是否具有类似的成功潜力。

`;

  return basePrompt.replace(insertPoint, dataSection + insertPoint);
}

// 选题讨论 prompt
export function buildTopicDiscussionPrompt(params: {
  topic: string;
  platform: string;
  column: string;
  context?: string;
}): string {
  const style = COLUMN_STYLES[params.platform]?.[params.column] || '';

  return `你是一位资深内容策划，请帮我分析这个选题的可行性。

## 选题信息
- 主题：${params.topic}
- 平台：${params.platform}
- 栏目：${params.column}
- 风格要求：${style}
${params.context ? `- 补充背景：${params.context}` : ''}

## 请分析以下方面

### 1. 选题价值评估
- 目标读者是谁？
- 解决什么问题/满足什么需求？
- 时效性如何？

### 2. 差异化角度
- 提供3个可能的切入角度
- 每个角度的优劣势

### 3. 风险提示
- 可能的争议点
- 需要核实的信息

### 4. 推荐方向
- 最推荐的角度及理由
- 预估的内容结构

请用简洁专业的语言回答。`;
}

// 大纲生成 prompt
export function buildOutlinePrompt(params: {
  title: string;
  platform: string;
  column: string;
  angle?: string;
  materials?: string;
}): string {
  const style = COLUMN_STYLES[params.platform]?.[params.column] || '';

  return `请为以下文章生成详细大纲。

## 文章信息
- 标题：${params.title}
- 平台：${params.platform}
- 栏目：${params.column}
- 风格要求：${style}
${params.angle ? `- 切入角度：${params.angle}` : ''}
${params.materials ? `- 参考素材：\n${params.materials}` : ''}

## 大纲要求
1. 包含标题、各级小标题
2. 每个部分的核心要点（2-3个）
3. 预估每部分字数
4. 标注需要数据/案例支撑的地方

请输出 Markdown 格式的大纲。`;
}

// 初稿生成 prompt
export function buildDraftPrompt(params: {
  title: string;
  platform: string;
  column: string;
  outline: string;
  materials?: string;
}): string {
  const style = COLUMN_STYLES[params.platform]?.[params.column] || '';

  return `请根据大纲撰写文章初稿。

## 文章信息
- 标题：${params.title}
- 平台：${params.platform}
- 栏目：${params.column}
- 风格要求：${style}

## 大纲
${params.outline}

${params.materials ? `## 参考素材\n${params.materials}` : ''}

## 写作要求
1. 严格按照大纲结构展开
2. 语言自然流畅，避免AI腔调
3. 适当使用口语化表达
4. 数据和案例要具体真实
5. 开头要有吸引力

请输出完整的 Markdown 格式文章。`;
}

// AI 审校 prompt
export function buildReviewPrompt(content: string): string {
  const checklistStr = ANTI_AI_CHECKLIST
    .map(item => `- "${item.pattern}" → ${item.action}`)
    .join('\n');

  return `请对以下文章进行三遍审校。

## 文章内容
${content}

## 审校要求

### 第一遍：降AI味检查
检查并修改以下问题：
${checklistStr}

### 第二遍：逻辑与事实
- 论证是否有漏洞
- 数据是否需要核实
- 前后是否矛盾

### 第三遍：可读性优化
- 句子是否过长
- 段落是否过密
- 节奏是否单调

请输出：
1. 发现的问题列表
2. 修改后的完整文章`;
}

// HKR 评估 prompt
export function buildHKRPrompt(content: string): string {
  return `请用 HKR 模型评估以下文章质量。

## 文章内容
${content}

## HKR 评估维度

### H - Hook/Happiness（吸引力）
${HKR_DIMENSIONS.H.criteria.map(c => `- ${c}`).join('\n')}

### K - Knowledge（知识价值）
${HKR_DIMENSIONS.K.criteria.map(c => `- ${c}`).join('\n')}

### R - Resonance（情感共鸣）
${HKR_DIMENSIONS.R.criteria.map(c => `- ${c}`).join('\n')}

请输出 JSON 格式评估结果：
{
  "H": { "score": 1-10, "comment": "评价" },
  "K": { "score": 1-10, "comment": "评价" },
  "R": { "score": 1-10, "comment": "评价" },
  "overall": 1-10,
  "suggestions": ["改进建议1", "改进建议2"]
}`;
}

// HKR 改进 prompt - 根据评估建议自动修改文章
export function buildHKRImprovePrompt(content: string, suggestions: string[]): string {
  const suggestionList = suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n');

  return `请根据以下改进建议，修改文章内容。

## 原文章内容
${content}

## 改进建议
${suggestionList}

## 修改要求
1. 针对每条建议进行相应修改
2. 保持文章的整体风格和结构
3. 不要删除原有的重要信息
4. 修改要自然流畅，不要生硬
5. 保持 Markdown 格式

请直接输出修改后的完整文章内容，不需要解释修改了什么。`;
}

// ========== 智能配图相关 Prompt ==========

// 平台配图风格指南
export const PLATFORM_IMAGE_GUIDE: Record<string, string> = {
  wechat: '公众号配图要求：清晰专业、与内容强相关、避免过于花哨。深度文章配图应体现专业感，教程类配图应清晰展示步骤。推荐横图，宽高比 16:9 或 4:3。',
  xiaohongshu: '小红书配图要求：高颜值、有氛围感、适合竖屏浏览。种草类需要产品实拍感，教程类需要步骤清晰。推荐竖图，宽高比 3:4 或 9:16。',
  video: '视频脚本配图要求：适合作为视频素材或缩略图，画面感强，主体突出。推荐横图，宽高比 16:9。',
};

// 配图位置分析 prompt
export function buildImagePositionPrompt(params: {
  content: string;
  platform: string;
  column: string;
  maxImages: number;
}): string {
  const imageGuide = PLATFORM_IMAGE_GUIDE[params.platform] || '';

  return `你是一位专业的内容编辑，请分析以下文章，找出最适合插入配图的位置。

## 文章内容
${params.content}

## 平台信息
- 平台：${params.platform}
- 栏目：${params.column}
- 配图风格指南：${imageGuide}

## 分析要求
1. 最多推荐 ${params.maxImages} 个配图位置
2. 优先考虑：
   - 每个大标题（##）后的第一段结束后
   - 关键概念或产品首次出现的段落结束后
   - 步骤说明的开始处（在步骤标题后）
   - 数据对比或案例展示的段落结束后
   - 长段落（超过200字）的中间位置
3. 避免在以下位置配图：
   - 代码块内部或紧邻代码块
   - 引用块内部或紧邻引用块
   - 列表项中间（应在列表前或列表后）
   - 文章开头第一段内
   - 标题行内或标题后第一行
   - 段落中间（应在段落结束后）
4. 配图密度控制：
   - 相邻配图之间至少间隔3-5个段落
   - 避免连续两段都配图
   - 全文配图分布应均匀

## 输出格式
请严格输出 JSON 数组，每个元素包含：
[
  {
    "lineNumber": 行号（从1开始计数）,
    "afterText": "该行的前30个字符（用于定位）",
    "reason": "为什么建议在此处配图（简短说明）",
    "priority": "high/medium/low",
    "suggestedKeywords": ["英文关键词1", "英文关键词2", "中文关键词"]
  }
]

注意：
- suggestedKeywords 应该是适合图片搜索的关键词，优先使用英文以提高搜索效果
- 关键词要具体、可视化，避免抽象概念
- 只输出 JSON 数组，不要其他内容`;
}

// ========== 口播文案和海报相关 Prompt ==========

// 口播文案长度配置
const SCRIPT_LENGTH_CONFIG: Record<string, { words: string; duration: string; points: string }> = {
  short: { words: '200-400字', duration: '30秒-1分钟', points: '1-2个' },
  medium: { words: '400-800字', duration: '1-2分钟', points: '2-3个' },
  long: { words: '800-1500字', duration: '3-5分钟', points: '4-6个' },
};

// 口播文案风格配置
const SCRIPT_STYLE_CONFIG: Record<string, string> = {
  professional: '专业严谨：使用行业术语，数据支撑，逻辑清晰，适合知识科普、行业分析',
  casual: '轻松随意：像朋友聊天，口语化表达，适当玩梗，适合日常分享、生活记录',
  storytelling: '故事叙述：以故事开头，有起承转合，代入感强，适合经历分享、案例讲解',
  tutorial: '教程讲解：步骤清晰，重点标注，适当停顿提示，适合教学、操作演示',
};

// 口播文案语气配置
const SCRIPT_TONE_CONFIG: Record<string, string> = {
  enthusiastic: '热情激昂：充满能量，语气上扬，多用感叹句，传递积极情绪',
  calm: '沉稳平和：语速适中，娓娓道来，给人信任感和专业感',
  humorous: '幽默风趣：适当调侃，巧用比喻，轻松有趣不失内涵',
  sincere: '真诚走心：情感真挚，适当停顿，引发共鸣和思考',
};

// 口播文案生成 prompt
export function buildScriptPrompt(params: {
  content: string;
  platform: string;
  title: string;
  length?: 'short' | 'medium' | 'long';
  style?: 'professional' | 'casual' | 'storytelling' | 'tutorial';
  tone?: 'enthusiastic' | 'calm' | 'humorous' | 'sincere';
}): string {
  const {
    content, platform, title,
    length = 'medium',
    style = 'casual',
    tone = 'enthusiastic',
  } = params;

  const platformGuide: Record<string, string> = {
    wechat: '适合公众号视频号，语言专业但不失亲和力',
    xiaohongshu: '适合小红书视频，语言活泼、有感染力、适当使用网络用语',
    video: '适合通用短视频平台，节奏紧凑、重点突出',
  };

  const lengthConfig = SCRIPT_LENGTH_CONFIG[length];
  const styleDesc = SCRIPT_STYLE_CONFIG[style];
  const toneDesc = SCRIPT_TONE_CONFIG[tone];

  return `请将以下文章内容改写为适合视频口播的文案。

## 文章标题
${title}

## 文章内容
${content}

## 平台要求
${platformGuide[platform] || '通用视频平台'}

## 长度要求
- 字数：${lengthConfig.words}
- 时长：${lengthConfig.duration}
- 要点数量：${lengthConfig.points}核心要点

## 风格要求
${styleDesc}

## 语气要求
${toneDesc}

## 结构要求
1. **开头（占15%）**：用一句话抓住注意力（可以是问题、痛点或惊人事实）
2. **正文（占70%）**：展开核心要点，每个要点简洁有力，有案例或细节支撑
3. **结尾（占15%）**：总结核心观点，给出行动号召或引发思考

## 写作规范
- 语言口语化，避免书面语
- 句子长短交替，有节奏感
- 删除不适合口播的内容（复杂数据表格、代码等）
- 适当加入过渡词和连接词，让内容更流畅

请直接输出口播文案，不需要其他说明。`;
}

// 文章精句提取 prompt（用于大字报海报）
export function buildQuotesPrompt(params: {
  content: string;
  title: string;
  maxQuotes: number;
}): string {
  return `请从以下文章中提取最具感染力的精句，用于制作大字报风格海报。

## 文章标题
${params.title}

## 文章内容
${params.content}

## 提取要求
1. 提取 ${params.maxQuotes} 句最有力量、最能打动人的精句
2. 每句控制在 15-40 字，适合大字展示
3. 优先选择：
   - 金句、警句、观点句
   - 有情感共鸣的句子
   - 有画面感的描述
   - 发人深省的思考
4. 避免选择：
   - 过于平淡的陈述句
   - 包含具体数据的句子
   - 需要上下文才能理解的句子

## 输出格式
请严格输出 JSON 数组格式：
["精句1", "精句2", "精句3", ...]

只输出 JSON 数组，不要其他内容。`;
}

// AI 润色精句 prompt
export function buildPolishQuotePrompt(params: {
  quote: string;
  title: string;
  content: string;
}): string {
  return `请对以下精句进行润色优化，使其更有感染力和传播力。

## 原始精句
${params.quote}

## 文章标题（供参考上下文）
${params.title}

## 润色要求
1. 保持原意不变，但让表达更有力量
2. 控制在 15-50 字，适合大字海报展示
3. 可以适当调整句式，增强节奏感
4. 让句子更朗朗上口，易于传播
5. 避免使用生僻词汇

## 输出格式
只输出润色后的精句，不要其他内容。`;
}

// AI 生成原创精句 prompt
export function buildGenerateQuotePrompt(params: {
  title: string;
  content: string;
  existingQuotes?: string[];
}): string {
  const existingPart = params.existingQuotes?.length
    ? `\n## 已有精句（请生成不同的）\n${params.existingQuotes.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : '';

  return `请基于以下文章，创作一句全新的精句，用于大字报风格海报。

## 文章标题
${params.title}

## 文章内容
${params.content}
${existingPart}

## 创作要求
1. 提炼文章核心观点或情感
2. 控制在 15-50 字，适合大字展示
3. 要有力量感和感染力
4. 朗朗上口，易于传播
5. 可以是：
   - 金句、警句
   - 有情感共鸣的句子
   - 发人深省的思考
   - 行动号召

## 输出格式
只输出一句精句，不要其他内容。`;
}

// ========== 风格学习相关 Prompt ==========

// 预设风格模板
export const STYLE_TEMPLATES: Record<string, {
  name: string;
  description: string;
  characteristics: string[];
  example?: string;
}> = {
  'professional': {
    name: '专业严谨',
    description: '适合深度分析、行业报告类文章',
    characteristics: [
      '数据支撑，引用权威来源',
      '逻辑清晰，论证严密',
      '用词精准，避免口语化',
      '结构完整，层次分明',
    ],
  },
  'storytelling': {
    name: '故事叙述',
    description: '适合案例分享、人物访谈类文章',
    characteristics: [
      '以故事开头，引人入胜',
      '有起承转合，节奏感强',
      '细节描写，画面感强',
      '情感真挚，引发共鸣',
    ],
  },
  'casual': {
    name: '轻松随意',
    description: '适合日常分享、生活记录类文章',
    characteristics: [
      '口语化表达，像朋友聊天',
      '适当使用网络用语',
      '幽默风趣，轻松有趣',
      '互动感强，拉近距离',
    ],
  },
  'tutorial': {
    name: '教程指南',
    description: '适合操作教程、攻略指南类文章',
    characteristics: [
      '步骤清晰，易于跟随',
      '重点标注，避免遗漏',
      '配图说明，直观易懂',
      '常见问题，提前解答',
    ],
  },
  'opinion': {
    name: '观点输出',
    description: '适合评论、观点表达类文章',
    characteristics: [
      '态度鲜明，立场清晰',
      '论据充分，有说服力',
      '引发思考，促进讨论',
      '金句频出，易于传播',
    ],
  },
};

// 从文章链接分析风格 prompt
export function buildStyleAnalysisPrompt(params: {
  content: string;
  url?: string;
}): string {
  return `请分析以下文章的写作风格，提取可复用的风格特征。

## 文章内容
${params.content}
${params.url ? `\n来源：${params.url}` : ''}

## 分析维度

### 1. 整体风格定位
- 属于哪种风格类型（专业严谨/故事叙述/轻松随意/教程指南/观点输出）
- 目标读者群体
- 适合的平台和场景

### 2. 语言特征
- 用词风格（书面/口语/专业术语）
- 句式特点（长短句比例、常用句式）
- 语气特点（正式/轻松/幽默/严肃）

### 3. 结构特征
- 开头方式（悬念/问题/故事/数据）
- 段落组织（长度、过渡方式）
- 结尾方式（总结/号召/留白/金句）

### 4. 内容特征
- 论证方式（数据/案例/类比/引用）
- 互动元素（提问/设问/呼应）
- 情感表达（克制/热情/真诚）

### 5. 可复用要素
- 3-5个可直接借鉴的写作技巧
- 典型句式或表达模板
- 值得学习的亮点

## 输出格式
请输出 JSON 格式：
{
  "styleType": "风格类型",
  "targetAudience": "目标读者",
  "language": {
    "vocabulary": "用词特点",
    "sentence": "句式特点",
    "tone": "语气特点"
  },
  "structure": {
    "opening": "开头方式",
    "body": "正文组织",
    "ending": "结尾方式"
  },
  "techniques": ["技巧1", "技巧2", "技巧3"],
  "templates": ["可复用句式1", "可复用句式2"],
  "highlights": ["亮点1", "亮点2"],
  "summary": "一句话总结这篇文章的风格特点"
}`;
}

// 基于学习的风格生成初稿 prompt
export function buildStyledDraftPrompt(params: {
  title: string;
  platform: string;
  column: string;
  outline: string;
  styleAnalysis: any;
  materials?: string;
}): string {
  const { styleAnalysis } = params;

  return `请根据大纲撰写文章初稿，并模仿以下风格特征。

## 文章信息
- 标题：${params.title}
- 平台：${params.platform}
- 栏目：${params.column}

## 大纲
${params.outline}

${params.materials ? `## 参考素材\n${params.materials}` : ''}

## 风格要求（请严格模仿）

### 整体风格
${styleAnalysis.summary || ''}

### 语言特征
- 用词：${styleAnalysis.language?.vocabulary || '自然流畅'}
- 句式：${styleAnalysis.language?.sentence || '长短结合'}
- 语气：${styleAnalysis.language?.tone || '亲和专业'}

### 结构特征
- 开头：${styleAnalysis.structure?.opening || '吸引注意'}
- 正文：${styleAnalysis.structure?.body || '逻辑清晰'}
- 结尾：${styleAnalysis.structure?.ending || '有力收尾'}

### 写作技巧
${(styleAnalysis.techniques || []).map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}

### 可参考句式
${(styleAnalysis.templates || []).map((t: string) => `- ${t}`).join('\n')}

## 写作规范
1. 严格按照大纲结构展开
2. 模仿上述风格特征，但内容要原创
3. 数据和案例要具体真实
4. 避免AI腔调，保持自然

请输出完整的 Markdown 格式文章。`;
}

// ========== 时事检测与联网搜索 ==========

const NEWS_INDICATORS = [
  '最新', '最近', '今年', '今天', '本周', '本月',
  '刚刚', '突发', '发布', '上线', '更新', '升级', '推出',
  '2024', '2025', '2026',
  '政策', '法规', '监管', '行业动态', '市场',
  'GPT', 'Claude', 'Gemini', 'Sora', 'AI', '大模型',
];

/** 检测内容是否为时事类 */
export function isNewsContent(title: string, outline: string): boolean {
  const text = `${title} ${outline}`.toLowerCase();
  return NEWS_INDICATORS.some(kw => text.includes(kw.toLowerCase()));
}

/** 从标题构建搜索查询 */
export function buildSearchQuery(title: string): string {
  return `${title} 最新信息 ${new Date().getFullYear()}`;
}

/** 将联网搜索结果注入初稿 prompt */
export function buildDraftPromptWithWebContext(params: {
  title: string;
  platform: string;
  column: string;
  outline: string;
  materials?: string;
  webSearchContext: string;
}): string {
  const style = COLUMN_STYLES[params.platform]?.[params.column] || '';

  return `请根据大纲撰写文章初稿。

## 文章信息
- 标题：${params.title}
- 平台：${params.platform}
- 栏目：${params.column}
- 风格要求：${style}

## 大纲
${params.outline}

${params.materials ? `## 参考素材\n${params.materials}` : ''}

## 最新信息（联网搜索结果，请优先使用这些最新数据和案例）
${params.webSearchContext}

## 写作要求
1. 严格按照大纲结构展开
2. 优先使用上方「最新信息」中的数据、案例和观点
3. 语言自然流畅，避免AI腔调
4. 数据和案例要具体真实，标注来源
5. 开头要有吸引力

请输出完整的 Markdown 格式文章。`;
}

/** 构建带完整工作流上下文的初稿 prompt */
export function buildDraftPromptWithContext(params: {
  title: string;
  platform: string;
  column: string;
  outline: string;
  context: {
    topicAnalysis?: string;
    styleAnalysis?: any;
    materials?: string;
    webSearchContent?: string;
    understanding?: string;
  };
}): string {
  const style = COLUMN_STYLES[params.platform]?.[params.column] || '';

  const contextParts: string[] = [];

  // 写作目标
  if (params.context.understanding) {
    contextParts.push(`## 写作目标\n${params.context.understanding}`);
  }

  // 选题分析
  if (params.context.topicAnalysis) {
    contextParts.push(`## 选题分析（请参考此分析确定切入角度）\n${params.context.topicAnalysis}`);
  }

  // 风格要求
  if (params.context.styleAnalysis) {
    const styleInfo = typeof params.context.styleAnalysis === 'string'
      ? params.context.styleAnalysis
      : JSON.stringify(params.context.styleAnalysis, null, 2);
    contextParts.push(`## 风格要求（请严格模仿此风格）\n${styleInfo}`);
  }

  // 参考素材
  if (params.context.materials) {
    contextParts.push(`## 参考素材（可引用其中的数据和案例）\n${params.context.materials}`);
  }

  // 网络搜索结果
  if (params.context.webSearchContent) {
    contextParts.push(`## 最新信息（联网搜索结果）\n${params.context.webSearchContent}`);
  }

  return `请根据大纲撰写文章初稿。

## 文章信息
- 标题：${params.title}
- 平台：${params.platform}
- 栏目：${params.column}
- 默认风格要求：${style}

## 大纲
${params.outline}

${contextParts.length > 0 ? contextParts.join('\n\n---\n\n') : ''}

## 写作要求
1. 严格按照大纲结构展开
2. 充分利用上方「选题分析」中的切入角度
3. 如有风格要求，请严格模仿其语言风格
4. 引用素材中的数据和案例时保持准确
5. 语言自然流畅，避免AI腔调
6. 开头要有吸引力，能抓住读者

请输出完整的 Markdown 格式文章。`;
}

/** 构建内容改编 prompt（一稿多用） */
export function buildAdaptPrompt(params: {
  content: string;
  title: string;
  sourcePlatform: string;
  targetPlatform: string;
  targetColumn?: string;
  adaptType?: 'full' | 'summary' | 'expand';
}): string {
  const targetStyle = COLUMN_STYLES[params.targetPlatform]?.[params.targetColumn || ''] || '';
  const sourceStyle = COLUMN_STYLES[params.sourcePlatform]?.[''] || '';

  const adaptTypeDesc: Record<string, string> = {
    full: '完整改编：保留核心内容，调整风格和格式',
    summary: '精简改编：提取核心要点，压缩篇幅',
    expand: '扩展改编：补充细节，增加深度',
  };

  // 平台特定的改编要求
  const platformRequirements: Record<string, string> = {
    xiaohongshu: `
- 标题控制在10-18字，加入emoji
- 正文使用分段+emoji，营造氛围感
- 添加3-5个话题标签（#标签）
- 结尾添加互动引导（如：你喜欢哪个？评论区告诉我~）
- 强调真实体验和个人感受
`,
    wechat: `
- 标题20-35字，可以设置悬念或提出问题
- 开头3秒内抓住读者注意力
- 段落分明，每段不超过150字
- 配图建议3-5张
- 文末可以添加作者介绍或延伸阅读
`,
    toutiao: `
- 标题15-25字，包含数字或疑问词
- 开头直接点题，快速切入
- 内容结构清晰，使用小标题
- 文末添加关注引导
- 可适当增加热点关联
`,
    zhihu: `
- 标题以问题形式呈现更佳
- 开头可以用故事或案例引入
- 论证要有逻辑，引用权威来源
- 使用小标题组织内容
- 文末可以总结观点或引发讨论
`,
  };

  return `请将以下${params.sourcePlatform}平台的内容改编为适合${params.targetPlatform}平台的内容。

## 原始内容
标题：${params.title}

${params.content}

## 改编要求

### 改编类型
${adaptTypeDesc[params.adaptType || 'full']}

### 目标平台特点
平台：${params.targetPlatform}
${params.targetColumn ? `栏目：${params.targetColumn}` : ''}
风格要求：${targetStyle}

### 平台特定要求
${platformRequirements[params.targetPlatform] || '保持原有风格，调整格式'}

## 输出要求
1. 输出改编后的完整内容（Markdown格式）
2. 包含新标题
3. 保留原文的核心信息和价值
4. 调整语言风格以适应目标平台
5. 不要添加"改编自..."等说明

请直接输出改编后的内容：`;
}
