/**
 * SQLite 数据导出脚本 - 直接使用当前 Prisma 配置
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();
const OUTPUT_DIR = path.join(__dirname, '../data-export');

async function exportData() {
  console.log('=== SQLite 数据导出 ===\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const summary = {};

  // 逐个表导出
  const tables = {
    project: () => prisma.project.findMany(),
    article: () => prisma.article.findMany(),
    articleCategory: () => prisma.articleCategory.findMany(),
    articleVersion: () => prisma.articleVersion.findMany(),
    asset: () => prisma.asset.findMany(),
    assetCategory: () => prisma.assetCategory.findMany(),
    knowledgeDoc: () => prisma.knowledgeDoc.findMany(),
    knowledgeCategory: () => prisma.knowledgeCategory.findMany(),
    knowledgeVersion: () => prisma.knowledgeVersion.findMany(),
    renderTask: () => prisma.renderTask.findMany(),
    popupTemplate: () => prisma.popupTemplate.findMany(),
    template: () => prisma.template.findMany(),
    aIServiceConfig: () => prisma.aIServiceConfig.findMany(),
  };

  for (const [name, query] of Object.entries(tables)) {
    try {
      const data = await query();
      fs.writeFileSync(path.join(OUTPUT_DIR, `${name}.json`), JSON.stringify(data, null, 2));
      summary[name] = data.length;
      console.log(`✓ ${name}: ${data.length} 条`);
    } catch (e) {
      console.log(`✗ ${name}: ${e.message.split('\n')[0]}`);
    }
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, '_summary.json'), JSON.stringify(summary, null, 2));
  console.log('\n导出完成！');
  await prisma.$disconnect();
}

exportData().catch(console.error);
