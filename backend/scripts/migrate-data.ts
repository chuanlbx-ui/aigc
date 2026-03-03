/**
 * 数据迁移脚本
 * 用于 SQLite -> PostgreSQL 迁移
 *
 * 使用方法:
 * npx ts-node scripts/migrate-data.ts --source sqlite --target postgres
 */

import { PrismaClient } from '@prisma/client';

// 源数据库连接（SQLite）
const sourceDb = new PrismaClient({
  datasources: {
    db: { url: process.env.SOURCE_DATABASE_URL || 'file:./dev.db' },
  },
});

// 目标数据库连接（PostgreSQL）
const targetDb = new PrismaClient({
  datasources: {
    db: { url: process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL },
  },
});

interface MigrationResult {
  table: string;
  count: number;
  success: boolean;
  error?: string;
}

const results: MigrationResult[] = [];

// 迁移单个表
async function migrateTable<T>(
  tableName: string,
  fetchSource: () => Promise<T[]>,
  insertTarget: (data: T[]) => Promise<void>
): Promise<void> {
  console.log(`\n[迁移] 开始迁移表: ${tableName}`);

  try {
    const data = await fetchSource();
    console.log(`  - 读取 ${data.length} 条记录`);

    if (data.length > 0) {
      await insertTarget(data);
      console.log(`  - 写入完成`);
    }

    results.push({ table: tableName, count: data.length, success: true });
  } catch (error: any) {
    console.error(`  - 错误: ${error.message}`);
    results.push({ table: tableName, count: 0, success: false, error: error.message });
  }
}

// 主迁移函数
async function migrate() {
  console.log('========================================');
  console.log('数据迁移工具 - SQLite -> PostgreSQL');
  console.log('========================================');

  // 1. 迁移租户
  await migrateTable(
    'Tenant',
    () => sourceDb.tenant.findMany(),
    async (data) => {
      for (const item of data) {
        await targetDb.tenant.upsert({
          where: { id: item.id },
          create: item,
          update: item,
        });
      }
    }
  );

  // 2. 迁移套餐
  await migrateTable(
    'Plan',
    () => sourceDb.plan.findMany(),
    async (data) => {
      for (const item of data) {
        await targetDb.plan.upsert({
          where: { id: item.id },
          create: item,
          update: item,
        });
      }
    }
  );

  // 3. 迁移用户
  await migrateTable(
    'User',
    () => sourceDb.user.findMany(),
    async (data) => {
      for (const item of data) {
        await targetDb.user.upsert({
          where: { id: item.id },
          create: item,
          update: item,
        });
      }
    }
  );

  // 4. 迁移项目
  await migrateTable(
    'Project',
    () => sourceDb.project.findMany(),
    async (data) => {
      for (const item of data) {
        await targetDb.project.upsert({
          where: { id: item.id },
          create: item,
          update: item,
        });
      }
    }
  );

  // 5. 迁移文章
  await migrateTable(
    'Article',
    () => sourceDb.article.findMany(),
    async (data) => {
      for (const item of data) {
        await targetDb.article.upsert({
          where: { id: item.id },
          create: item,
          update: item,
        });
      }
    }
  );

  // 打印结果报告
  printReport();
}

// 打印迁移报告
function printReport() {
  console.log('\n========================================');
  console.log('迁移结果报告');
  console.log('========================================');

  let successCount = 0;
  let failCount = 0;
  let totalRecords = 0;

  for (const r of results) {
    const status = r.success ? '✓' : '✗';
    console.log(`${status} ${r.table}: ${r.count} 条`);
    if (r.error) console.log(`  错误: ${r.error}`);

    if (r.success) {
      successCount++;
      totalRecords += r.count;
    } else {
      failCount++;
    }
  }

  console.log('----------------------------------------');
  console.log(`成功: ${successCount} 表, 失败: ${failCount} 表`);
  console.log(`总计迁移: ${totalRecords} 条记录`);
}

// 执行迁移
migrate()
  .then(() => {
    console.log('\n迁移完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n迁移失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await sourceDb.$disconnect();
    await targetDb.$disconnect();
  });
