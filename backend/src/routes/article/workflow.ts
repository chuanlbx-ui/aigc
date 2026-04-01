import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { WORKFLOW_STEPS } from '../../services/article/workflow.js';
import { syncWorkflowSteps } from '../../services/article/workflowStorage.js';
import { websocketService } from '../../services/websocket.js';
import { PLATFORM_COLUMNS } from './shared.js';

const prisma = new PrismaClient();
export const workflowRouter = Router();

// 更新工作流状态
workflowRouter.put('/:id/workflow', async (req, res) => {
  try {
    const { step, data } = req.body;

    // 验证文章属于当前用户
    const existing = await prisma.article.findFirst({
      where: { id: req.params.id, userId: req.user!.id }
    });
    if (!existing) {
      return res.status(404).json({ error: '文章不存在' });
    }

    const article = await prisma.article.update({
      where: { id: req.params.id },
      data: {
        ...(step !== undefined && { workflowStep: step }),
        ...(data && { workflowData: JSON.stringify(data) }),
      },
    });

    if (data) {
      await syncWorkflowSteps(req.params.id, data, step);
    }

    websocketService.publishWorkflowProgress(req.params.id, {
      step: article.workflowStep,
    });

    res.json(article);
  } catch (error) {
    res.status(500).json({ error: '更新工作流失败' });
  }
});

// 获取平台栏目配置
workflowRouter.get('/config/platforms', async (req, res) => {
  res.json(PLATFORM_COLUMNS);
});

// 获取工作流步骤配置
workflowRouter.get('/config/workflow', async (req, res) => {
  res.json(WORKFLOW_STEPS);
});
