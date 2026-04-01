/**
 * 知识库相关 API 参数验证 schema
 *
 * ⚠️ 需要安装 zod: npm install zod
 */
import { z } from 'zod';

// 创建文档
export const createDocSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200),
  content: z.string().optional().default(''),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  format: z.enum(['markdown', 'html', 'text']).optional().default('markdown'),
});

// 更新文档
export const updateDocSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  categoryId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

// 更新文档内容
export const updateDocContentSchema = z.object({
  content: z.string().min(1, '内容不能为空'),
});

// AI 生成
export const aiGenerateSchema = z.object({
  prompt: z.string().min(1, '提示词不能为空'),
  context: z.string().optional(),
  serviceId: z.string().optional(),
});

// AI 搜索
export const aiSearchSchema = z.object({
  query: z.string().min(1, '搜索词不能为空'),
  limit: z.number().int().min(1).max(50).optional().default(10),
  serviceId: z.string().optional(),
});

// 创建分类
export const createCategorySchema = z.object({
  name: z.string().min(1, '分类名不能为空').max(50),
  parentId: z.string().optional(),
});

// 批量操作
export const batchDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, '请选择至少一个文档'),
});

export const batchCategorySchema = z.object({
  ids: z.array(z.string()).min(1),
  categoryId: z.string().nullable(),
});

// 全文搜索
export const fulltextSearchSchema = z.object({
  q: z.string().min(1, '搜索词不能为空'),
  limit: z.string().regex(/^\d+$/).optional().default('20'),
  offset: z.string().regex(/^\d+$/).optional().default('0'),
  categoryId: z.string().optional(),
  tags: z.string().optional(),
});
