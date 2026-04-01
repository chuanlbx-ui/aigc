# ===========================================
# 简单数据库备份脚本
# 使用 pg_dump 快速备份
# ===========================================

param(
    [string]$OutputDir = "./database-backup"
)

$ErrorActionPreference = "Stop"

# 颜色输出
function Write-Color($Text, $Color = "White") {
    Write-Host $Text -ForegroundColor $Color
}

Write-Color "========================================" "Cyan"
Write-Color "     PostgreSQL 数据库备份工具" "Cyan"
Write-Color "========================================" "Cyan"
Write-Host ""

# 检查 pg_dump
$pgDump = & where.exe pg_dump 2>$null
if (-not $pgDump) {
    # 尝试常见路径
    $pgPaths = Get-ChildItem -Path "C:\Program Files\PostgreSQL" -Name "pg_dump.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($pgPaths) {
        $pgDump = Join-Path "C:\Program Files\PostgreSQL" $pgPaths
    }
}

if (-not $pgDump) {
    Write-Color "❌ 未找到 pg_dump，请确保 PostgreSQL 已安装并添加到 PATH" "Red"
    exit 1
}

Write-Color "✅ 找到 pg_dump: $pgDump" "Green"
Write-Host ""

# 解析数据库连接信息
# 默认使用本地开发数据库
$dbHost = "localhost"
$dbPort = "5432"
$dbUser = "postgres"
$dbPass = "postgres123"
$dbName = "remotion_video_dev"

# 如果存在 .env.local，尝试从中读取
$envFile = "../.env.local"
if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw
    if ($content -match 'DATABASE_URL="postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/([^"]+)"') {
        $dbUser = $matches[1]
        $dbPass = $matches[2]
        $dbHost = $matches[3]
        $dbPort = $matches[4]
        $dbName = $matches[5]
        Write-Color "📄 从 .env.local 加载数据库配置" "Gray"
    }
}

Write-Color "📊 数据库信息:" "Yellow"
Write-Host "   主机: $dbHost`:$dbPort"
Write-Host "   数据库: $dbName"
Write-Host "   用户: $dbUser"
Write-Host ""

# 创建备份目录
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = Join-Path (Resolve-Path $OutputDir) "backup_$timestamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

Write-Color "📁 备份目录: $backupDir" "Green"
Write-Host ""

# 设置密码环境变量
$env:PGPASSWORD = $dbPass

# 1. 完整备份 (Custom Format)
Write-Color "========================================" "Cyan"
Write-Color "  1. 创建完整备份 (Custom Format)" "Cyan"
Write-Color "========================================" "Cyan"

$fullBackup = Join-Path $backupDir "full_backup.dump"
Write-Host "正在备份..."
& $pgDump -h $dbHost -p $dbPort -U $dbUser -d $dbName `
    --format=c `
    --verbose `
    --no-owner `
    --no-privileges `
    --file="$fullBackup" 2>&1

if ($LASTEXITCODE -eq 0) {
    $size = (Get-Item $fullBackup).Length / 1MB
    Write-Color "✅ 完整备份完成: $([math]::Round($size, 2)) MB" "Green"
} else {
    Write-Color "❌ 完整备份失败" "Red"
}

# 2. Schema 备份
Write-Host ""
Write-Color "========================================" "Cyan"
Write-Color "  2. 导出数据库结构 (Schema Only)" "Cyan"
Write-Color "========================================" "Cyan"

$schemaBackup = Join-Path $backupDir "schema_only.sql"
& $pgDump -h $dbHost -p $dbPort -U $dbUser -d $dbName `
    --schema-only `
    --no-owner `
    --no-privileges `
    --file="$schemaBackup" 2>&1

if ($LASTEXITCODE -eq 0) {
    $size = (Get-Item $schemaBackup).Length / 1KB
    Write-Color "✅ Schema 备份完成: $([math]::Round($size, 2)) KB" "Green"
} else {
    Write-Color "❌ Schema 备份失败" "Red"
}

# 3. 数据备份 (Plain SQL)
Write-Host ""
Write-Color "========================================" "Cyan"
Write-Color "  3. 导出数据 (Plain SQL)" "Cyan"
Write-Color "========================================" "Cyan"

$dataBackup = Join-Path $backupDir "data_only.sql"
& $pgDump -h $dbHost -p $dbPort -U $dbUser -d $dbName `
    --data-only `
    --no-owner `
    --no-privileges `
    --column-inserts `
    --file="$dataBackup" 2>&1

if ($LASTEXITCODE -eq 0) {
    $size = (Get-Item $dataBackup).Length / 1MB
    Write-Color "✅ 数据备份完成: $([math]::Round($size, 2)) MB" "Green"
} else {
    Write-Color "❌ 数据备份失败" "Red"
}

# 4. 备份 Schema 文件
Write-Host ""
Write-Color "========================================" "Cyan"
Write-Color "  4. 备份 Prisma Schema" "Cyan"
Write-Color "========================================" "Cyan"

$prismaSchema = Join-Path $backupDir "schema.prisma"
Copy-Item "../backend/prisma/schema.prisma" $prismaSchema -Force
Write-Color "✅ Prisma Schema 已复制" "Green"

# 5. 生成恢复脚本
Write-Host ""
Write-Color "========================================" "Cyan"
Write-Color "  5. 生成恢复脚本" "Cyan"
Write-Color "========================================" "Cyan"

$restoreScript = Join-Path $backupDir "restore.sh"
$restoreContent = @"
#!/bin/bash
# ===========================================
# 数据库恢复脚本
# ===========================================

DB_URL=\"\${1:-DATABASE_URL}\"

if [ -z \"\$DB_URL\" ]; then
    echo \"用法: ./restore.sh <DATABASE_URL>\"
    echo \"示例: ./restore.sh 'postgresql://user:pass@host:5432/dbname'\"
    exit 1
fi

echo \"正在恢复数据库...\"

# 方法1: 使用 pg_restore (推荐)
pg_restore --clean --if-exists --no-owner --no-privileges -d \"\$DB_URL\" full_backup.dump

# 方法2: 使用 psql (如果 pg_restore 失败)
# psql \"\$DB_URL\" -f schema_only.sql
# psql \"\$DB_URL\" -f data_only.sql

echo \"恢复完成!\"
"@

$restoreContent | Out-File -FilePath $restoreScript -Encoding UTF8
Write-Color "✅ 恢复脚本已生成: restore.sh" "Green"

# 清理环境变量
Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

# 生成备份信息
$infoFile = Join-Path $backupDir "backup_info.txt"
@"
数据库备份信息
========================================
备份时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
数据库: $dbName
主机: $dbHost`:$dbPort

文件清单:
----------------------------------------
1. full_backup.dump  - 完整备份 (pg_restore 恢复)
2. schema_only.sql   - 数据库结构
3. data_only.sql     - 数据 (INSERT 语句)
4. schema.prisma     - Prisma Schema 文件
5. restore.sh        - 恢复脚本

恢复方法:
----------------------------------------
方法1 (推荐): 使用 pg_restore
  pg_restore --clean --if-exists -d 'postgresql://user:pass@host/db' full_backup.dump

方法2: 使用 psql
  psql -d 'postgresql://user:pass@host/db' -f schema_only.sql
  psql -d 'postgresql://user:pass@host/db' -f data_only.sql

Prisma 迁移:
----------------------------------------
如果使用 Prisma，恢复后可能需要运行:
  npx prisma db push
  npx prisma generate
"@ | Out-File -FilePath $infoFile -Encoding UTF8

# 完成汇总
Write-Host ""
Write-Color "========================================" "Green"
Write-Color "  ✅ 数据库备份完成!" "Green"
Write-Color "========================================" "Green"
Write-Host ""
Write-Color "📁 备份位置: $backupDir" "Yellow"
Write-Host ""

Get-ChildItem $backupDir | ForEach-Object {
    $size = if ($_.Length -gt 1MB) { 
        "$([math]::Round($_.Length / 1MB, 2)) MB" 
    } else { 
        "$([math]::Round($_.Length / 1KB, 2)) KB" 
    }
    Write-Host "   • $($_.Name) ($size)"
}

Write-Host ""
Write-Color "📖 查看 backup_info.txt 获取恢复说明" "Gray"
