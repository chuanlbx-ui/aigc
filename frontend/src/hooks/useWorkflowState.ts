import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { message } from 'antd';

// 工作流数据接口
export interface WorkflowData {
  // 步骤0: 理解需求
  understanding?: {
    notes: string;
    completedAt?: string;
  };
  // 步骤1: 选题讨论 ⭐
  topicDiscussion?: {
    input: string;
    analysis: string;
    completedAt?: string;
  };
  // 步骤2: 信息搜索
  search?: {
    content: string;
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
    templateId?: string;
    templateName?: string;
    sourceUrl?: string;
    analysis?: any;
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

interface UseWorkflowStateReturn {
  currentStep: number;
  completedSteps: number[];
  workflowData: WorkflowData;
  loading: boolean;

  // 更新当前步骤
  setCurrentStep: (step: number) => void;

  // 标记步骤完成
  markStepCompleted: (step: number, stepData?: Partial<WorkflowData>) => Promise<void>;

  // 更新工作流数据（不改变步骤）
  updateWorkflowData: (data: Partial<WorkflowData>) => Promise<void>;

  // 手动保存
  saveWorkflow: () => Promise<void>;

  // 从服务器恢复状态
  restoreFromServer: () => Promise<void>;
}

export function useWorkflowState(articleId: string): UseWorkflowStateReturn {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [workflowData, setWorkflowData] = useState<WorkflowData>({});
  const [loading, setLoading] = useState(false);
  const [lastSavedData, setLastSavedData] = useState<string>('');

  // 从服务器恢复状态
  const restoreFromServer = useCallback(async () => {
    try {
      const res = await api.get(`/articles/${articleId}`);
      const article = res.data;

      if (article.workflowStep !== undefined) {
        setCurrentStep(article.workflowStep);
      }

      if (article.workflowData) {
        setWorkflowData(article.workflowData);
        setLastSavedData(JSON.stringify(article.workflowData));

        // 根据 workflowData 计算已完成的步骤
        const completed: number[] = [];
        if (article.workflowData.understanding?.completedAt) completed.push(0);
        if (article.workflowData.topicDiscussion?.completedAt) completed.push(1);
        if (article.workflowData.search?.completedAt) completed.push(2);
        if (article.workflowData.collaboration?.completedAt) completed.push(3);
        if (article.workflowData.style?.completedAt) completed.push(4);
        if (article.workflowData.materials?.completedAt) completed.push(5);
        if (article.workflowData.waiting?.completedAt) completed.push(6);
        if (article.workflowData.draft?.completedAt) completed.push(7);
        if (article.workflowData.review?.completedAt) completed.push(8);

        setCompletedSteps(completed);
      }
    } catch (error: any) {
      console.error('恢复工作流状态失败:', error);
    }
  }, [articleId]);

  // 组件挂载时恢复状态
  useEffect(() => {
    restoreFromServer();
  }, [restoreFromServer]);

  // 保存到服务器
  const saveToServer = useCallback(async (step: number, data: WorkflowData) => {
    try {
      setLoading(true);
      await api.put(`/articles/${articleId}/workflow`, {
        step,
        stepData: data,
      });
      setLastSavedData(JSON.stringify(data));
    } catch (error: any) {
      message.error('保存工作流失败');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  // 标记步骤完成
  const markStepCompleted = useCallback(async (step: number, stepData?: Partial<WorkflowData>) => {
    // 更新本地状态
    if (!completedSteps.includes(step)) {
      setCompletedSteps(prev => [...prev, step]);
    }

    // 合并步骤数据，添加完成时间
    const newData = { ...workflowData };
    if (stepData) {
      Object.keys(stepData).forEach(key => {
        const value = stepData[key as keyof WorkflowData];
        if (value && typeof value === 'object') {
          newData[key as keyof WorkflowData] = {
            ...value,
            completedAt: new Date().toISOString(),
          } as any;
        }
      });
    }

    setWorkflowData(newData);

    // 保存到服务器
    await saveToServer(step, newData);
    message.success('进度已自动保存');
  }, [completedSteps, workflowData, saveToServer]);

  // 更新工作流数据（不改变步骤）
  const updateWorkflowData = useCallback(async (data: Partial<WorkflowData>) => {
    const newData = { ...workflowData, ...data };
    setWorkflowData(newData);

    // 自动保存
    await saveToServer(currentStep, newData);
  }, [workflowData, currentStep, saveToServer]);

  // 手动保存
  const saveWorkflow = useCallback(async () => {
    const currentData = JSON.stringify(workflowData);
    if (currentData === lastSavedData) {
      message.info('没有需要保存的更改');
      return;
    }

    await saveToServer(currentStep, workflowData);
    message.success('保存成功');
  }, [currentStep, workflowData, lastSavedData, saveToServer]);

  return {
    currentStep,
    completedSteps,
    workflowData,
    loading,
    setCurrentStep,
    markStepCompleted,
    updateWorkflowData,
    saveWorkflow,
    restoreFromServer,
  };
}
