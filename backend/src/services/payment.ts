/**
 * 微信支付服务
 */

import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 微信支付配置
const WX_PAY_CONFIG = {
  appId: process.env.WX_PAY_APP_ID || '',
  mchId: process.env.WX_PAY_MCH_ID || '',
  apiKey: process.env.WX_PAY_API_KEY || '',
  notifyUrl: process.env.WX_PAY_NOTIFY_URL || '',
  apiV3Key: process.env.WX_PAY_API_V3_KEY || '',
};

// 订单状态
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';

// 生成随机字符串
function generateNonceStr(length = 32): string {
  return crypto.randomBytes(length / 2).toString('hex');
}

// 生成签名 (V3)
function generateSignature(message: string, privateKey: string): string {
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(message);
  return sign.sign(privateKey, 'base64');
}

// 验证签名
export function verifySignature(
  timestamp: string,
  nonce: string,
  body: string,
  signature: string,
  publicKey: string
): boolean {
  const message = `${timestamp}\n${nonce}\n${body}\n`;
  const verify = crypto.createVerify('RSA-SHA256');
  verify.update(message);
  return verify.verify(publicKey, signature, 'base64');
}

// 创建支付订单
export async function createPaymentOrder(
  tenantId: string,
  planName: string,
  amount: number,
  description: string
) {
  // 创建数据库订单
  const order = await prisma.paymentOrder.create({
    data: {
      tenantId,
      planName,
      amount,
      status: 'pending',
    },
  });

  // 如果没有配置微信支付，返回模拟数据
  if (!WX_PAY_CONFIG.appId || !WX_PAY_CONFIG.mchId) {
    return {
      orderId: order.id,
      codeUrl: `weixin://wxpay/bizpayurl?mock=true&order=${order.id}`,
      message: '微信支付未配置，使用模拟模式',
    };
  }

  // TODO: 调用微信支付 Native 下单 API
  return {
    orderId: order.id,
    codeUrl: '',
  };
}

// 查询订单状态
export async function getOrderStatus(orderId: string) {
  const order = await prisma.paymentOrder.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error('订单不存在');
  }

  return {
    id: order.id,
    status: order.status,
    planName: order.planName,
    amount: order.amount,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
  };
}

// 处理支付回调
export async function handlePaymentNotify(data: {
  orderId: string;
  transactionId: string;
  tradeState: string;
}) {
  const order = await prisma.paymentOrder.findUnique({
    where: { id: data.orderId },
  });

  if (!order) {
    throw new Error('订单不存在');
  }

  if (order.status !== 'pending') {
    return { success: true, message: '订单已处理' };
  }

  if (data.tradeState === 'SUCCESS') {
    // 更新订单状态
    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: 'paid',
        wxOrderId: data.transactionId,
        paidAt: new Date(),
      },
    });

    // 更新租户套餐
    await prisma.tenant.update({
      where: { id: order.tenantId },
      data: { plan: order.planName },
    });

    // 创建订阅记录
    const plan = await prisma.plan.findUnique({
      where: { name: order.planName },
    });

    if (plan) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      await prisma.subscription.create({
        data: {
          tenantId: order.tenantId,
          planName: plan.name,
          status: 'active',
          startDate,
          endDate,
        },
      });
    }

    return { success: true, message: '支付成功' };
  }

  // 支付失败
  await prisma.paymentOrder.update({
    where: { id: order.id },
    data: { status: 'failed' },
  });

  return { success: false, message: '支付失败' };
}

// 获取租户订单列表
export async function getOrderList(tenantId: string, page = 1, pageSize = 10) {
  const skip = (page - 1) * pageSize;

  const [orders, total] = await Promise.all([
    prisma.paymentOrder.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.paymentOrder.count({ where: { tenantId } }),
  ]);

  return {
    orders,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// 模拟支付成功（开发测试用）
export async function mockPaymentSuccess(orderId: string) {
  const order = await prisma.paymentOrder.findUnique({
    where: { id: orderId },
  });

  if (!order || order.status !== 'pending') {
    throw new Error('订单不存在或状态不正确');
  }

  return handlePaymentNotify({
    orderId: order.id,
    transactionId: `mock_${Date.now()}`,
    tradeState: 'SUCCESS',
  });
}
