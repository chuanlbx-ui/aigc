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
