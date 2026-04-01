import fs from 'fs';

const BACKUP_FILE = 'remotion_video_backup.sql';

function processTable(tableName, columns) {
  const content = fs.readFileSync(BACKUP_FILE, 'utf-8');
  const lines = content.split('\n');
  
  let startIdx = -1;
  let endIdx = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`COPY public."${tableName}"`)) {
      startIdx = i;
    }
    if (startIdx > 0 && lines[i].trim() === '\\.') {
      endIdx = i;
      break;
    }
  }
  
  if (startIdx < 0 || endIdx < 0) {
    console.log(`${tableName}: 未找到`);
    return;
  }
  
  const dataLines = lines.slice(startIdx + 1, endIdx);
  console.log(`${tableName}: ${dataLines.length} 行`);
  
  const insertFile = `temp_${tableName}_inserts.sql`;
  const stream = fs.createWriteStream(insertFile);
  
  for (const line of dataLines) {
    if (!line.trim()) continue;
    
    // 分割字段（制表符分隔）
    const cols = line.split('\t');
    if (cols.length !== columns.length) continue;
    
    const values = cols.map(c => {
      if (c === '\\N' || c === '') return 'NULL';
      // 转义单引号
      const escaped = c.replace(/'/g, "''");
      return `'${escaped}'`;
    });
    
    const quotedCols = columns.map(c => `"${c}"`).join(', ');
    const sql = `INSERT INTO "${tableName}" (${quotedCols}) VALUES (${values.join(', ')});`;
    stream.write(sql + '\n');
  }
  
  stream.end();
  console.log(`  -> 已写入 ${insertFile}`);
}

// Asset 表列
processTable('Asset', [
  'id', 'name', 'type', 'path', 'tags', 'source', 
  'categoryId', 'tenantId', 'userId', 'createdAt'
]);

// KnowledgeDoc 表列
processTable('KnowledgeDoc', [
  'id', 'title', 'slug', 'summary', 'filePath', 'source', 'sourceUrl',
  'categoryId', 'tenantId', 'userId', 'tags', 'version', 'wordCount',
  'readTime', 'isPinned', 'createdAt', 'updatedAt'
]);

// Template 表列
processTable('Template', [
  'id', 'name', 'type', 'content', 'thumbnail', 'category', 'tags',
  'description', 'platform', 'column', 'isPublic', 'usageCount',
  'tenantId', 'userId', 'createdAt', 'updatedAt'
]);
