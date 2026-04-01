import { z } from 'zod';

export const createArticleSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过 200 字'),
  platform: z.string().optional(),
  column: z.string().optional(),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'review', 'published']).optional().default('draft'),
}).passthrough();

export const updateArticleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  platform: z.string().optional(),
  column: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'review', 'published']).optional(),
  coverImage: z.string().optional(),
  excerpt: z.string().max(500).optional(),
}).passthrough();

export const updateContentSchema = z.object({
  content: z.string().min(1, '内容不能为空'),
}).passthrough();

export const topicDiscussionSchema = z.object({
  topic: z.string().min(1, '选题不能为空'),
  platform: z.string().min(1, '请选择平台'),
  column: z.string().min(1, '请选择栏目'),
  context: z.string().optional(),
  serviceId: z.string().optional(),
  templateId: z.string().optional(),
}).passthrough();

export const outlineSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  platform: z.string().min(1),
  column: z.string().min(1),
  angle: z.string().optional(),
  materials: z.string().optional(),
  serviceId: z.string().optional(),
  templateId: z.string().optional(),
}).passthrough();

export const draftSchema = z.object({
  title: z.string().min(1),
  platform: z.string().min(1),
  column: z.string().min(1),
  outline: z.string().min(1, '大纲不能为空'),
  materials: z.string().optional(),
  serviceId: z.string().optional(),
  articleId: z.string().optional(),
  templateId: z.string().optional(),
  workflowContext: z.any().optional(),
}).passthrough();

export const reviewSchema = z.object({
  content: z.string().min(1, '内容不能为空'),
  serviceId: z.string().optional(),
  templateId: z.string().optional(),
}).passthrough();

export const hkrEvaluateSchema = z.object({
  content: z.string().min(1, '内容不能为空'),
  serviceId: z.string().optional(),
  templateId: z.string().optional(),
}).passthrough();

export const qualityCheckSchema = z.object({
  content: z.string().min(1),
  platform: z.string().min(1),
  column: z.string().min(1),
  articleId: z.string().optional(),
  workflowData: z.any().optional(),
  hkrScore: z.any().optional(),
}).passthrough();

export const imagePositionSchema = z.object({
  content: z.string().min(1),
  platform: z.string().min(1),
  column: z.string().min(1),
  maxImages: z.number().int().min(1).max(20).optional().default(5),
  serviceId: z.string().optional(),
}).passthrough();

export const scriptSchema = z.object({
  content: z.string().min(1),
  platform: z.string().min(1),
  title: z.string().min(1),
  length: z.enum(['short', 'medium', 'long']).optional(),
  style: z.enum(['professional', 'casual', 'storytelling', 'tutorial']).optional(),
  tone: z.enum(['enthusiastic', 'calm', 'humorous', 'sincere']).optional(),
  serviceId: z.string().optional(),
}).passthrough();

export const adaptSchema = z.object({
  content: z.string().min(1),
  title: z.string().min(1),
  sourcePlatform: z.string().min(1),
  targetPlatform: z.string().min(1),
  targetColumn: z.string().optional(),
  adaptType: z.enum(['full', 'summary', 'expand']).optional(),
  serviceId: z.string().optional(),
}).passthrough();

export const publishSchema = z.object({
  platforms: z.array(z.string()).optional(),
}).passthrough();

export const workflowUpdateSchema = z.object({
  step: z.number().int().min(0).max(8),
  data: z.any(),
}).passthrough();

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).optional().default('1'),
  limit: z.string().regex(/^\d+$/).optional().default('20'),
  search: z.string().optional(),
  status: z.string().optional(),
  platform: z.string().optional(),
  column: z.string().optional(),
  categoryId: z.string().optional(),
  sort: z.string().optional(),
}).passthrough();
