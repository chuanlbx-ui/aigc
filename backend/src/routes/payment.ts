/**
 * 支付 API 路由
 */

import { Router } from 'express';
import {
  createPaymentOrder,
  getOrderStatus,
  handlePaymentNotify,
  getOrderList,
  mockPaymentSuccess,
  verifyWxPaySignature,
  decryptWxPayResource,
} from '../services/payment.js';

const router = Router();

// 创建支付订单
router.post('/create-order', async (req, res) => {
  try {
    const { tenantId, planName, amount, description } = req.body;

    if (!tenantId || !planName || !amount) {
      return res.status(400).json({ error: '参数不完整' });
    }

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
router.get('/order/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const order = await getOrderStatus(id);
    res.json(order);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// 获取订单列表
router.get('/orders/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { page, pageSize } = req.query;

    const result = await getOrderList(
      tenantId,
      page ? parseInt(page as string) : 1,
      pageSize ? parseInt(pageSize as string) : 10
    );

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 微信支付回调
router.post('/notify', async (req, res) => {
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
  router.post('/mock-pay/:orderId', async (req, res) => {
    try {
      const { orderId } = req.params;
      const result = await mockPaymentSuccess(orderId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
}

export default router;
