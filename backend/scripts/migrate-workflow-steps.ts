import { PrismaClient } from '@prisma/client';
import { parseWorkflowData } from '../src/services/article/workflow.js';
import { syncWorkflowSteps } from '../src/services/article/workflowStorage.js';

const prisma = new PrismaClient();

async function main() {
  const articles = await prisma.article.findMany({
    select: {
      id: true,
      workflowData: true,
      workflowStep: true,
    },
  });

  let migrated = 0;
  let failed = 0;

  for (const article of articles) {
    try {
      await syncWorkflowSteps(article.id, parseWorkflowData(article.workflowData), article.workflowStep);
      migrated += 1;
    } catch (error) {
      failed += 1;
      console.error(`[workflow-migrate] failed for ${article.id}`, error);
    }
  }

  console.log(JSON.stringify({ migrated, failed }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
