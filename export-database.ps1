# PostgreSQL 数据库迁移脚本
# 用途：将本地 Docker PostgreSQL 迁移到宝塔 PostgreSQL
# 创建时间：2026-02-20

# ============================================
# 第一部分：本地数据导出
# ============================================

# 1. 设置变量（请根据实际情况修改）
$LocalDbHost = "162.14.114.224"
$LocalDbPort = "5432"
$LocalDbName = "remotion_video"
$LocalDbUser = "postgres"
$LocalDbPassword = "postgres123"
$DockerContainerName = "remotion-postgres"

# 2. 创建备份目录
$BackupDir = "D:\AGC\remotion-video\web\database-backup"
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "✅ 创建备份目录: $BackupDir" -ForegroundColor Green
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "$BackupDir\remotion_video_backup_$Timestamp.sql"

# 3. 导出数据（使用 Docker 容器内的 pg_dump）
Write-Host ""
Write-Host "📦 正在导出本地数据库..." -ForegroundColor Cyan

try {
    # 方法1：通过 Docker 容器导出
    docker exec $DockerContainerName pg_dump -U $LocalDbUser -d $LocalDbName -Fc > "$BackupDir\remotion_video_backup_$Timestamp.dump"
    
    # 方法2：导出为纯 SQL 格式（更兼容）
    docker exec $DockerContainerName pg_dump -U $LocalDbUser -d $LocalDbName --no-owner --no-privileges > $BackupFile
    
    Write-Host "✅ 数据导出成功: $BackupFile" -ForegroundColor Green
    $fileSize = [math]::Round((Get-Item $BackupFile).Length / 1MB, 2)
    Write-Host "📊 文件大小: $fileSize MB" -ForegroundColor Yellow
} catch {
    Write-Host "❌ 导出失败: $_" -ForegroundColor Red
    
    # 备用方案：使用本地 pg_dump（如果已安装 PostgreSQL 客户端）
    Write-Host ""
    Write-Host "🔄 尝试使用本地 pg_dump..." -ForegroundColor Yellow
    $env:PGPASSWORD = $LocalDbPassword
    pg_dump -h $LocalDbHost -p $LocalDbPort -U $LocalDbUser -d $LocalDbName --no-owner --no-privileges > $BackupFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 本地导出成功: $BackupFile" -ForegroundColor Green
    } else {
        Write-Host "❌ 本地导出也失败了，请确保 PostgreSQL 客户端已安装" -ForegroundColor Red
        exit 1
    }
}

# 4. 生成表结构统计
Write-Host ""
Write-Host "📋 数据库表结构统计:" -ForegroundColor Cyan
docker exec $DockerContainerName psql -U $LocalDbUser -d $LocalDbName -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# ============================================
# 第二部分：生成宝塔导入脚本
# ============================================

$BaotaScript = @'
#!/bin/bash
# ============================================
# 宝塔 PostgreSQL 数据导入脚本
# ============================================

# 宝塔数据库配置（请修改为您的实际配置）
BAOTA_DB_HOST="localhost"
BAOTA_DB_PORT="5432"
BAOTA_DB_NAME="remotion_video"
BAOTA_DB_USER="your_username"
BAOTA_DB_PASSWORD="your_password"

# 数据文件路径
BACKUP_FILE="/root/remotion_video_backup.sql"

echo "=========================================="
echo "🚀 开始导入数据到宝塔 PostgreSQL"
echo "=========================================="

# 1. 检查数据库是否存在
echo "📋 检查数据库..."
sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname = '$BAOTA_DB_NAME';" | grep -q 1
if [ $? -ne 0 ]; then
    echo "🆕 数据库不存在，创建数据库..."
    sudo -u postgres psql -c "CREATE DATABASE $BAOTA_DB_NAME OWNER $BAOTA_DB_USER;"
fi

# 2. 导入数据
echo "📥 导入数据..."
export PGPASSWORD=$BAOTA_DB_PASSWORD
psql -h $BAOTA_DB_HOST -p $BAOTA_DB_PORT -U $BAOTA_DB_USER -d $BAOTA_DB_NAME < $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✅ 数据导入成功！"
else
    echo "❌ 数据导入失败！"
    exit 1
fi

echo "=========================================="
echo "🎉 数据库迁移完成！"
echo "=========================================="
'@

$BaotaScriptPath = "$BackupDir\import_to_baota.sh"
$BaotaScript | Out-File -FilePath $BaotaScriptPath -Encoding UTF8
Write-Host "✅ 宝塔导入脚本已生成: $BaotaScriptPath" -ForegroundColor Green

# ============================================
# 第三部分：生成数据验证脚本
# ============================================

$VerifyScript = @'
-- 数据验证 SQL 脚本
SELECT 'User' as table_name, COUNT(*) as record_count FROM "User"
UNION ALL
SELECT 'Project', COUNT(*) FROM "Project"
UNION ALL
SELECT 'Article', COUNT(*) FROM "Article"
UNION ALL
SELECT 'Asset', COUNT(*) FROM "Asset";
'@

$VerifyPath = "$BackupDir\verify_data.sql"
$VerifyScript | Out-File -FilePath $VerifyPath -Encoding UTF8
Write-Host "✅ 数据验证脚本已生成: $VerifyPath" -ForegroundColor Green

# ============================================
# 完成总结
# ============================================

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🎉 数据库迁移脚本生成完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📁 生成的文件:" -ForegroundColor Yellow
Write-Host "   1. $BackupFile" -ForegroundColor White
Write-Host "   2. $BaotaScriptPath" -ForegroundColor White
Write-Host "   3. $VerifyPath" -ForegroundColor White
Write-Host ""
Write-Host "📋 下一步操作:" -ForegroundColor Yellow
Write-Host "   1. 将 SQL 文件上传到宝塔服务器" -ForegroundColor White
Write-Host "   2. 修改导入脚本中的数据库配置" -ForegroundColor White
Write-Host "   3. 在宝塔服务器上执行导入脚本" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
