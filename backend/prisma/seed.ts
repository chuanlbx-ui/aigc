/**
 * 数据库种子脚本 - 初始化套餐数据
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据...');

  // 创建套餐
  const plans = [
    {
      name: 'free',
      displayName: '免费版',
      price: 0,
      articleLimit: 10,
      videoMinutes: 5,
      aiCallLimit: 100,
      storageGb: 1,
    },
    {
      name: 'pro',
      displayName: '专业版',
      price: 99,
      articleLimit: 100,
      videoMinutes: 60,
      aiCallLimit: 1000,
      storageGb: 10,
    },
    {
      name: 'enterprise',
      displayName: '企业版',
      price: 299,
      articleLimit: -1,
      videoMinutes: -1,
      aiCallLimit: -1,
      storageGb: -1,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
    console.log(`套餐 ${plan.displayName} 已创建`);
  }

  console.log('数据初始化完成');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
