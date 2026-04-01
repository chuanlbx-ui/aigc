#!/bin/bash
# 从备份文件恢复数据（只恢复数据，不恢复表结构）

BACKUP_FILE="remotion_video_backup.sql"

# 要恢复的表（按依赖顺序）
TABLES=(
  "ArticleCategory"
  "AssetCategory"
  "KnowledgeCategory"
  "AIServiceConfig"
  "HotTopic"
  "Article"
  "Asset"
  "KnowledgeDoc"
  "Template"
  "PopupTemplate"
  "WorkflowTemplate"
)

for TABLE in "${TABLES[@]}"; do
  echo "=== 恢复 $TABLE ==="

  # 找到 COPY 开始的行号
  START=$(grep -n "^COPY public.\"$TABLE\"" "$BACKUP_FILE" | head -1 | cut -d: -f1)

  if [ -z "$START" ]; then
    echo "跳过: $TABLE (未找到)"
    continue
  fi

  # 找到结束的 \. 行
  END=$(awk "NR>$START && /^\\\\.$/{print NR; exit}" "$BACKUP_FILE")

  if [ -z "$END" ]; then
    echo "跳过: $TABLE (未找到结束标记)"
    continue
  fi

  # 提取数据（包含 COPY 行和结束标记）
  sed -n "${START},${END}p" "$BACKUP_FILE" | \
    sed 's/\\N/\\null/g' | \
    docker exec -i remotion-postgres-dev psql -U postgres -d remotion_video_dev 2>/dev/null

  echo "恢复完成: $TABLE"
done

echo "=== 验证数据 ==="
docker exec remotion-postgres-dev psql -U postgres -d remotion_video_dev -c "
SELECT 'Article' as tbl, COUNT(*) FROM \"Article\"
UNION ALL SELECT 'Asset', COUNT(*) FROM \"Asset\"
UNION ALL SELECT 'KnowledgeDoc', COUNT(*) FROM \"KnowledgeDoc\"
UNION ALL SELECT 'Template', COUNT(*) FROM \"Template\"
UNION ALL SELECT 'HotTopic', COUNT(*) FROM \"HotTopic\"
UNION ALL SELECT 'PopupTemplate', COUNT(*) FROM \"PopupTemplate\";
"
