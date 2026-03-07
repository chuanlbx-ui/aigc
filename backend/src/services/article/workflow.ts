// 文章创作工作流服务
// 基于 9 步创作流程

// 工作流步骤定义（9步，索引0-8）
export const WORKFLOW_STEPS = [
  { step: 0, name: 'understand', label: '理解需求', description: '明确写作目标和受众' },
  { step: 1, name: 'topic', label: '选题讨论', description: '确定切入角度', required: true },
  { step: 2, name: 'search', label: '信息搜索', description: '搜索相关资料' },
  { step: 3, name: 'collaborate', label: '协作文档', description: '整理素材和要点' },
  { step: 4, name: 'style', label: '学习风格', description: '加载栏目风格指南' },
  { step: 5, name: 'materials', label: '素材库', description: '选择知识库素材', required: true },
  { step: 6, name: 'waiting', label: '等待数据', description: '等待必要数据' },
  { step: 7, name: 'draft', label: '创作初稿', description: 'AI 辅助生成初稿' },
  { step: 8, name: 'review', label: '三遍审校', description: '降AI味审校', required: true },
];

// 工作流数据接口
export interface WorkflowData {
  // 步骤0: 理解需求
  requirement?: {
    goal: string;
    audience: string;
    keyPoints: string[];
    completedAt?: string;
  };
  // 步骤1: 选题讨论 ⭐
  topicDiscussion?: {
    input: string;
    analysis: string;
    completedAt?: string;
  };
  // 步骤2: 信息搜索
  searchResults?: {
    query: string;
    results: Array<{ title: string; url: string; summary: string }>;
    completedAt?: string;
  };
  // 步骤3: 协作文档（大纲）
  collaboration?: {
    outline: string;
    completedAt?: string;
  };
  // 步骤4: 学习风格
  style?: {
    platform: string;
    column: string;
    completedAt?: string;
  };
  // 步骤5: 素材库 ⭐
  materials?: {
    knowledgeResults: any[];
    webSearchContent: string;
    completedAt?: string;
  };
  // 步骤6: 等待数据
  waiting?: {
    notes: string;
    completedAt?: string;
  };
  // 步骤7: 创作初稿
  draft?: {
    content: string;
    completedAt?: string;
  };
  // 步骤8: 三遍审校 ⭐
  review?: {
    reviewResult: string;
    hkrScore: any;
    completedAt?: string;
  };
}

// 工作流上下文接口（用于传递给 AI 生成）
export interface WorkflowContext {
  // 选题分析结果
  topicAnalysis?: string;
  // 大纲
  outline?: string;
  // 风格分析结果
  styleAnalysis?: any;
  // 素材内容
  materials?: string;
  // 网络搜索结果
  webSearchContent?: string;
  // 理解需求
  understanding?: string;
  // 完整的工作流数据
  raw: WorkflowData;
}

/**
 * 构建工作流上下文
 * 聚合所有已完成步骤的数据，用于传递给 AI 生成
 */
export function buildWorkflowContext(workflowData: WorkflowData): WorkflowContext {
  const context: WorkflowContext = {
    raw: workflowData,
  };

  // 选题讨论结果
  if (workflowData.topicDiscussion?.analysis) {
    context.topicAnalysis = workflowData.topicDiscussion.analysis;
  }

  // 大纲
  if (workflowData.collaboration?.outline) {
    context.outline = workflowData.collaboration.outline;
  }

  // 风格分析结果
  if (workflowData.style?.analysis) {
    context.styleAnalysis = workflowData.style.analysis;
  }

  // 素材内容
  if (workflowData.materials?.knowledgeResults?.length > 0) {
    context.materials = workflowData.materials.knowledgeResults
      .map((m: any) => `【${m.title}】\n${m.excerpt || m.summary || ''}`)
      .join('\n\n---\n\n');
  }

  // 网络搜索结果
  if (workflowData.materials?.webSearchContent) {
    context.webSearchContent = workflowData.materials.webSearchContent;
  }

  // 理解需求
  if (workflowData.understanding?.notes) {
    context.understanding = workflowData.understanding.notes;
  }

  return context;
}

/**
 * 检查是否有风格分析结果
 */
export function hasStyleAnalysis(workflowData: WorkflowData): boolean {
  return !!(workflowData.style?.analysis || workflowData.style?.templateId);
}

/**
 * 检查是否有素材
 */
export function hasMaterials(workflowData: WorkflowData): boolean {
  return !!(
    workflowData.materials?.knowledgeResults?.length > 0 ||
    workflowData.materials?.webSearchContent
  );
}

/**
 * 格式化上下文为文本（用于 prompt）
 */
export function formatContextForPrompt(context: WorkflowContext): string {
  const parts: string[] = [];

  if (context.understanding) {
    parts.push(`## 写作目标\n${context.understanding}`);
  }

  if (context.topicAnalysis) {
    parts.push(`## 选题分析\n${context.topicAnalysis}`);
  }

  if (context.outline) {
    parts.push(`## 文章大纲\n${context.outline}`);
  }

  if (context.styleAnalysis) {
    parts.push(`## 风格要求\n${JSON.stringify(context.styleAnalysis, null, 2)}`);
  }

  if (context.materials) {
    parts.push(`## 参考素材\n${context.materials}`);
  }

  if (context.webSearchContent) {
    parts.push(`## 网络搜索结果\n${context.webSearchContent}`);
  }

  return parts.join('\n\n---\n\n');
}

// ========== 工作流条件跳过逻辑 ==========

// 时事内容关键词
const NEWS_KEYWORDS = [
  '最新', '最近', '今天', '本周', '本月', '突发', '发布', '上线',
  '更新', '升级', '推出', '2024', '2025', '2026', '政策', '法规',
  '监管', '行业动态', '市场', 'GPT', 'Claude', 'AI', '大模型',
];

/**
 * 检测内容是否为时事类
 */
export function isNewsContent(title: string, outline: string): boolean {
  const text = `${title} ${outline}`.toLowerCase();
  return NEWS_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
}

/**
 * 获取可以跳过的步骤
 * 基于工作流数据和内容类型判断
 */
export function getSkippableSteps(
  workflowData: WorkflowData,
  title: string = ''
): {
  step: number;
  reason: string;
  canSkip: boolean;
}[] {
  const results: { step: number; reason: string; canSkip: boolean }[] = [];

  // 步骤2: 信息搜索 - 非时事内容可跳过
  const outlineText = workflowData.collaboration?.outline || '';
  const newsContent = isNewsContent(title, outlineText);
  results.push({
    step: 2,
    reason: newsContent 
      ? '时事类内容建议进行信息搜索获取最新数据' 
      : '非时事内容可跳过此步骤',
    canSkip: !newsContent,
  });

  // 步骤3: 协作文档 - 已有大纲可跳过
  const hasOutline = !!workflowData.collaboration?.outline;
  results.push({
    step: 3,
    reason: hasOutline 
      ? '已有大纲，可跳过此步骤' 
      : '建议生成大纲以获得更好的文章结构',
    canSkip: hasOutline,
  });

  // 步骤4: 学习风格 - 已有风格设置可跳过
  const hasStyle = hasStyleAnalysis(workflowData);
  results.push({
    step: 4,
    reason: hasStyle 
      ? '已有风格设置，可跳过此步骤' 
      : '建议学习参考文章风格以提升内容质量',
    canSkip: hasStyle,
  });

  // 步骤5: 素材库 - 已有素材可跳过
  const hasMaterial = hasMaterials(workflowData);
  results.push({
    step: 5,
    reason: hasMaterial 
      ? '已有素材，可跳过此步骤' 
      : '建议搜索素材以增强内容真实感',
    canSkip: hasMaterial,
  });

  // 步骤6: 等待数据 - 一般可跳过
  results.push({
    step: 6,
    reason: '除非需要等待外部数据（如采访回复），否则可跳过',
    canSkip: true,
  });

  return results;
}

/**
 * 自动确定下一步应该执行的步骤
 * 跳过可以跳过的步骤
 */
export function getNextRequiredStep(
  currentStep: number,
  workflowData: WorkflowData,
  title: string = ''
): { nextStep: number; skippedSteps: number[]; message: string } {
  const skippable = getSkippableSteps(workflowData, title);
  const skippedSteps: number[] = [];

  let nextStep = currentStep + 1;
  
  // 跳过可以跳过的步骤
  while (nextStep <= 6) { // 步骤7是初稿生成，必须执行
    const stepInfo = skippable.find(s => s.step === nextStep);
    if (stepInfo?.canSkip) {
      skippedSteps.push(nextStep);
      nextStep++;
    } else {
      break;
    }
  }

  let message = '';
  if (skippedSteps.length > 0) {
    const stepNames = skippedSteps.map(s => WORKFLOW_STEPS[s]?.label || `步骤${s}`);
    message = `已自动跳过 ${stepNames.join('、')}，直接进入 ${WORKFLOW_STEPS[nextStep]?.label || `步骤${nextStep}`}`;
  }

  return { nextStep, skippedSteps, message };
}

/**
 * 获取工作流执行建议
 */
export function getWorkflowRecommendations(
  workflowData: WorkflowData,
  title: string = ''
): {
  currentStep: number;
  requiredSteps: number[];
  optionalSteps: number[];
  recommendations: string[];
} {
  const skippable = getSkippableSteps(workflowData, title);
  
  // 确定当前步骤
  let currentStep = 0;
  if (workflowData.review?.completedAt) currentStep = 8;
  else if (workflowData.draft?.completedAt) currentStep = 7;
  else if (workflowData.materials?.completedAt) currentStep = 5;
  else if (workflowData.style?.completedAt) currentStep = 4;
  else if (workflowData.collaboration?.completedAt) currentStep = 3;
  else if (workflowData.topicDiscussion?.completedAt) currentStep = 1;
  else if (workflowData.understanding?.completedAt) currentStep = 0;

  const requiredSteps: number[] = [];
  const optionalSteps: number[] = [];
  const recommendations: string[] = [];

  for (const step of WORKFLOW_STEPS) {
    if (step.required) {
      requiredSteps.push(step.step);
    } else {
      optionalSteps.push(step.step);
    }
  }

  // 生成建议
  const skippableSteps = skippable.filter(s => s.canSkip).map(s => s.step);
  if (skippableSteps.length > 0) {
    recommendations.push(`以下步骤可以跳过：${skippableSteps.map(s => WORKFLOW_STEPS[s]?.label).join('、')}`);
  }

  if (!workflowData.topicDiscussion?.completedAt) {
    recommendations.push('建议先完成选题讨论，确定切入角度');
  }

  if (!workflowData.style?.analysis && !workflowData.style?.templateId) {
    recommendations.push('建议学习参考文章风格，提升内容质量');
  }

  return {
    currentStep,
    requiredSteps,
    optionalSteps,
    recommendations,
  };
}

// 获取步骤信息
export function getStepInfo(step: number) {
  return WORKFLOW_STEPS.find(s => s.step === step);
}

// 获取下一步
export function getNextStep(currentStep: number): number {
  const next = currentStep + 1;
  return next <= 8 ? next : 8;
}

// 检查是否可以跳过
export function canSkipStep(step: number): boolean {
  const info = getStepInfo(step);
  return !info?.required;
}

// 解析工作流数据
export function parseWorkflowData(json: string): WorkflowData {
  try {
    return JSON.parse(json || '{}');
  } catch {
    return {};
  }
}
