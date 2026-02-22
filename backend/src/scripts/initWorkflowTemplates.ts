/**
 * 初始化工作流配置模板
 * 将预设模板导入数据库
 */

import { PrismaClient } from '@prisma/client';
import { WORKFLOW_PRESETS } from '../config/workflowPresets.js';

const prisma = new PrismaClient();

async function initTemplates() {
  console.log('开始初始化工作流模板...');

  try {
    // 检查是否已有模板
    const existingCount = await prisma.workflowTemplate.count();
    if (existingCount > 0) {
      console.log(`数据库中已有 ${existingCount} 个模板`);
      const answer = await new Promise<string>((resolve) => {
        process.stdin.once('data', (data) => {
          resolve(data.toString().trim().toLowerCase());
        });
        console.log('是否要清空并重新初始化？(y/n): ');
      });

      if (answer !== 'y') {
        console.log('取消初始化');
        return;
      }

      // 清空现有模板
      await prisma.workflowTemplate.deleteMany({});
      console.log('已清空现有模板');
    }

    // 导入预设模板
    let count = 0;
    for (const [key, preset] of Object.entries(WORKFLOW_PRESETS)) {
      await prisma.workflowTemplate.create({
        data: {
          name: preset.name,
          description: preset.description,
          platform: preset.platform,
          column: preset.column,
          config: JSON.stringify(preset.config),
          type: 'system',
          isSystem: true,
          isDefault: key === 'deep-analysis', // 深度分析模板设为默认
          isEnabled: true,
          usageCount: 0,
          version: 1,
        },
      });
      count++;
      console.log(`✓ 已创建模板: ${preset.name}`);
    }

    console.log(`\n成功初始化 ${count} 个工作流模板！`);
  } catch (error) {
    console.error('初始化失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

initTemplates();
