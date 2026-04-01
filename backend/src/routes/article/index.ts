import { Router } from 'express';
import { publicRouter } from './public.js';
import { crudRouter } from './crud.js';
import { workflowRouter } from './workflow.js';
import { publishRouter } from './publish.js';

export const articleRouter = Router();

// 公开访问路由（不需要认证，必须在其他路由之前）
articleRouter.use('/', publicRouter);

// CRUD 路由
articleRouter.use('/', crudRouter);

// 工作流路由
articleRouter.use('/', workflowRouter);

// 发布相关路由
articleRouter.use('/', publishRouter);
