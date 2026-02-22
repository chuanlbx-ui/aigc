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
    // TODO: 验证微信签名
    const { resource } = req.body;

    if (!resource) {
      return res.status(400).json({ code: 'FAIL', message: '参数错误' });
    }

    // TODO: 解密回调数据
    const result = await handlePaymentNotify({
      orderId: resource.out_trade_no,
      transactionId: resource.transaction_id,
      tradeState: resource.trade_state,
    });

    if (result.success) {
      res.json({ code: 'SUCCESS', message: '成功' });
    } else {
      res.status(500).json({ code: 'FAIL', message: result.message });
    }
  } catch (error: any) {
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
