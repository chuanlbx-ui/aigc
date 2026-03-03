import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_USERNAME = 'chuanlbx';

async function main() {
  // 查找目标用户
  const targetUser = await prisma.user.findFirst({
    where: { name: TARGET_USERNAME }
  });

  if (!targetUser) {
    console.error(`用户 ${TARGET_USERNAME} 不存在`);
    process.exit(1);
  }

  console.log(`目标用户: ${targetUser.name} (ID: ${targetUser.id})`);

  // 迁移 Project 数据
  const projectResult = await prisma.project.updateMany({
    where: { userId: null },
    data: { userId: targetUser.id }
  });
  console.log(`已迁移 ${projectResult.count} 个项目`);

  // 迁移 Asset 数据
  const assetResult = await prisma.asset.updateMany({
    where: { userId: null },
    data: { userId: targetUser.id }
  });
  console.log(`已迁移 ${assetResult.count} 个资源`);

  // 迁移 KnowledgeDoc 数据
  const knowledgeResult = await prisma.knowledgeDoc.updateMany({
    where: { userId: null },
    data: { userId: targetUser.id }
  });
  console.log(`已迁移 ${knowledgeResult.count} 个知识文档`);

  // 迁移 Article 数据
  const articleResult = await prisma.article.updateMany({
    where: { userId: null },
    data: { userId: targetUser.id }
  });
  console.log(`已迁移 ${articleResult.count} 篇文章`);

  // 迁移 Template 数据
  const templateResult = await prisma.template.updateMany({
    where: { userId: null },
    data: { userId: targetUser.id }
  });
  console.log(`已迁移 ${templateResult.count} 个模板`);

  console.log('\n数据迁移完成！');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
