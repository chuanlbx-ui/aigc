/**
 * 排版主题迁移脚本
 * 将内置主题迁移到数据库作为系统模板
 *
 * 运行方式: npx tsx src/scripts/migrateLayoutThemes.ts
 */

import { PrismaClient } from '@prisma/client';
import { BUILTIN_LAYOUT_THEMES } from './builtinLayoutThemes.js';

const prisma = new PrismaClient();

async function migrateLayoutThemes() {
  console.log('========== 排版主题迁移 ==========\n');
  console.log(`准备迁移 ${BUILTIN_LAYOUT_THEMES.length} 个内置主题...\n`);

  let migrated = 0;
  let skipped = 0;

  for (const theme of BUILTIN_LAYOUT_THEMES) {
    try {
      // 检查是否已存在
      const existing = await prisma.template.findFirst({
        where: {
          id: theme.id,
          type: 'layout',
        },
      });

      if (existing) {
        console.log(`  跳过已存在: ${theme.name} (${theme.id})`);
        skipped++;
        continue;
      }

      // 创建新模板
      await prisma.template.create({
        data: {
          id: theme.id,
          type: 'layout',
          name: theme.name,
          description: theme.description,
          config: JSON.stringify(theme.config),
          isSystem: true,
          isEnabled: true,
          sortOrder: migrated,
        },
      });

      console.log(`  迁移成功: ${theme.name} -> layout/${theme.id}`);
      migrated++;
    } catch (error: any) {
      console.error(`  迁移失败: ${theme.name} - ${error.message}`);
    }
  }

  console.log(`\n迁移完成: 成功 ${migrated}, 跳过 ${skipped}`);

  // 统计
  const count = await prisma.template.count({ where: { type: 'layout' } });
  console.log(`Template 表中排版模板共有 ${count} 条记录`);
}

async function main() {
  try {
    await migrateLayoutThemes();
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
