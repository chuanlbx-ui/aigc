/**
 * SQLite 到 PostgreSQL 完整数据迁移脚本
 */
const Database = require('better-sqlite3');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const SQLITE_PATH = path.join(__dirname, '../prisma/dev.db');
const prisma = new PrismaClient();
const sqlite = new Database(SQLITE_PATH, { readonly: true });

// 日期字段列表
const DATE_FIELDS = [
  'createdAt', 'updatedAt', 'lastLoginAt', 'expiresAt', 'startedAt',
  'completedAt', 'publishedAt', 'paidAt', 'refundedAt', 'fetchedAt',
  'tokenExpireAt', 'scheduledAt', 'queuedAt', 'sentAt', 'nextRetryAt',
  'lastUsedAt', 'lastPingAt', 'startDate', 'endDate', 'date', 'evaluatedAt'
];

// 布尔字段列表
const BOOL_FIELDS = [
  'isActive', 'isEnabled', 'isSystem', 'isDefault', 'isPinned',
  'showTitle', 'extensionRequired', 'apiAvailable', 'isInstalled', 'isLandscape', 'isMobile', 'hasTouch'
];

// 转换行数据
function convertRow(row) {
  const newRow = { ...row };
  for (const [key, value] of Object.entries(newRow)) {
    // 转换日期（毫秒时间戳）
    if (DATE_FIELDS.includes(key) && typeof value === 'number') {
      newRow[key] = new Date(value);
    }
    // 转换布尔值
    if (BOOL_FIELDS.includes(key) && (value === 0 || value === 1)) {
      newRow[key] = value === 1;
    }
  }
  return newRow;
}

// 迁移单个表
async function migrateTable(tableName, prismaModel) {
  try {
    const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
    if (rows.length === 0) {
      console.log(`  - ${tableName}: 无数据`);
      return 0;
    }

    const converted = rows.map(convertRow);
    await prisma[prismaModel].deleteMany({});
    const result = await prisma[prismaModel].createMany({
      data: converted,
      skipDuplicates: true,
    });
    console.log(`  ✓ ${tableName}: ${result.count}/${rows.length}`);
    return result.count;
  } catch (e) {
    console.log(`  ✗ ${tableName}: ${e.message.substring(0, 80)}`);
    return -1;
  }
}

async function migrate() {
  console.log('=== SQLite → PostgreSQL 迁移 ===\n');

  // 按依赖顺序迁移
  const tables = [
    ['Tenant', 'tenant'],
    ['Plan', 'plan'],
    ['AssetCategory', 'assetCategory'],
    ['KnowledgeCategory', 'knowledgeCategory'],
    ['ArticleCategory', 'articleCategory'],
    ['AIServiceConfig', 'aIServiceConfig'],
    ['ImageServiceConfig', 'imageServiceConfig'],
    ['MediaServiceConfig', 'mediaServiceConfig'],
    ['PopupTemplate', 'popupTemplate'],
    ['User', 'user'],
    ['Session', 'session'],
    ['Project', 'project'],
    ['Asset', 'asset'],
    ['KnowledgeDoc', 'knowledgeDoc'],
    ['KnowledgeVersion', 'knowledgeVersion'],
    ['Template', 'template'],
    ['WorkflowTemplate', 'workflowTemplate'],
    ['HotTopic', 'hotTopic'],
    ['Article', 'article'],
    ['ArticleVersion', 'articleVersion'],
    ['Poster', 'poster'],
    ['RenderTask', 'renderTask'],
    ['WorkflowStep', 'workflowStep'],
    ['ArticleScore', 'articleScore'],
    ['ArticleKnowledgeRef', 'articleKnowledgeRef'],
    ['UsageRecord', 'usageRecord'],
    ['Subscription', 'subscription'],
    ['PaymentOrder', 'paymentOrder'],
    ['PublishPlatform', 'publishPlatform'],
    ['PublishRecord', 'publishRecord'],
    ['PublishBatch', 'publishBatch'],
    ['AICallLog', 'aICallLog'],
    ['AIUsageDaily', 'aIUsageDaily'],
    ['ExtensionStatus', 'extensionStatus'],
    ['ExtensionTask', 'extensionTask'],
    ['TemplateVersion', 'templateVersion'],
    ['TemplateShare', 'templateShare'],
    ['TemplateBundle', 'templateBundle'],
    ['TemplateBundleItem', 'templateBundleItem'],
    ['MarketplaceTemplate', 'marketplaceTemplate'],
    ['MarketplaceReview', 'marketplaceReview'],
    ['TopicPage', 'topicPage'],
    ['TopicPageSection', 'topicPageSection'],
    ['ApiToken', 'apiToken'],
  ];

  for (const [sqlTable, prismaModel] of tables) {
    await migrateTable(sqlTable, prismaModel);
  }

  console.log('\n=== 统计 ===');
  console.log('User:', await prisma.user.count());
  console.log('Project:', await prisma.project.count());
  console.log('Article:', await prisma.article.count());
  console.log('Asset:', await prisma.asset.count());
  console.log('KnowledgeDoc:', await prisma.knowledgeDoc.count());

  sqlite.close();
  await prisma.$disconnect();
}

migrate().catch(console.error);
