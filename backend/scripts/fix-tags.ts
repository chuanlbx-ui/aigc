import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTags() {
  console.log('开始修复标签数据...');

  const docs = await prisma.knowledgeDoc.findMany({
    select: { id: true, title: true, tags: true },
  });

  let fixed = 0;
  let skipped = 0;

  for (const doc of docs) {
    try {
      // 尝试解析标签
      let tags = doc.tags;

      // 检查是否是双重编码
      if (tags.startsWith('"') && tags.endsWith('"')) {
        // 第一次解析：去掉外层引号
        tags = JSON.parse(tags);
        console.log(`文档 "${doc.title}" 检测到双重编码`);
      }

      // 第二次解析：获取数组
      const tagArray = JSON.parse(tags);

      // 验证是否是数组
      if (!Array.isArray(tagArray)) {
        console.log(`文档 "${doc.title}" 标签不是数组，跳过`);
        skipped++;
        continue;
      }

      // 重新编码为正确的格式
      const correctTags = JSON.stringify(tagArray);

      // 只有当标签格式不正确时才更新
      if (correctTags !== doc.tags) {
        await prisma.knowledgeDoc.update({
          where: { id: doc.id },
          data: { tags: correctTags },
        });
        console.log(`✓ 修复文档 "${doc.title}" 的标签: ${correctTags}`);
        fixed++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`✗ 处理文档 "${doc.title}" 失败:`, error);
      skipped++;
    }
  }

  console.log(`\n修复完成！`);
  console.log(`- 修复: ${fixed} 个文档`);
  console.log(`- 跳过: ${skipped} 个文档`);
  console.log(`- 总计: ${docs.length} 个文档`);
}

fixTags()
  .then(() => {
    console.log('\n脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
