import fs from 'fs';
import { execSync } from 'child_process';

const BACKUP_FILE = 'remotion_video_backup.sql';

const content = fs.readFileSync(BACKUP_FILE, 'utf-8');
const lines = content.split('\n');

// 要恢复的表（按依赖顺序）
const tables = [
  'ArticleCategory',
  'AssetCategory',
  'KnowledgeCategory', 
  'AIServiceConfig',
  'HotTopic',
  'Article',
  'Asset',
  'KnowledgeDoc',
  'Template',
  'PopupTemplate',
  'WorkflowTemplate'
];

async function restoreTable(tableName) {
  console.log(`\n=== 恢复 ${tableName} ===`);
  
  // 找到 COPY 开始的行号
  let startIdx = -1;
  let endIdx = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`COPY public."${tableName}"`)) {
      startIdx = i;
    }
    if (startIdx > 0 && lines[i] === '\\.') {
      endIdx = i;
      break;
    }
  }
  
  if (startIdx < 0) {
    console.log(`  跳过: ${tableName} (未找到)`);
    return;
  }
  
  if (endIdx < 0) {
    console.log(`  跳过: ${tableName} (未找到结束标记)`);
    return;
  }
  
  // 提取 COPY 数据
  const copyData = lines.slice(startIdx, endIdx + 1).join('\n')
    .replace(/\\N/g, '')
    .replace(/\\\\/g, '\\');
  
  // 写入临时文件
  const tempFile = `temp_${tableName}.sql`;
  fs.writeFileSync(tempFile, copyData);
  
  try {
    // 使用 docker exec 导入
    const cmd = `docker exec -i remotion-postgres-dev psql -U postgres -d remotion_video_dev < "${tempFile}"`;
    execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
    console.log(`  ✅ 恢复成功: ${tableName}`);
  } catch (err) {
    console.log(`  ⚠️ 部分错误: ${tableName}`);
  } finally {
    // 删除临时文件
    try {
      fs.unlinkSync(tempFile);
    } catch (e) {}
  }
}

async function main() {
  for (const table of tables) {
    await restoreTable(table);
  }
  
  console.log('\n=== 验证数据 ===');
  try {
    const result = execSync(
      'docker exec remotion-postgres-dev psql -U postgres -d remotion_video_dev -t -c "SELECT \'Article\', COUNT(*) FROM \\"Article\\" UNION ALL SELECT \'Asset\', COUNT(*) FROM \\"Asset\\" UNION ALL SELECT \'KnowledgeDoc\', COUNT(*) FROM \\"KnowledgeDoc\\" UNION ALL SELECT \'Template\', COUNT(*) FROM \\"Template\\" UNION ALL SELECT \'HotTopic\', COUNT(*) FROM \\"HotTopic\\" UNION ALL SELECT \'PopupTemplate\', COUNT(*) FROM \\"PopupTemplate\\";"',
      { encoding: 'utf-8' }
    );
    console.log(result);
  } catch (e) {
    console.log('验证失败');
  }
}

main().catch(console.error);
