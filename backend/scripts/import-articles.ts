import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const ARTICLES_DIR = path.resolve(process.cwd(), 'articles');

function calculateReadingStats(content: string) {
  const text = content.replace(/[#*_\[\]()!]/g, '').trim();
  const wordCount = text.length > 0 ? text.split(/\s+/).filter(Boolean).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));
  return { wordCount, readTime };
}

function extractTitle(content: string, filename: string): string {
  // Try to find first # heading
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    return headingMatch[1].trim();
  }
  // Fallback to filename without extension
  return filename.replace('.md', '').substring(0, 50);
}

async function importArticles() {
  console.log('📁 Articles directory:', ARTICLES_DIR);
  
  const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.md'));
  console.log(`Found ${files.length} markdown files\n`);

  let imported = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = path.join(ARTICLES_DIR, file);
    const id = file.replace('.md', '');
    
    // Check if already exists in database
    const existing = await prisma.article.findUnique({ where: { id } });
    if (existing) {
      console.log(`⏭️  Skip (exists): ${file}`);
      skipped++;
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const title = extractTitle(content, file);
    const { wordCount, readTime } = calculateReadingStats(content);
    
    // Extract platform and column from filename patterns if possible
    let platform = '公众号';
    let column = '其他';
    
    // Try to detect platform/column from content
    if (content.includes('小红书') || content.includes('笔记')) {
      platform = '小红书';
      column = '笔记';
    } else if (content.includes('抖音') || content.includes('短视频')) {
      platform = '抖音';
      column = '短视频';
    } else if (content.includes('B站') || content.includes('BiliBili')) {
      platform = 'B站';
      column = '视频';
    }

    try {
      await prisma.article.create({
        data: {
          id,
          title,
          slug: `article-${id}`,
          summary: content.substring(0, 200).replace(/[#*_\[\]()!]/g, '').trim() + '...',
          filePath: `articles/${file}`,
          platform,
          column,
          status: 'draft',
          workflowStep: 0,
          workflowData: '{}',
          tags: '[]',
          knowledgeRefs: '[]',
          aiReviewStatus: 'pending',
          layoutTheme: 'default',
          wordCount,
          readTime,
          version: 1,
          userId: '9e877696-f775-4b6c-b5c0-7ceca3599b2c', // admin user
        },
      });
      console.log(`✅ Imported: ${title.substring(0, 40)}... (${wordCount} words)`);
      imported++;
    } catch (err: any) {
      console.log(`❌ Failed: ${file} - ${err.message}`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${files.length}`);
}

importArticles()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
