import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { renderQueue } from '../queue/render.js';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();
export const taskRouter = Router();

// 获取任务列表
taskRouter.get('/', async (_, res) => {
  const tasks = await prisma.renderTask.findMany({
    include: { project: { select: { name: true, outputPath: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(tasks.map(t => ({
    ...t,
    projectName: t.project.name,
    outputPath: t.project.outputPath,
  })));
});

// 获取单个任务
taskRouter.get('/:id', async (req, res) => {
  const task = await prisma.renderTask.findUnique({
    where: { id: req.params.id },
    include: { project: true },
  });
  if (!task) {
    return res.status(404).json({ error: '任务不存在' });
  }
  res.json(task);
});

// 取消任务
taskRouter.post('/:id/cancel', async (req, res) => {
  await prisma.renderTask.update({
    where: { id: req.params.id },
    data: { status: 'failed', error: '用户取消' },
  });
  res.json({ success: true });
});

// 重试任务
taskRouter.post('/:id/retry', async (req, res) => {
  const task = await prisma.renderTask.findUnique({
    where: { id: req.params.id },
    include: { project: true },
  });

  if (!task) {
    return res.status(404).json({ error: '任务不存在' });
  }

  await prisma.renderTask.update({
    where: { id: req.params.id },
    data: { status: 'queued', progress: 0, error: null },
  });

  await prisma.project.update({
    where: { id: task.projectId },
    data: { status: 'rendering' },
  });

  // 重新加入渲染队列
  renderQueue.add(task.id, task.project);

  res.json({ success: true });
});

// 获取视频文件（预览/下载）
taskRouter.get('/:id/video', async (req, res) => {
  const task = await prisma.renderTask.findUnique({
    where: { id: req.params.id },
    include: { project: true },
  });

  if (!task || task.status !== 'completed') {
    return res.status(404).json({ error: '视频不存在或未完成' });
  }

  const outputPath = task.project.outputPath;
  if (!outputPath || !fs.existsSync(outputPath)) {
    return res.status(404).json({ error: '视频文件不存在' });
  }

  // 下载模式
  if (req.query.download === 'true') {
    const filename = `${task.project.name || 'video'}.mp4`;
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  }

  res.sendFile(path.resolve(outputPath));
});
