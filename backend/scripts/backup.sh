#!/bin/bash
#
# 数据库备份脚本
# 支持 SQLite 和 PostgreSQL
#
# 使用方法:
#   ./backup.sh [daily|weekly|manual]
#
# 环境变量:
#   DATABASE_URL - 数据库连接字符串
#   BACKUP_DIR - 备份目录 (默认: ./backups)
#   BACKUP_RETENTION_DAYS - 保留天数 (默认: 30)

set -e

# 配置
BACKUP_TYPE=${1:-manual}
BACKUP_DIR=${BACKUP_DIR:-./backups}
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p "$BACKUP_DIR"

echo "========================================"
echo "数据库备份 - $BACKUP_TYPE"
echo "时间: $(date)"
echo "========================================"

# 检测数据库类型
detect_db_type() {
  if [[ "$DATABASE_URL" == *"postgresql"* ]] || [[ "$DATABASE_URL" == *"postgres"* ]]; then
    echo "postgresql"
  elif [[ "$DATABASE_URL" == *"file:"* ]] || [[ -z "$DATABASE_URL" ]]; then
    echo "sqlite"
  else
    echo "unknown"
  fi
}

DB_TYPE=$(detect_db_type)
echo "数据库类型: $DB_TYPE"

# SQLite 备份
backup_sqlite() {
  local DB_FILE=${DATABASE_URL:-"./prisma/dev.db"}
  DB_FILE=${DB_FILE#file:}

  local BACKUP_FILE="$BACKUP_DIR/sqlite_${BACKUP_TYPE}_${TIMESTAMP}.db"

  if [ -f "$DB_FILE" ]; then
    cp "$DB_FILE" "$BACKUP_FILE"
    gzip "$BACKUP_FILE"
    echo "SQLite 备份完成: ${BACKUP_FILE}.gz"
  else
    echo "错误: 数据库文件不存在: $DB_FILE"
    exit 1
  fi
}

# PostgreSQL 备份
backup_postgresql() {
  local BACKUP_FILE="$BACKUP_DIR/postgres_${BACKUP_TYPE}_${TIMESTAMP}.sql"

  pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
  gzip "$BACKUP_FILE"
  echo "PostgreSQL 备份完成: ${BACKUP_FILE}.gz"
}

# 清理旧备份
cleanup_old_backups() {
  echo "清理 $RETENTION_DAYS 天前的备份..."
  find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete
  echo "清理完成"
}

# 执行备份
case $DB_TYPE in
  sqlite)
    backup_sqlite
    ;;
  postgresql)
    backup_postgresql
    ;;
  *)
    echo "错误: 不支持的数据库类型"
    exit 1
    ;;
esac

# 清理旧备份
cleanup_old_backups

echo "========================================"
echo "备份完成"
echo "========================================"
