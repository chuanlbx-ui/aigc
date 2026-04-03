import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  WORKFLOW_STEPS,
  buildWorkflowContext,
  hasStyleAnalysis,
  hasMaterials,
  formatContextForPrompt,
  isNewsContent,
  getSkippableSteps,
  getNextRequiredStep,
  getWorkflowRecommendations,
  getStepInfo,
  getNextStep,
  canSkipStep,
  parseWorkflowData,
  type WorkflowData,
  type WorkflowContext,
} from './workflow.js';

describe('Workflow Service', () => {
  describe('WORKFLOW_STEPS', () => {
    it('应该包含正确的步骤数量', () => {
      expect(WORKFLOW_STEPS).toHaveLength(9);
    });

    it('应该包含所有必需的步骤', () => {
      const requiredSteps = WORKFLOW_STEPS.filter(s => s.required).map(s => s.name);
      expect(requiredSteps).toContain('topic');
      expect(requiredSteps).toContain('materials');
      expect(requiredSteps).toContain('review');
    });
  });

  describe('buildWorkflowContext', () => {
    it('应该从 topicDiscussion 构建 context', () => {
      const workflowData: WorkflowData = {
        topicDiscussion: {
          input: '测试主题',
          analysis: '这是一个分析结果',
          completedAt: '2024-01-01',
        },
      };
      
      const context = buildWorkflowContext(workflowData);
      
      expect(context.topicAnalysis).toBe('这是一个分析结果');
      expect(context.raw).toEqual(workflowData);
    });

    it('应该从 collaboration.outline 构建 context', () => {
      const workflowData: WorkflowData = {
        collaboration: {
          outline: '测试大纲',
          completedAt: '2024-01-01',
        },
      };
      
      const context = buildWorkflowContext(workflowData);
      
      expect(context.outline).toBe('测试大纲');
    });

    it('应该从 style.analysis 构建 context', () => {
      const workflowData: WorkflowData = {
        style: {
          analysis: { tone: 'formal', style: 'news' },
          completedAt: '2024-01-01',
        },
      };
      
      const context = buildWorkflowContext(workflowData);
      
      expect(context.styleAnalysis).toEqual({ tone: 'formal', style: 'news' });
    });

    it('应该从 materials.knowledgeResults 构建 context', () => {
      const workflowData: WorkflowData = {
        materials: {
          knowledgeResults: [
            { title: '素材1', excerpt: '素材内容1' },
            { title: '素材2', summary: '素材摘要2' },
          ],
          completedAt: '2024-01-01',
        },
      };
      
      const context = buildWorkflowContext(workflowData);
      
      expect(context.materials).toContain('《素材1》');
      expect(context.materials).toContain('素材内容1');
      expect(context.materials).toContain('《素材2》');
      expect(context.materials).toContain('素材摘要2');
    });

    it('应该从 materials.webSearchContent 构建 context', () => {
      const workflowData: WorkflowData = {
        materials: {
          webSearchContent: '搜索结果内容',
          completedAt: '2024-01-01',
        },
      };
      
      const context = buildWorkflowContext(workflowData);
      
      expect(context.webSearchContent).toBe('搜索结果内容');
    });

    it('应该从 understanding.notes 构建 context', () => {
      const workflowData: WorkflowData = {
        understanding: {
          notes: '理解笔记',
          completedAt: '2024-01-01',
        },
      };
      
      const context = buildWorkflowContext(workflowData);
      
      expect(context.understanding).toBe('理解笔记');
    });

    it('应该从 requirement 构建 context 作为后备', () => {
      const workflowData: WorkflowData = {
        requirement: {
          goal: '写作目标',
          audience: '目标受众',
          keyPoints: ['要点1', '要点2'],
          completedAt: '2024-01-01',
        },
      };
      
      const context = buildWorkflowContext(workflowData);
      
      expect(context.understanding).toContain('写作目标');
      expect(context.understanding).toContain('目标受众');
      expect(context.understanding).toContain('要点1');
      expect(context.understanding).toContain('要点2');
    });
  });

  describe('hasStyleAnalysis', () => {
    it('当存在 style.analysis 时应该返回 true', () => {
      const workflowData: WorkflowData = {
        style: {
          analysis: { tone: 'formal' },
          completedAt: '2024-01-01',
        },
      };
      
      expect(hasStyleAnalysis(workflowData)).toBe(true);
    });

    it('当存在 style.templateId 时应该返回 true', () => {
      const workflowData: WorkflowData = {
        style: {
          templateId: 'template-1',
          completedAt: '2024-01-01',
        },
      };
      
      expect(hasStyleAnalysis(workflowData)).toBe(true);
    });

    it('当两者都不存在时应该返回 false', () => {
      const workflowData: WorkflowData = {
        style: {
          platform: 'wechat',
          column: 'tech',
          completedAt: '2024-01-01',
        },
      };
      
      expect(hasStyleAnalysis(workflowData)).toBe(false);
    });
  });

  describe('hasMaterials', () => {
    it('当存在 knowledgeResults 时应该返回 true', () => {
      const workflowData: WorkflowData = {
        materials: {
          knowledgeResults: [{ title: '素材1' }],
          completedAt: '2024-01-01',
        },
      };
      
      expect(hasMaterials(workflowData)).toBe(true);
    });

    it('当存在 webSearchContent 时应该返回 true', () => {
      const workflowData: WorkflowData = {
        materials: {
          webSearchContent: '搜索内容',
          completedAt: '2024-01-01',
        },
      };
      
      expect(hasMaterials(workflowData)).toBe(true);
    });

    it('当两者都不存在时应该返回 false', () => {
      const workflowData: WorkflowData = {
        materials: {
          completedAt: '2024-01-01',
        },
      };
      
      expect(hasMaterials(workflowData)).toBe(false);
    });

    it('当 materials 为空时应该返回 false', () => {
      const workflowData: WorkflowData = {};
      
      expect(hasMaterials(workflowData)).toBe(false);
    });
  });

  describe('formatContextForPrompt', () => {
    it('应该正确格式化所有上下文', () => {
      const context: WorkflowContext = {
        understanding: '写作目标',
        topicAnalysis: '选题分析',
        outline: '文章大纲',
        styleAnalysis: { tone: 'formal' },
        materials: '参考素材',
        webSearchContent: '搜索结果',
        raw: {},
      };
      
      const formatted = formatContextForPrompt(context);
      
      expect(formatted).toContain('## 写作目标');
      expect(formatted).toContain('写作目标');
      expect(formatted).toContain('## 选题分析');
      expect(formatted).toContain('选题分析');
      expect(formatted).toContain('## 文章大纲');
      expect(formatted).toContain('文章大纲');
      expect(formatted).toContain('## 风格要求');
      expect(formatted).toContain('## 参考素材');
      expect(formatted).toContain('参考素材');
      expect(formatted).toContain('## 网络搜索结果');
      expect(formatted).toContain('搜索结果');
    });

    it('应该只包含存在的字段', () => {
      const context: WorkflowContext = {
        understanding: '只有目标',
        raw: {},
      };
      
      const formatted = formatContextForPrompt(context);
      
      expect(formatted).toContain('写作目标');
      expect(formatted).not.toContain('选题分析');
      expect(formatted).not.toContain('文章大纲');
    });
  });

  describe('isNewsContent', () => {
    it('应该识别包含最新关键词的内容', () => {
      expect(isNewsContent('最新 AI 技术发布', '介绍新技术')).toBe(true);
    });

    it('应该识别包含日期的内容', () => {
      expect(isNewsContent('2024年技术趋势', '分析今年的发展')).toBe(true);
    });

    it('应该识别包含突发关键词的内容', () => {
      expect(isNewsContent('突发事件报道', '今天发生的新闻')).toBe(true);
    });

    it('应该识别包含 AI 相关关键词的内容', () => {
      expect(isNewsContent('GPT-5 何时发布', '关于新模型的讨论')).toBe(true);
    });

    it('应该识别包含政策关键词的内容', () => {
      expect(isNewsContent('监管政策解读', '最新法规分析')).toBe(true);
    });

    it('不应该将普通内容识别为新闻', () => {
      expect(isNewsContent('如何写好一篇文章', '写作技巧分享')).toBe(false);
    });
  });

  describe('getSkippableSteps', () => {
    it('时事内容应该标记搜索步骤为可跳过', () => {
      const workflowData: WorkflowData = {};
      const result = getSkippableSteps(workflowData, '最新 AI 发布');
      
      const searchStep = result.find(r => r.step === 2);
      expect(searchStep?.canSkip).toBe(false);
      expect(searchStep?.reason).toContain('时事内容建议搜索最新资料');
    });

    it('非时事内容应该标记搜索步骤为可跳过', () => {
      const workflowData: WorkflowData = {};
      const result = getSkippableSteps(workflowData, '写作技巧分享');
      
      const searchStep = result.find(r => r.step === 2);
      expect(searchStep?.canSkip).toBe(true);
      expect(searchStep?.reason).toContain('可跳过搜索');
    });

    it('已存在大纲时应该标记协作文档为可跳过', () => {
      const workflowData: WorkflowData = {
        collaboration: {
          outline: '测试大纲',
          completedAt: '2024-01-01',
        },
      };
      const result = getSkippableSteps(workflowData);
      
      const collabStep = result.find(r => r.step === 3);
      expect(collabStep?.canSkip).toBe(true);
    });

    it('已存在风格分析时应该标记风格步骤为可跳过', () => {
      const workflowData: WorkflowData = {
        style: {
          analysis: { tone: 'formal' },
          completedAt: '2024-01-01',
        },
      };
      const result = getSkippableSteps(workflowData);
      
      const styleStep = result.find(r => r.step === 4);
      expect(styleStep?.canSkip).toBe(true);
    });

    it('已存在素材时应该标记素材步骤为可跳过', () => {
      const workflowData: WorkflowData = {
        materials: {
          knowledgeResults: [{ title: '素材1' }],
          completedAt: '2024-01-01',
        },
      };
      const result = getSkippableSteps(workflowData);
      
      const materialsStep = result.find(r => r.step === 5);
      expect(materialsStep?.canSkip).toBe(true);
    });

    it('等待步骤应该始终可跳过', () => {
      const workflowData: WorkflowData = {};
      const result = getSkippableSteps(workflowData);
      
      const waitingStep = result.find(r => r.step === 6);
      expect(waitingStep?.canSkip).toBe(true);
    });
  });

  describe('getNextRequiredStep', () => {
    it('当下一步是必需步骤时应该返回该步骤', () => {
      const workflowData: WorkflowData = {};
      // 步骤1(topic)是必需的，不会被跳过
      const result = getNextRequiredStep(0, workflowData, '写作技巧分享');
      
      // 步骤1是必需的 topic 步骤，不会跳过
      expect(result.nextStep).toBe(1);
    });

    it('当有多个可跳过步骤时应该跳过它们', () => {
      const workflowData: WorkflowData = {
        topicDiscussion: { input: 'test', analysis: 'analysis', completedAt: '2024-01-01' },
        collaboration: { outline: '已有大纲', completedAt: '2024-01-01' },
        style: { analysis: { tone: 'formal' }, completedAt: '2024-01-01' },
        materials: { knowledgeResults: [{ title: '素材1' }], completedAt: '2024-01-01' },
      };
      // 当前在步骤1，已完成 topic，下一步是步骤2（搜索）
      // 步骤2-5 都是可跳过的，应该跳到步骤6（等待）
      const result = getNextRequiredStep(1, workflowData, '写作技巧分享');
      
      // 步骤2-5 都是可跳过的，步骤6是等待可跳过
      expect(result.nextStep).toBe(7); // 步骤6也是可跳过的，会继续到步骤7（草稿）
    });

    it('当没有任何可跳过步骤时应该返回空消息', () => {
      const workflowData: WorkflowData = {};
      const result = getNextRequiredStep(0, workflowData, '写作技巧分享');
      
      // 步骤1(topic)是必需的，没有步骤被跳过
      expect(result.message).toBe('');
    });
  });

  describe('getWorkflowRecommendations', () => {
    it('应该返回当前步骤为 review 完成时', () => {
      const workflowData: WorkflowData = {
        review: {
          reviewResult: '审核通过',
          hkrScore: { score: 80 },
          completedAt: '2024-01-01',
        },
      };
      
      const result = getWorkflowRecommendations(workflowData);
      
      expect(result.currentStep).toBe(8);
    });

    it('应该返回当前步骤为 draft 完成时', () => {
      const workflowData: WorkflowData = {
        draft: {
          content: '测试内容',
          completedAt: '2024-01-01',
        },
      };
      
      const result = getWorkflowRecommendations(workflowData);
      
      expect(result.currentStep).toBe(7);
    });

    it('应该返回必需步骤列表', () => {
      const workflowData: WorkflowData = {};
      
      const result = getWorkflowRecommendations(workflowData);
      
      expect(result.requiredSteps).toContain(1); // topic
      expect(result.requiredSteps).toContain(5); // materials
      expect(result.requiredSteps).toContain(8); // review
    });

    it('应该返回可选步骤列表', () => {
      const workflowData: WorkflowData = {};
      
      const result = getWorkflowRecommendations(workflowData);
      
      expect(result.optionalSteps).toContain(0); // understand
      expect(result.optionalSteps).toContain(2); // search
    });

    it('应该给出可跳过步骤建议', () => {
      const workflowData: WorkflowData = {
        collaboration: { outline: '已有大纲', completedAt: '2024-01-01' },
        style: { analysis: {}, completedAt: '2024-01-01' },
      };
      
      const result = getWorkflowRecommendations(workflowData);
      
      expect(result.recommendations.some(r => r.includes('可跳过步骤'))).toBe(true);
    });

    it('应该在未完成选题讨论时给出建议', () => {
      const workflowData: WorkflowData = {};
      
      const result = getWorkflowRecommendations(workflowData);
      
      expect(result.recommendations.some(r => r.includes('选题讨论'))).toBe(true);
    });

    it('应该在未完成风格分析时给出建议', () => {
      const workflowData: WorkflowData = {};
      
      const result = getWorkflowRecommendations(workflowData);
      
      expect(result.recommendations.some(r => r.includes('风格分析'))).toBe(true);
    });
  });

  describe('getStepInfo', () => {
    it('应该返回对应步骤的信息', () => {
      const stepInfo = getStepInfo(1);
      
      expect(stepInfo).toBeDefined();
      expect(stepInfo?.name).toBe('topic');
      expect(stepInfo?.label).toBe('选题讨论');
    });

    it('当步骤不存在时应该返回 undefined', () => {
      const stepInfo = getStepInfo(99);
      
      expect(stepInfo).toBeUndefined();
    });
  });

  describe('getNextStep', () => {
    it('应该返回下一个步骤', () => {
      expect(getNextStep(0)).toBe(1);
      expect(getNextStep(1)).toBe(2);
      expect(getNextStep(7)).toBe(8);
    });

    it('当已经是最后一步时应该保持不变', () => {
      expect(getNextStep(8)).toBe(8);
    });
  });

  describe('canSkipStep', () => {
    it('required 步骤应该返回 false', () => {
      expect(canSkipStep(1)).toBe(false); // topic
      expect(canSkipStep(5)).toBe(false); // materials
      expect(canSkipStep(8)).toBe(false); // review
    });

    it('非 required 步骤应该返回 true', () => {
      expect(canSkipStep(0)).toBe(true); // understand
      expect(canSkipStep(2)).toBe(true); // search
      expect(canSkipStep(3)).toBe(true); // collaborate
    });
  });

  describe('parseWorkflowData', () => {
    it('应该正确解析有效的 JSON', () => {
      const json = '{"topicDiscussion": {"input": "test"}}';
      const result = parseWorkflowData(json);
      
      expect(result.topicDiscussion?.input).toBe('test');
    });

    it('应该处理空字符串', () => {
      const result = parseWorkflowData('');
      
      expect(result).toEqual({});
    });

    it('应该处理 null', () => {
      const result = parseWorkflowData(null as any);
      
      expect(result).toEqual({});
    });

    it('应该处理无效 JSON 并返回空对象', () => {
      const result = parseWorkflowData('invalid json');
      
      expect(result).toEqual({});
    });
  });
});
