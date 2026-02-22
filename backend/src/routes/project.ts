import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { renderQueue } from '../queue/render.js';
import { requireAuth } from '../middleware/auth.js';

const prisma = new PrismaClient();
export const projectRouter = Router();

// 所有项目路由都需要登录
projectRouter.use(requireAuth);

// 获取项目列表
projectRouter.get('/', async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(projects.map(p => ({
    ...p,
    config: JSON.parse(p.config),
  })));
});

// 获取单个项目
projectRouter.get('/:id', async (req, res) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!project) {
    return res.status(404).json({ error: '项目不存在' });
  }
  res.json({ ...project, config: JSON.parse(project.config) });
});

// 创建项目
projectRouter.post('/', async (req, res) => {
  const { name, config } = req.body;
  const project = await prisma.project.create({
    data: {
      name,
      config: JSON.stringify(config),
      userId: req.user!.id,
    },
  });
  res.json({ ...project, config: JSON.parse(project.config) });
});

// 更新项目
projectRouter.put('/:id', async (req, res) => {
  const { name, config } = req.body;

  // 先验证项目属于当前用户
  const existing = await prisma.project.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!existing) {
    return res.status(404).json({ error: '项目不存在' });
  }

  const updateData: { name?: string; config?: string } = {};
  if (name) updateData.name = name;
  if (config) updateData.config = JSON.stringify(config);

  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: updateData,
  });
  res.json({ ...project, config: JSON.parse(project.config) });
});

// 删除项目
projectRouter.delete('/:id', async (req, res) => {
  // 先验证项目属于当前用户
  const existing = await prisma.project.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!existing) {
    return res.status(404).json({ error: '项目不存在' });
  }

  await prisma.project.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// 提交渲染
projectRouter.post('/:id/render', async (req, res) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!project) {
    return res.status(404).json({ error: '项目不存在' });
  }

  const task = await prisma.renderTask.create({
    data: { projectId: project.id },
  });

  await prisma.project.update({
    where: { id: project.id },
    data: { status: 'rendering' },
  });

  renderQueue.add(task.id, project);
  res.json({ taskId: task.id });
});
