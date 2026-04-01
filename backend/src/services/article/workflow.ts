import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface WorkflowStepDefinition {
  step: number;
  name: string;
  label: string;
  description: string;
  required?: boolean;
}

export const WORKFLOW_STEPS: WorkflowStepDefinition[] = [
  { step: 0, name: 'understand', label: '理解需求', description: '明确写作目标和受众' },
  { step: 1, name: 'topic', label: '选题讨论', description: '确定切入角度', required: true },
  { step: 2, name: 'search', label: '信息搜索', description: '搜索相关资料' },
  { step: 3, name: 'collaborate', label: '协作文档', description: '整理素材和要点' },
  { step: 4, name: 'style', label: '学习风格', description: '加载栏目风格指南' },
  { step: 5, name: 'materials', label: '素材库', description: '选择知识库素材', required: true },
  { step: 6, name: 'waiting', label: '等待数据', description: '等待必要数据' },
  { step: 7, name: 'draft', label: '创作初稿', description: 'AI 辅助生成初稿' },
  { step: 8, name: 'review', label: '三遍审校', description: '降 AI 味与质量审校', required: true },
] as const;

export interface WorkflowData {
  understanding?: {
    notes: string;
    completedAt?: string;
  };
  requirement?: {
    goal: string;
    audience: string;
    keyPoints: string[];
    completedAt?: string;
  };
  topicDiscussion?: {
    input: string;
    analysis: string;
    completedAt?: string;
  };
  search?: {
    content?: string;
    completedAt?: string;
  };
  searchResults?: {
    query: string;
    results: Array<{ title: string; url: string; summary: string }>;
    completedAt?: string;
  };
  collaboration?: {
    outline: string;
    completedAt?: string;
  };
  style?: {
    platform?: string;
    column?: string;
    templateId?: string;
    analysis?: unknown;
    completedAt?: string;
  };
  materials?: {
    knowledgeResults?: Array<{ title?: string; excerpt?: string; summary?: string }>;
    webSearchContent?: string;
    completedAt?: string;
  };
  waiting?: {
    notes: string;
    completedAt?: string;
  };
  draft?: {
    content: string;
    completedAt?: string;
  };
  review?: {
    reviewResult: string;
    hkrScore: unknown;
    completedAt?: string;
  };
}

export interface WorkflowContext {
  topicAnalysis?: string;
  outline?: string;
  styleAnalysis?: unknown;
  materials?: string;
  webSearchContent?: string;
  understanding?: string;
  raw: WorkflowData;
}

export function buildWorkflowContext(workflowData: WorkflowData): WorkflowContext {
  const context: WorkflowContext = { raw: workflowData };

  if (workflowData.topicDiscussion?.analysis) {
    context.topicAnalysis = workflowData.topicDiscussion.analysis;
  }

  if (workflowData.collaboration?.outline) {
    context.outline = workflowData.collaboration.outline;
  }

  if (workflowData.style?.analysis) {
    context.styleAnalysis = workflowData.style.analysis;
  }

  const materialItems = workflowData.materials?.knowledgeResults ?? [];
  if (materialItems.length > 0) {
    context.materials = materialItems
      .map((item) => `《${item.title || '未命名素材'}》\n${item.excerpt || item.summary || ''}`)
      .join('\n\n---\n\n');
  }

  if (workflowData.materials?.webSearchContent) {
    context.webSearchContent = workflowData.materials.webSearchContent;
  }

  if (workflowData.understanding?.notes) {
    context.understanding = workflowData.understanding.notes;
  } else if (workflowData.requirement) {
    const { goal, audience, keyPoints } = workflowData.requirement;
    context.understanding = [
      goal ? `目标：${goal}` : '',
      audience ? `受众：${audience}` : '',
      keyPoints?.length ? `关键点：${keyPoints.join('、')}` : '',
    ].filter(Boolean).join('\n');
  }

  return context;
}

export function hasStyleAnalysis(workflowData: WorkflowData): boolean {
  return Boolean(workflowData.style?.analysis || workflowData.style?.templateId);
}

export function hasMaterials(workflowData: WorkflowData): boolean {
  return Boolean(
    (workflowData.materials?.knowledgeResults?.length ?? 0) > 0 ||
    workflowData.materials?.webSearchContent
  );
}

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

const NEWS_KEYWORDS = [
  '最新', '最近', '今天', '本周', '本月', '突发', '发布', '上线',
  '更新', '升级', '推出', '2024', '2025', '2026', '政策', '法规',
  '监管', '行业动态', '市场', 'gpt', 'claude', 'ai', '大模型',
];

export function isNewsContent(title: string, outline: string): boolean {
  const text = `${title} ${outline}`.toLowerCase();
  return NEWS_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()));
}

export function getSkippableSteps(
  workflowData: WorkflowData,
  title: string = ''
): Array<{ step: number; reason: string; canSkip: boolean }> {
  const outlineText = workflowData.collaboration?.outline || '';
  const newsContent = isNewsContent(title, outlineText);
  const hasOutline = Boolean(workflowData.collaboration?.outline);
  const hasStyle = hasStyleAnalysis(workflowData);
  const hasMaterial = hasMaterials(workflowData);

  return [
    {
      step: 2,
      reason: newsContent ? '时事内容建议搜索最新资料' : '非时事内容可跳过搜索',
      canSkip: !newsContent,
    },
    {
      step: 3,
      reason: hasOutline ? '已存在大纲，可跳过协作文档' : '建议先整理大纲',
      canSkip: hasOutline,
    },
    {
      step: 4,
      reason: hasStyle ? '已存在风格分析，可跳过' : '建议先补充风格分析',
      canSkip: hasStyle,
    },
    {
      step: 5,
      reason: hasMaterial ? '已存在素材，可跳过' : '建议补充知识库或网络素材',
      canSkip: hasMaterial,
    },
    {
      step: 6,
      reason: '除非要等外部数据，否则通常可跳过',
      canSkip: true,
    },
  ];
}

export function getNextRequiredStep(
  currentStep: number,
  workflowData: WorkflowData,
  title: string = ''
): { nextStep: number; skippedSteps: number[]; message: string } {
  const skippable = getSkippableSteps(workflowData, title);
  const skippedSteps: number[] = [];
  let nextStep = currentStep + 1;

  while (nextStep <= 6) {
    const info = skippable.find((item) => item.step === nextStep);
    if (!info?.canSkip) {
      break;
    }
    skippedSteps.push(nextStep);
    nextStep += 1;
  }

  const message = skippedSteps.length > 0
    ? `已自动跳过 ${skippedSteps.map((step) => WORKFLOW_STEPS[step]?.label || `步骤${step}`).join('、')}`
    : '';

  return { nextStep, skippedSteps, message };
}

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

  let currentStep = 0;
  if (workflowData.review?.completedAt) currentStep = 8;
  else if (workflowData.draft?.completedAt) currentStep = 7;
  else if (workflowData.materials?.completedAt) currentStep = 5;
  else if (workflowData.style?.completedAt) currentStep = 4;
  else if (workflowData.collaboration?.completedAt) currentStep = 3;
  else if (workflowData.topicDiscussion?.completedAt) currentStep = 1;
  else if (workflowData.understanding?.completedAt || workflowData.requirement?.completedAt) currentStep = 0;

  const requiredSteps = WORKFLOW_STEPS.filter((step) => step.required).map((step) => step.step);
  const optionalSteps = WORKFLOW_STEPS.filter((step) => !step.required).map((step) => step.step);
  const recommendations: string[] = [];

  const skippableLabels = skippable
    .filter((step) => step.canSkip)
    .map((step) => WORKFLOW_STEPS[step.step]?.label)
    .filter(Boolean);

  if (skippableLabels.length > 0) {
    recommendations.push(`可跳过步骤：${skippableLabels.join('、')}`);
  }

  if (!workflowData.topicDiscussion?.completedAt) {
    recommendations.push('建议先完成选题讨论。');
  }

  if (!hasStyleAnalysis(workflowData)) {
    recommendations.push('建议补充风格分析以提升成稿一致性。');
  }

  return {
    currentStep,
    requiredSteps,
    optionalSteps,
    recommendations,
  };
}

export function getStepInfo(step: number) {
  return WORKFLOW_STEPS.find((item) => item.step === step);
}

export function getNextStep(currentStep: number): number {
  const next = currentStep + 1;
  return next <= 8 ? next : 8;
}

export function canSkipStep(step: number): boolean {
  return !getStepInfo(step)?.required;
}

export function parseWorkflowData(json: string): WorkflowData {
  try {
    return JSON.parse(json || '{}') as WorkflowData;
  } catch {
    return {};
  }
}

export async function enrichWorkflowWithMetrics(params: {
  platform: string;
  column: string;
  limit?: number;
}): Promise<{
  topArticles: Array<{
    title: string;
    platform: string;
    views: number;
    likes: number;
    engagementRate: number;
    publishedAt: string;
  }>;
  insights: string;
}> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 90);

    const metrics = await prisma.contentMetrics.findMany({
      where: {
        platform: params.platform,
        metricsDate: { gte: since },
        articleId: { not: null },
        article: params.column ? { column: params.column } : undefined,
      },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            platform: true,
            createdAt: true,
            publishedAt: true,
          },
        },
      },
      orderBy: { metricsDate: 'desc' },
      take: 200,
    });

    const grouped = new Map<string, {
      title: string;
      platform: string;
      views: number;
      likes: number;
      engagementRateSum: number;
      engagementRateCount: number;
      publishedAt: string;
    }>();

    for (const item of metrics) {
      if (!item.article) {
        continue;
      }

      const current = grouped.get(item.article.id) ?? {
        title: item.article.title,
        platform: item.article.platform || params.platform,
        views: 0,
        likes: 0,
        engagementRateSum: 0,
        engagementRateCount: 0,
        publishedAt: (item.article.publishedAt || item.article.createdAt).toISOString(),
      };

      current.views += item.viewCount;
      current.likes += item.likeCount;
      current.engagementRateSum += item.engagementRate ?? 0;
      current.engagementRateCount += 1;

      grouped.set(item.article.id, current);
    }

    const topArticles = Array.from(grouped.values())
      .map((item) => ({
        title: item.title,
        platform: item.platform,
        views: item.views,
        likes: item.likes,
        engagementRate: item.engagementRateCount > 0
          ? item.engagementRateSum / item.engagementRateCount
          : 0,
        publishedAt: item.publishedAt,
      }))
      .sort((a, b) => {
        if (b.engagementRate !== a.engagementRate) {
          return b.engagementRate - a.engagementRate;
        }
        return b.views - a.views;
      })
      .slice(0, params.limit || 10);

    if (topArticles.length === 0) {
      return {
        topArticles: [],
        insights: '暂无历史发布数据，建议先积累一些发布记录。',
      };
    }

    const avgViews = topArticles.reduce((sum, item) => sum + item.views, 0) / topArticles.length;
    const avgEngagement = topArticles.reduce((sum, item) => sum + item.engagementRate, 0) / topArticles.length;

    return {
      topArticles,
      insights: `${params.platform} 平台近 90 天 top ${topArticles.length} 内容平均阅读 ${Math.round(avgViews)}，平均互动率 ${(avgEngagement * 100).toFixed(1)}%。`,
    };
  } catch (error) {
    console.error('[Workflow] 获取效果数据失败:', error);
    return {
      topArticles: [],
      insights: '获取历史数据失败',
    };
  }
}
