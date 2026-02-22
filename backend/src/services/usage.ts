/**
 * 用量统计服务
 */

import { PrismaClient } from '@prisma/client';
import { sendEmail } from './email.js';

const prisma = new PrismaClient();

// 告警阈值
const ALERT_THRESHOLD = 0.8; // 80%
const BLOCK_THRESHOLD = 1.0; // 100%

// 用量类型显示名称
const USAGE_TYPE_NAMES: Record<string, string> = {
  article: '文章数',
  video_minutes: '视频时长',
  ai_call: 'AI调用次数',
  storage_mb: '存储空间',
};

// 用量类型
export type UsageType = 'article' | 'video_minutes' | 'ai_call' | 'storage_mb';

// 记录用量
export async function recordUsage(
  tenantId: string,
  type: UsageType,
  amount: number
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.usageRecord.create({
    data: {
      tenantId,
      type,
      amount,
      date: today,
    },
  });
}

// 获取当月用量
export async function getMonthlyUsage(tenantId: string) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const records = await prisma.usageRecord.findMany({
    where: {
      tenantId,
      date: { gte: startOfMonth },
    },
  });

  const usage: Record<string, number> = {
    article: 0,
    video_minutes: 0,
    ai_call: 0,
    storage_mb: 0,
  };

  for (const record of records) {
    usage[record.type] = (usage[record.type] || 0) + record.amount;
  }

  return usage;
}

// 获取套餐限制
export async function getPlanLimits(planName: string) {
  const plan = await prisma.plan.findUnique({
    where: { name: planName },
  });

  if (!plan) {
    return {
      articleLimit: 10,
      videoMinutes: 5,
      aiCallLimit: 100,
      storageGb: 1,
    };
  }

  return {
    articleLimit: plan.articleLimit,
    videoMinutes: plan.videoMinutes,
    aiCallLimit: plan.aiCallLimit,
    storageGb: plan.storageGb,
  };
}

// 检查是否超出限制
export async function checkUsageLimit(
  tenantId: string,
  planName: string,
  type: UsageType
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const usage = await getMonthlyUsage(tenantId);
  const limits = await getPlanLimits(planName);

  const limitMap: Record<UsageType, number> = {
    article: limits.articleLimit,
    video_minutes: limits.videoMinutes,
    ai_call: limits.aiCallLimit,
    storage_mb: limits.storageGb * 1024,
  };

  const current = usage[type] || 0;
  const limit = limitMap[type];

  return {
    allowed: limit === -1 || current < limit,
    current,
    limit,
  };
}

// 检查用量并发送告警
export async function checkAndAlertUsage(
  tenantId: string,
  type: UsageType
): Promise<{ allowed: boolean; alertSent: boolean }> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { users: { where: { role: 'admin' }, take: 1 } },
  });

  if (!tenant) {
    return { allowed: false, alertSent: false };
  }

  const result = await checkUsageLimit(tenantId, tenant.plan, type);

  if (result.limit === -1) {
    return { allowed: true, alertSent: false };
  }

  const usageRatio = result.current / result.limit;
  let alertSent = false;

  // 达到 80% 发送告警
  if (usageRatio >= ALERT_THRESHOLD && usageRatio < BLOCK_THRESHOLD) {
    const adminEmail = tenant.users[0]?.email;
    if (adminEmail) {
      await sendUsageAlertEmail(adminEmail, tenant.name, type, result.current, result.limit);
      alertSent = true;
    }
  }

  // 达到 100% 阻止操作
  const allowed = usageRatio < BLOCK_THRESHOLD;

  return { allowed, alertSent };
}

// 发送用量告警邮件
async function sendUsageAlertEmail(
  email: string,
  tenantName: string,
  type: UsageType,
  current: number,
  limit: number
): Promise<void> {
  const typeName = USAGE_TYPE_NAMES[type] || type;
  const percent = Math.round((current / limit) * 100);

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #fa8c16;">⚠️ 用量告警</h2>
      <p>您好，</p>
      <p>您的租户 <strong>${tenantName}</strong> 的 <strong>${typeName}</strong> 用量已达到 <strong>${percent}%</strong>。</p>
      <div style="background: #fff7e6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0;">当前用量: <strong>${current}</strong> / ${limit}</p>
      </div>
      <p>为避免服务中断，建议您：</p>
      <ul>
        <li>升级到更高级别的套餐</li>
        <li>清理不需要的资源</li>
      </ul>
      <p style="color: #8c8c8c; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: `[用量告警] ${typeName}已达到${percent}%`,
    html,
  });
}

// 获取所有用量状态
export async function getAllUsageStatus(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return null;
  }

  const usage = await getMonthlyUsage(tenantId);
  const limits = await getPlanLimits(tenant.plan);

  const types: UsageType[] = ['article', 'video_minutes', 'ai_call', 'storage_mb'];

  return types.map(type => {
    const limitMap: Record<UsageType, number> = {
      article: limits.articleLimit,
      video_minutes: limits.videoMinutes,
      ai_call: limits.aiCallLimit,
      storage_mb: limits.storageGb * 1024,
    };

    const current = usage[type] || 0;
    const limit = limitMap[type];
    const ratio = limit === -1 ? 0 : current / limit;

    return {
      type,
      name: USAGE_TYPE_NAMES[type],
      current,
      limit,
      ratio,
      status: ratio >= 1 ? 'exceeded' : ratio >= 0.8 ? 'warning' : 'normal',
    };
  });
}
