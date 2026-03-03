import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: 'test-tenant' },
    update: {},
    create: {
      id: 'test-tenant',
      name: '测试租户',
      slug: 'test-tenant',
      plan: 'free'
    }
  });
  console.log('租户创建成功:', JSON.stringify(tenant));
}

main().finally(() => prisma.$disconnect());
