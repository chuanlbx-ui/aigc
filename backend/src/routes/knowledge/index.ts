import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { crudRouter } from './crud.js';
import { searchRouter } from './search.js';
import { syncRouter } from './sync.js';

export const knowledgeRouter = Router();

// 所有知识库路由都需要登录
knowledgeRouter.use(requireAuth);

knowledgeRouter.use('/', crudRouter);
knowledgeRouter.use('/', searchRouter);
knowledgeRouter.use('/', syncRouter);
