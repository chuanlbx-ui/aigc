/**
 * Prisma 数据导出脚本
 * 用于在不使用 pg_dump 的情况下导出数据库数据
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// 表导出顺序（考虑外键依赖）
const exportOrder = [
  // 系统配置
  'aIServiceConfig',
  'imageServiceConfig',
  'mediaServiceConfig',
  'plan',
  
  // 用户和租户
  'tenant',
  'user',
  'session',
  
  // 资源
  'assetCategory',
  'asset',
  
  // 知识库
  'knowledgeCategory',
  'knowledgeDoc',
  'knowledgeVersion',
  
  // 文章
  'articleCategory',
  'hotTopic',
  'workflowTemplate',
  'article',
  'articleVersion',
  'articleScore',
  'articleKnowledgeRef',
  'workflowStep',
  
  // 项目和任务
  'project',
  'renderTask',
  
  // 模板
  'popupTemplate',
  'template',
  'templateVersion',
  'templateShare',
  'templateBundle',
  'templateBundleItem',
  'marketplaceTemplate',
  
  // 发布
  'publishPlatform',
  'publishRecord',
  'publishBatch',
  
  // 扩展
  'extensionStatus',
  'extensionTask',
  
  // 统计
  'contentMetrics',
  'aICallLog',
  'aIUsageDaily',
  
  // 其他
  'subscription',
  'paymentOrder',
  'usageRecord',
  'poster',
  'apiToken',
];

// 需要跳过的表（由 Prisma 管理或自动生成的）
const skipTables = [
  '_prisma_migrations',
];

async function getTableNames(): Promise<string[]> {
  const result = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE 'pg_%' 
    AND tablename NOT LIKE '_prisma_%'
  `;
  return result.map(r => r.tablename);
}

async function exportTable(tableName: string): Promise<string[]> {
  console.log(`  📦 导出表: ${tableName}`);
  
  try {
    // 获取表数据 - 对于包含 vector 类型的表，需要特殊处理
    let data: any[];
    if (tableName === 'Article') {
      data = await prisma.$queryRawUnsafe(`SELECT id, title, slug, summary, "filePath", "coverImage", "tenantId", "userId", status, "publishedAt", platform, "column", "workflowStep", "workflowData", "templateId", "categoryId", tags, "knowledgeRefs", "hkrScore", "aiReviewStatus", "layoutTheme", "wordCount", "readTime", "viewCount", version, "hotTopicId", "createdAt", "updatedAt" FROM "${tableName}"`);
    } else if (tableName === 'KnowledgeDoc') {
      data = await prisma.$queryRawUnsafe(`SELECT id, title, slug, summary, "filePath", source, "sourceUrl", "categoryId", "tenantId", "userId", tags, version, "wordCount", "readTime", "isPinned", "embeddedAt", "createdAt", "updatedAt" FROM "${tableName}"`);
    } else {
      data = await prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}"`);
    }
    
    if (!Array.isArray(data) || data.length === 0) {
      console.log(`     ⏭️  跳过空表`);
      return [];
    }
    
    console.log(`     ✅ ${data.length} 条记录`);
    
    // 生成 INSERT 语句
    const inserts: string[] = [];
    
    for (const row of data) {
      const columns = Object.keys(row).map(k => `"${k}"`).join(', ');
      const values = Object.values(row).map(v => {
        if (v === null) return 'NULL';
        if (typeof v === 'boolean') return v ? 'true' : 'false';
        if (typeof v === 'number') return v.toString();
        if (v instanceof Date) return `'${v.toISOString()}'`;
        // 处理字符串，转义单引号
        return `'${String(v).replace(/'/g, "''")}'`;
      }).join(', ');
      
      inserts.push(`INSERT INTO "${tableName}" (${columns}) VALUES (${values});`);
    }
    
    return inserts;
  } catch (error) {
    console.log(`     ⚠️  导出失败: ${error}`);
    return [];
  }
}

async function main() {
  const outputFile = process.argv[2] || 'data_export.sql';
  console.log('========================================');
  console.log('  Prisma 数据导出工具');
  console.log('========================================');
  console.log(`输出文件: ${outputFile}`);
  console.log('');
  
  // 获取所有表
  const tables = await getTableNames();
  console.log(`发现 ${tables.length} 个表`);
  console.log('');
  
  // 按顺序导出
  const allInserts: string[] = [];
  
  // 添加文件头
  allInserts.push('-- ===========================================');
  allInserts.push(`-- 数据库数据导出`);
  allInserts.push(`-- 生成时间: ${new Date().toISOString()}`);
  allInserts.push(`-- 导出工具: Prisma`);
  allInserts.push('-- ===========================================');
  allInserts.push('');
  allInserts.push('BEGIN;');
  allInserts.push('');
  
  // 禁用外键检查（PostgreSQL 方式）
  allInserts.push('-- 禁用触发器以加快导入');
  allInserts.push('SET session_replication_role = replica;');
  allInserts.push('');
  
  // 先清空所有表（按依赖逆序）
  const reversedTables = [...tables].reverse();
  allInserts.push('-- 清空现有数据');
  for (const table of reversedTables) {
    if (!skipTables.includes(table)) {
      allInserts.push(`TRUNCATE TABLE "${table}" CASCADE;`);
    }
  }
  allInserts.push('');
  
  // 导出数据
  allInserts.push('-- 插入数据');
  for (const table of tables) {
    if (skipTables.includes(table)) continue;
    
    const inserts = await exportTable(table);
    if (inserts.length > 0) {
      allInserts.push(`-- Table: ${table}`);
      allInserts.push(...inserts);
      allInserts.push('');
    }
  }
  
  // 恢复外键检查
  allInserts.push('-- 恢复触发器');
  allInserts.push('SET session_replication_role = DEFAULT;');
  allInserts.push('');
  allInserts.push('COMMIT;');
  
  // 写入文件
  fs.writeFileSync(outputFile, allInserts.join('\n'), 'utf-8');
  
  // 统计
  const fileSize = fs.statSync(outputFile).size;
  const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
  
  console.log('');
  console.log('========================================');
  console.log('  ✅ 导出完成!');
  console.log('========================================');
  console.log(`文件: ${outputFile}`);
  console.log(`大小: ${fileSizeMB} MB`);
  console.log(`SQL 语句数: ${allInserts.length}`);
  
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
