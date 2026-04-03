/**
 * 支付 API 路由
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  createPaymentOrder,
  getOrderStatus,
  handlePaymentNotify,
  getOrderList,
  mockPaymentSuccess,
  verifyWxPaySignature,
  decryptWxPayResource,
} from '../services/payment.js';

// ========== Zod 验证 Schema ==========

// 创建订单请求验证 Schema
const createOrderSchema = z.object({
  tenantId: z.string().min(1, '租户ID不能为空'),
  planName: z.string().min(1, '套餐名称不能为空'),
  amount: z.coerce.number().positive('金额必须为正数'),
  description: z.string().optional(),
});

// 订单 ID 参数验证 Schema
const orderIdSchema = z.object({
  id: z.string().min(1, '订单ID不能为空'),
});

// 租户 ID 参数验证 Schema
const tenantIdSchema = z.object({
  tenantId: z.string().min(1, '租户ID不能为空'),
});

// 订单列表查询参数验证 Schema
const orderListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

// 微信支付回调验证 Schema
const paymentNotifySchema = z.object({
  resource: z.object({
    ciphertext: z.string().min(1, '加密数据不能为空'),
    nonce: z.string().min(1, '随机字符串不能为空'),
    associated_data: z.string().optional(),
  }).optional(),
  out_trade_no: z.string().optional(),
  transaction_id: z.string().optional(),
  trade_state: z.string().optional(),
});

// 模拟支付订单 ID 参数验证 Schema
const mockPayOrderIdSchema = z.object({
  orderId: z.string().min(1, '订单ID不能为空'),
});

// ========== 验证中间件 ==========

// 扩展 Request 接口以包含验证后的数据
declare global {
  namespace Express {
    interface Request {
      validatedBody?: any;
      validatedParams?: any;
      validatedQuery?: any;
    }
  }
}

// 验证请求体的通用函数
function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(400).json({
        success: false,
        error: '请求参数验证失败',
        details: errors,
      });
    }
    req.validatedBody = result.data;
    next();
  };
}

// 验证路由参数的通用函数
function validateParams<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const errors = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(400).json({
        success: false,
        error: '路由参数验证失败',
        details: errors,
      });
    }
    req.validatedParams = result.data;
    next();
  };
}

// 验证查询参数的通用函数
function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(400).json({
        success: false,
        error: '查询参数验证失败',
        details: errors,
      });
    }
    req.validatedQuery = result.data;
    next();
  };
}

// ========== 路由处理函数 ==========

const router = Router();

// 创建支付订单
router.post('/create-order', validateBody(createOrderSchema), async (req, res) => {
  try {
    const { tenantId, planName, amount, description } = req.validatedBody;

    const result = await createPaymentOrder(
      tenantId,
      planName,
      amount,
      description || `升级到${planName}套餐`
    );

    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 查询订单状态
router.get('/order/:id', validateParams(orderIdSchema), async (req, res) => {
  try {
    const { id } = req.validatedParams;
    const order = await getOrderStatus(id);
    res.json(order);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// 获取订单列表
router.get('/orders/:tenantId', validateParams(tenantIdSchema), validateQuery(orderListQuerySchema), async (req, res) => {
  try {
    const { tenantId } = req.validatedParams;
    const { page = 1, pageSize = 10 } = req.validatedQuery || {};

    const result = await getOrderList(
      tenantId,
      page,
      pageSize
    );

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 微信支付回调
router.post('/notify', validateBody(paymentNotifySchema), async (req, res) => {
  try {
    // 微信支付 V3 回调签名验证
    // 微信支付会发送以下 HTTP 头: 
    // - Wechatpay-Timestamp: 时间戳
    // - Wechatpay-Nonce: 随机字符串
    // - Wechatpay-Signature: 签名
    const timestamp = req.headers['wechatpay-timestamp'] as string;
    const nonce = req.headers['wechatpay-nonce'] as string;
    const signature = req.headers['wechatpay-signature'] as string;

    // 构建请求体用于签名验证
    const body = JSON.stringify(req.body);

    // 验证签名
    if (timestamp && nonce && signature) {
      const verifyResult = verifyWxPaySignature(timestamp, nonce, body, signature);
      if (!verifyResult.valid) {
        console.error('微信支付签名验证失败:', verifyResult.error);
        return res.status(400).json({ code: 'FAIL', message: '签名验证失败' });
      }
    } else {
      // 开发环境或测试环境，允许无签名请求
      if (process.env.NODE_ENV === 'production') {
        return res.status(400).json({ code: 'FAIL', message: '缺少签名信息' });
      }
    }

    const { resource } = req.body;

    if (!resource) {
      return res.status(400).json({ code: 'FAIL', message: '参数错误' });
    }

    // 解密回调数据 (AES-256-GCM)
    const decrypted = decryptWxPayResource(
      resource.ciphertext,
      resource.nonce,
      resource.associated_data || ''
    );

    if (!decrypted.success) {
      console.error('微信支付数据解密失败:', decrypted.error);
      return res.status(400).json({ code: 'FAIL', message: '数据解密失败' });
    }

    const paymentData = decrypted.data;

    const result = await handlePaymentNotify({
      orderId: paymentData.out_trade_no,
      transactionId: paymentData.transaction_id,
      tradeState: paymentData.trade_state,
    });

    if (result.success) {
      res.json({ code: 'SUCCESS', message: '成功' });
    } else {
      res.status(500).json({ code: 'FAIL', message: result.message });
    }
  } catch (error: any) {
    console.error('微信支付回调处理异常:', error);
    res.status(500).json({ code: 'FAIL', message: error.message });
  }
});

// 模拟支付成功（仅开发环境）
if (process.env.NODE_ENV !== 'production') {
  router.post('/mock-pay/:orderId', validateParams(mockPayOrderIdSchema), async (req, res) => {
    try {
      const { orderId } = req.validatedParams;
      const result = await mockPaymentSuccess(orderId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
}

export default router;
