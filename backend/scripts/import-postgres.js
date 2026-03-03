/**
 * PostgreSQL 数据导入脚本
 * 将导出的 JSON 数据导入到远程 PostgreSQL
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();
const INPUT_DIR = path.join(__dirname, '../data-export');

// 导入顺序（按外键依赖）
const TABLES = [
  'tenant',
  'user',
  'assetCategory',
  'knowledgeCategory',
  'articleCategory',
  'plan',
  'project',
  'renderTask',
  'asset',
  'knowledgeDoc',
  'knowledgeVersion',
  'article',
  'articleVersion',
  'workflowStep',
  'articleScore',
  'articleKnowledgeRef',
  'popupTemplate',
  'template',
  'aIServiceConfig',
  'aICallLog',
  'aIUsageDaily',
  'session',
  'usageRecord',
  'subscription',
  'paymentOrder',
  'publishPlatform',
  'publishRecord',
  'publishBatch',
];

async function importData() {
  console.log('=== PostgreSQL 数据导入 ===');
  console.log('目标数据库:', process.env.DATABASE_URL?.substring(0, 50) + '...\n');

  for (const table of TABLES) {
    const filePath = path.join(INPUT_DIR, `${table}.json`);

    if (!fs.existsSync(filePath)) {
      console.log(`- ${table}: 无数据文件`);
      continue;
    }

    let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (data.length === 0) {
      console.log(`- ${table}: 空数据`);
      continue;
    }

    // 清除无效的外键引用（userId, tenantId 等）
    data = data.map(item => {
      const cleaned = { ...item };
      if (cleaned.userId) cleaned.userId = null;
      if (cleaned.tenantId) cleaned.tenantId = null;
      return cleaned;
    });

    try {
      // 使用 createMany 批量插入
      const result = await prisma[table].createMany({
        data,
        skipDuplicates: true,
      });
      console.log(`✓ ${table}: 导入 ${result.count}/${data.length} 条`);
    } catch (e) {
      console.log(`✗ ${table}: 失败 - ${e.message.split('\n')[0]}`);
    }
  }

  console.log('\n导入完成！');
  await prisma.$disconnect();
}

importData().catch(console.error);
