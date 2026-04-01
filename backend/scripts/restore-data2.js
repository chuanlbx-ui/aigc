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
  let copyData = lines.slice(startIdx, endIdx + 1).join('\n');
  
  // 替换 \\N (NULL) 为空字符串
  copyData = copyData.replace(/\\N/g, '');
  
  // 写入临时文件
  const tempFile = `temp_${tableName}.sql`;
  fs.writeFileSync(tempFile, copyData);
  
  // 使用 ON_ERROR_ROLLBACK 导入
  try {
    const cmd = `docker exec -i remotion-postgres-dev psql -U postgres -d remotion_video_dev -c "SET ON_ERROR_ROLLBACK on;" -f - < "${tempFile}" 2>&1`;
    const result = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
    console.log(`  ✅ 恢复完成: ${tableName}`);
  } catch (err) {
    // 忽略错误，尝试直接导入
    try {
      const cmd2 = `docker exec -i remotion-postgres-dev psql -U postgres -d remotion_video_dev < "${tempFile}" 2>&1 | head -20`;
      execSync(cmd2, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (e2) {
      // 继续
    }
    console.log(`  ⚠️ 已尝试: ${tableName}`);
  } finally {
    // 删除临时文件
    try {
      fs.unlinkSync(tempFile);
    } catch (e) {}
  }
}

async function main() {
  // 先删除现有数据（除了系统数据）
  console.log('=== 清理现有数据 ===');
  try {
    execSync('docker exec remotion-postgres-dev psql -U postgres -d remotion_video_dev -c "DELETE FROM \\"Asset\\";"', { encoding: 'utf-8' });
    execSync('docker exec remotion-postgres-dev psql -U postgres -d remotion_video_dev -c "DELETE FROM \\"KnowledgeDoc\\";"', { encoding: 'utf-8' });
    execSync('docker exec remotion-postgres-dev psql -U postgres -d remotion_video_dev -c "DELETE FROM \\"Template\\" WHERE \\"userId\\" IS NOT NULL;"', { encoding: 'utf-8' });
    execSync('docker exec remotion-postgres-dev psql -U postgres -d remotion_video_dev -c "DELETE FROM \\"HotTopic\\";"', { encoding: 'utf-8' });
    console.log('清理完成');
  } catch (e) {
    console.log('清理时出错（可能表为空）');
  }
  
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
