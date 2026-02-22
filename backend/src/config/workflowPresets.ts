/**
 * 工作流配置预设模板
 */

import { WorkflowTemplateConfig } from '../types/workflowTemplate.js';
import { COLUMN_STYLES, HKR_DIMENSIONS, ANTI_AI_CHECKLIST } from '../services/article/prompts.js';

// 通用变量定义
const COMMON_VARIABLES = {
  title: { name: '文章标题', description: '文章的标题', required: false },
  platform: { name: '平台名称', description: '发布平台', required: true },
  column: { name: '栏目名称', description: '文章栏目', required: true },
  columnStyle: { name: '栏目风格', description: '栏目风格描述', required: false },
  topic: { name: '选题内容', description: '文章选题', required: false },
  context: { name: '上下文信息', description: '补充背景信息', required: false },
  outline: { name: '大纲内容', description: '文章大纲', required: false },
  materials: { name: '素材内容', description: '参考素材', required: false },
  content: { name: '文章内容', description: '文章正文', required: false },
  angle: { name: '切入角度', description: '文章切入角度', required: false },
};

// 通用步骤配置
const COMMON_STEPS = {
  0: {
    enabled: true,
    required: false,
    name: 'understand',
    label: '理解需求',
    description: '明确写作目标和受众',
  },
  1: {
    enabled: true,
    required: false,
    name: 'search',
    label: '信息搜索',
    description: '搜索相关资料',
  },
  2: {
    enabled: true,
    required: true,
    name: 'topic',
    label: '选题讨论',
    description: '确定切入角度',
  },
  3: {
    enabled: true,
    required: false,
    name: 'collaboration',
    label: '协作文档',
    description: '整理素材和大纲',
  },
  4: {
    enabled: true,
    required: false,
    name: 'style',
    label: '学习风格',
    description: '学习平台风格',
  },
  5: {
    enabled: true,
    required: true,
    name: 'materials',
    label: '使用素材库',
    description: '引用知识库素材',
  },
  6: {
    enabled: true,
    required: false,
    name: 'data',
    label: '等待数据',
    description: '等待数据补充',
  },
  7: {
    enabled: true,
    required: true,
    name: 'draft',
    label: '创作初稿',
    description: '生成文章初稿',
  },
  8: {
    enabled: true,
    required: true,
    name: 'review',
    label: '三遍审校',
    description: 'HKR评分和降AI味',
  },
};

// 深度分析模板（公众号-深度）
export const DEEP_ANALYSIS_PRESET: WorkflowTemplateConfig = {
  steps: COMMON_STEPS,
  columnStyles: COLUMN_STYLES,
  hkrDimensions: {
    H: { ...HKR_DIMENSIONS.H, weight: 0.3 },
    K: { ...HKR_DIMENSIONS.K, weight: 0.4 },
    R: { ...HKR_DIMENSIONS.R, weight: 0.3 },
  },
  antiAIChecklist: ANTI_AI_CHECKLIST.map(item => ({ ...item, enabled: true })),
  prompts: {
    topicDiscussion: `你是一位资深内容策划，请帮我分析这个选题的可行性。

## 选题信息
- 主题：{{topic}}
- 平台：{{platform}}
- 栏目：{{column}}
- 风格要求：{{columnStyle}}
{{context}}

## 请分析以下方面

### 1. 选题价值评估
- 目标读者是谁？
- 解决什么问题/满足什么需求？
- 时效性如何？

### 2. 差异化角度
- 提供3个可能的切入角度
- 每个角度的优劣势

### 3. 风险提示
- 可能遇到的问题
- 需要注意的事项`,

    outline: `基于选题分析，请帮我创建文章大纲。

## 选题信息
- 标题：{{title}}
- 切入角度：{{angle}}
- 平台：{{platform}}
- 栏目：{{column}}

## 大纲要求
1. 结构清晰，逻辑严密
2. 每个部分有明确的论点
3. 标注需要的数据和案例
4. 字数控制在3000-5000字`,

    draft: `请根据大纲创作文章初稿。

## 大纲
{{outline}}

## 素材
{{materials}}

## 要求
1. 严格按照大纲结构
2. 使用真实数据和案例
3. 保持逻辑严密
4. 字数3000-5000字
5. 避免AI套话`,

    review: `请对文章进行三遍审校。

## 文章内容
{{content}}

## 审校要点
1. 第一遍：检查逻辑和结构
2. 第二遍：降AI味处理
3. 第三遍：优化表达和细节`,

    hkr: `请对文章进行HKR评分。

## 文章内容
{{content}}

## 评分维度
- H (Happiness/Hook): 开头吸引力
- K (Knowledge): 知识价值
- R (Resonance): 情感共鸣

请给出0-100分的评分和详细评语。`,

    hkrImprove: `根据HKR评分结果，请改进文章。

## 原文
{{content}}

## HKR评分
{{hkrScore}}

## 改进要求
针对低分维度进行重点优化。`,

    optimize: `请优化文章内容。

## 原文
{{content}}

## 优化方向
1. 提升可读性
2. 增强说服力
3. 优化细节表达`,
  },
  variables: COMMON_VARIABLES,
  advanced: {
    maxRetries: 3,
    timeout: 60000,
    temperature: 0.7,
    enableAutoSave: true,
    autoSaveInterval: 30000,
  },
};

// 快讯速递模板（公众号-速递）
export const QUICK_NEWS_PRESET: WorkflowTemplateConfig = {
  steps: COMMON_STEPS,
  columnStyles: COLUMN_STYLES,
  hkrDimensions: {
    H: { ...HKR_DIMENSIONS.H, weight: 0.5 },
    K: { ...HKR_DIMENSIONS.K, weight: 0.3 },
    R: { ...HKR_DIMENSIONS.R, weight: 0.2 },
  },
  antiAIChecklist: ANTI_AI_CHECKLIST.map(item => ({ ...item, enabled: true })),
  prompts: {
    topicDiscussion: `你是一位资深内容策划，请帮我分析这个快讯选题。

## 选题信息
- 主题：{{topic}}
- 平台：{{platform}}
- 栏目：{{column}}

## 分析要点
1. 时效性评估
2. 信息价值
3. 目标读者关注度`,

    outline: `创建快讯文章大纲。字数800-1500字。`,
    draft: `创作快讯初稿。要求简洁明了，信息准确。`,
    review: `审校快讯文章。检查信息准确性。`,
    hkr: `HKR评分（快讯）。重点评估开头吸引力。`,
    hkrImprove: `改进快讯文章。`,
    optimize: `优化快讯。提升时效性和信息密度。`,
  },
  variables: COMMON_VARIABLES,
  advanced: {
    maxRetries: 3,
    timeout: 45000,
    temperature: 0.7,
    enableAutoSave: true,
    autoSaveInterval: 30000,
  },
};

// 所有预设模板
export const WORKFLOW_PRESETS: Record<string, {
  id: string;
  name: string;
  description: string;
  platform: string;
  column: string;
  config: WorkflowTemplateConfig;
}> = {
  'deep-analysis': {
    id: 'deep-analysis',
    name: '深度分析模板',
    description: '适用于公众号深度分析类文章，强调数据支撑和逻辑严密',
    platform: 'wechat',
    column: '深度',
    config: DEEP_ANALYSIS_PRESET,
  },
  'quick-news': {
    id: 'quick-news',
    name: '快讯速递模板',
    description: '适用于公众号快讯类文章，强调时效性和信息密度',
    platform: 'wechat',
    column: '速递',
    config: QUICK_NEWS_PRESET,
  },
};
