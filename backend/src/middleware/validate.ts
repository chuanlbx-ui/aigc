/**
 * 通用请求参数验证中间件
 * 基于 zod schema 验证 req.body / req.query / req.params
 *
 * ⚠️ 需要安装 zod: npm install zod
 */
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

interface ValidateOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * 创建验证中间件
 * @example
 * router.post('/articles', validate({ body: createArticleSchema }), handler)
 */
export function validate(schemas: ValidateOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: Array<{ location: string; field: string; message: string }> = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            location: 'body',
            field: issue.path.join('.'),
            message: issue.message,
          });
        }
      } else {
        req.body = result.data;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            location: 'query',
            field: issue.path.join('.'),
            message: issue.message,
          });
        }
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            location: 'params',
            field: issue.path.join('.'),
            message: issue.message,
          });
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: '参数验证失败',
        details: errors,
      });
    }

    next();
  };
}

/**
 * 格式化 Zod 错误为友好消息
 */
export function formatZodError(error: ZodError): string {
  return error.issues
    .map(issue => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
}
