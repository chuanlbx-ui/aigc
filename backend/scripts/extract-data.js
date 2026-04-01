import fs from 'fs';

const BACKUP_FILE = 'remotion_video_backup.sql';
const content = fs.readFileSync(BACKUP_FILE, 'utf-8');
const lines = content.split('\n');

// 找到每个表的起始和结束行
function extractTableData(tableName) {
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
  
  if (startIdx < 0 || endIdx < 0) return null;
  
  // 提取 COPY 数据（跳过 COPY 行）
  const dataLines = lines.slice(startIdx + 1, endIdx);
  
  // 处理数据
  return dataLines.map(line => {
    // 处理 NULL 值 (\N -> 空)
    // 处理转义字符
    return line.replace(/\\N/g, '').replace(/\\\\/g, '\\');
  }).filter(line => line.trim().length > 0);
}

const tables = ['Asset', 'KnowledgeDoc', 'Template'];

for (const table of tables) {
  const data = extractTableData(table);
  if (data && data.length > 0) {
    console.log(`${table}: ${data.length} 行`);
    
    // 写入临时文件
    const tempFile = `temp_${table}_data.txt`;
    fs.writeFileSync(tempFile, data.join('\n'));
    
    console.log(`  -> 已写入 ${tempFile}`);
  } else {
    console.log(`${table}: 无数据`);
  }
}
