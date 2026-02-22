/**
 * 数据迁移脚本
 * 将旧的 ImageServiceConfig 和 AIServiceConfig 数据迁移到新的 MediaServiceConfig 表
 *
 * 运行方式: npx ts-node src/scripts/migrate-media-services.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 图片服务 provider 到 serviceType 的映射
const IMAGE_PROVIDER_MAP: Record<string, { serviceType: string; provider: string }> = {
  unsplash: { serviceType: 'image_search', provider: 'unsplash' },
  pexels: { serviceType: 'image_search', provider: 'pexels' },
  pixabay: { serviceType: 'image_search', provider: 'pixabay' },
  dashscope: { serviceType: 'image_generate', provider: 'tongyi_wanxiang' },
};

// AI 服务 provider 映射
const AI_PROVIDER_MAP: Record<string, string> = {
  openai: 'openai',
  claude: 'claude',
  deepseek: 'deepseek',
  qwen: 'qwen',
  zhipu: 'zhipu',
  kimi: 'kimi',
};

async function migrateImageServices() {
  console.log('开始迁移图片服务配置...');

  const imageConfigs = await prisma.imageServiceConfig.findMany();
  console.log(`找到 ${imageConfigs.length} 条图片服务配置`);

  let migrated = 0;
  let skipped = 0;

  for (const config of imageConfigs) {
    const mapping = IMAGE_PROVIDER_MAP[config.provider];
    if (!mapping) {
      console.log(`  跳过未知 provider: ${config.provider}`);
      skipped++;
      continue;
    }

    // 检查是否已存在
    const existing = await prisma.mediaServiceConfig.findFirst({
      where: {
        provider: mapping.provider,
        serviceType: mapping.serviceType,
      },
    });

    if (existing) {
      console.log(`  跳过已存在: ${config.name} (${mapping.provider})`);
      skipped++;
      continue;
    }

    // 创建新配置
    await prisma.mediaServiceConfig.create({
      data: {
        name: config.name,
        provider: mapping.provider,
        serviceType: mapping.serviceType,
        apiKey: config.apiKey,
        isEnabled: config.isEnabled,
        priority: config.priority,
        config: '{}',
      },
    });

    console.log(`  迁移成功: ${config.name} -> ${mapping.serviceType}/${mapping.provider}`);
    migrated++;
  }

  console.log(`图片服务迁移完成: 成功 ${migrated}, 跳过 ${skipped}`);
}

async function migrateAIServices() {
  console.log('\n开始迁移 AI 服务配置...');

  const aiConfigs = await prisma.aIServiceConfig.findMany();
  console.log(`找到 ${aiConfigs.length} 条 AI 服务配置`);

  let migrated = 0;
  let skipped = 0;

  for (const config of aiConfigs) {
    const provider = AI_PROVIDER_MAP[config.provider] || config.provider;

    // 检查是否已存在
    const existing = await prisma.mediaServiceConfig.findFirst({
      where: {
        provider,
        serviceType: 'ai_chat',
        modelId: config.model || null,
      },
    });

    if (existing) {
      console.log(`  跳过已存在: ${config.name} (${provider}/${config.model})`);
      skipped++;
      continue;
    }

    // 创建新配置
    await prisma.mediaServiceConfig.create({
      data: {
        name: config.name,
        provider,
        serviceType: 'ai_chat',
        modelId: config.model || null,
        apiKey: config.apiKey,
        apiEndpoint: config.baseUrl || null,
        isEnabled: config.isEnabled,
        priority: config.isDefault ? 100 : 0,
        config: '{}',
      },
    });

    console.log(`  迁移成功: ${config.name} -> ai_chat/${provider}/${config.model}`);
    migrated++;
  }

  console.log(`AI 服务迁移完成: 成功 ${migrated}, 跳过 ${skipped}`);
}

async function main() {
  console.log('========== 媒体服务配置迁移 ==========\n');

  try {
    await migrateImageServices();
    await migrateAIServices();

    console.log('\n========== 迁移完成 ==========');

    // 统计新表数据
    const count = await prisma.mediaServiceConfig.count();
    console.log(`MediaServiceConfig 表当前共有 ${count} 条记录`);

  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
