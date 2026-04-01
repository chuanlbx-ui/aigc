# ===========================================
# 数据库完整备份脚本
# 用于迁移部署前的数据库备份
# ===========================================

param(
    [string]$BackupDir = "../database-backup",
    [string]$EnvFile = "../.env.local",
    [switch]$IncludeData = $true,
    [switch]$SchemaOnly = $false
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupName = "backup_${timestamp}"

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "     数据库完整备份工具" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# 读取环境变量
if (Test-Path $EnvFile) {
    Write-Host "📄 加载环境变量: $EnvFile" -ForegroundColor Gray
    $envContent = Get-Content $EnvFile -Raw
    
    # 解析 DATABASE_URL
    if ($envContent -match 'DATABASE_URL="([^"]+)"') {
        $dbUrl = $matches[1]
        Write-Host "🔗 数据库 URL: $dbUrl" -ForegroundColor Gray
    } else {
        Write-Error "❌ 无法从 $EnvFile 解析 DATABASE_URL"
        exit 1
    }
} else {
    Write-Error "❌ 环境文件不存在: $EnvFile"
    exit 1
}

# 解析 PostgreSQL 连接信息
# 格式: postgresql://user:password@host:port/database
if ($dbUrl -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)') {
    $dbUser = $matches[1]
    $dbPass = $matches[2]
    $dbHost = $matches[3]
    $dbPort = $matches[4]
    $dbName = $matches[5]
    
    Write-Host ""
    Write-Host "📊 数据库信息:" -ForegroundColor Yellow
    Write-Host "   主机: $dbHost`:$dbPort" -ForegroundColor Gray
    Write-Host "   数据库: $dbName" -ForegroundColor Gray
    Write-Host "   用户: $dbUser" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Error "❌ 无法解析数据库连接字符串"
    exit 1
}

# 创建备份目录
$backupPath = Join-Path (Resolve-Path $BackupDir) $backupName
New-Item -ItemType Directory -Force -Path $backupPath | Out-Null
Write-Host "📁 备份目录: $backupPath" -ForegroundColor Green
Write-Host ""

# 设置环境变量供 pg_dump 使用
$env:PGPASSWORD = $dbPass

# 检查 pg_dump 是否可用
$pgDump = & where.exe pg_dump 2>$null
if (-not $pgDump) {
    # 尝试常见的 PostgreSQL 安装路径
    $possiblePaths = @(
        "C:\Program Files\PostgreSQL\*\bin\pg_dump.exe",
        "C:\Program Files (x86)\PostgreSQL\*\bin\pg_dump.exe",
        "${env:ProgramFiles}\PostgreSQL\*\bin\pg_dump.exe"
    )
    
    foreach ($path in $possiblePaths) {
        $found = Get-ChildItem -Path $path -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) {
            $pgDump = $found.FullName
            break
        }
    }
}

if (-not $pgDump) {
    Write-Warning "⚠️ 未找到 pg_dump，将使用 Prisma 导出作为备选方案"
    $usePrisma = $true
} else {
    Write-Host "✅ 找到 pg_dump: $pgDump" -ForegroundColor Green
    $usePrisma = $false
}

# ===========================================
# 执行备份
# ===========================================

$backupFiles = @()

# 1. 备份 Schema (结构)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  1. 备份数据库结构 (Schema)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$schemaFile = Join-Path $backupPath "01_schema.sql"
try {
    if ($usePrisma) {
        Write-Host "使用 Prisma 导出 Schema..." -ForegroundColor Yellow
        & npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > $schemaFile
    } else {
        & $pgDump -h $dbHost -p $dbPort -U $dbUser -d $dbName --schema-only --no-owner --no-privileges -f $schemaFile
    }
    
    if (Test-Path $schemaFile) {
        $size = (Get-Item $schemaFile).Length / 1KB
        Write-Host "✅ Schema 备份完成: $schemaFile ($([math]::Round($size, 2)) KB)" -ForegroundColor Green
        $backupFiles += $schemaFile
    }
} catch {
    Write-Error "❌ Schema 备份失败: $_"
}

# 2. 备份数据
if ($IncludeData -and -not $SchemaOnly) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  2. 备份数据库数据 (Data)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    # 2.1 SQL 格式备份
    $dataFile = Join-Path $backupPath "02_data.sql"
    try {
        if ($usePrisma) {
            Write-Host "使用 Prisma 导出数据..." -ForegroundColor Yellow
            # 使用 tsx 运行数据导出脚本
            & npx tsx scripts/export-data-prisma.ts $dataFile
        } else {
            Write-Host "使用 pg_dump 导出数据..." -ForegroundColor Yellow
            & $pgDump -h $dbHost -p $dbPort -U $dbUser -d $dbName --data-only --no-owner --no-privileges --column-inserts -f $dataFile
        }
        
        if (Test-Path $dataFile) {
            $size = (Get-Item $dataFile).Length / 1MB
            Write-Host "✅ 数据备份完成: $dataFile ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
            $backupFiles += $dataFile
        }
    } catch {
        Write-Warning "⚠️ 数据备份失败: $_"
    }
    
    # 2.2 自定义格式备份 (仅 pg_dump)
    if (-not $usePrisma) {
        Write-Host ""
        Write-Host "创建自定义格式备份 (可恢复单表)..." -ForegroundColor Yellow
        $customFile = Join-Path $backupPath "03_full_backup.dump"
        try {
            & $pgDump -h $dbHost -p $dbPort -U $dbUser -d $dbName --format=c --no-owner --no-privileges -f $customFile
            
            if (Test-Path $customFile) {
                $size = (Get-Item $customFile).Length / 1MB
                Write-Host "✅ 自定义备份完成: $customFile ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
                $backupFiles += $customFile
            }
        } catch {
            Write-Warning "⚠️ 自定义备份失败: $_"
        }
    }
}

# 3. 备份 Schema 文件
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  3. 备份 Prisma Schema" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$prismaSchemaFile = Join-Path $backupPath "04_prisma_schema.prisma"
Copy-Item "prisma/schema.prisma" $prismaSchemaFile -Force
Write-Host "✅ Prisma Schema 备份完成" -ForegroundColor Green
$backupFiles += $prismaSchemaFile

# 4. 生成恢复脚本
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  4. 生成恢复脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$restoreScript = Join-Path $backupPath "restore.ps1"
$restoreContent = @"
# ===========================================
# 数据库恢复脚本
# 生成时间: $(Get-Date)
# 源数据库: $dbName
# ===========================================

param(
    [string]`$TargetDatabaseUrl = `$env:DATABASE_URL,
    [switch]`$CreateDatabase = `$false
)

if (-not `$TargetDatabaseUrl) {
    Write-Error "请提供目标数据库 URL，或通过环境变量 DATABASE_URL 设置"
    exit 1
}

# 解析连接信息
if (`$TargetDatabaseUrl -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)') {
    `$dbUser = `$matches[1]
    `$dbPass = `$matches[2]
    `$dbHost = `$matches[3]
    `$dbPort = `$matches[4]
    `$dbName = `$matches[5]
} else {
    Write-Error "无法解析数据库连接字符串"
    exit 1
}

`$env:PGPASSWORD = `$dbPass

Write-Host "恢复数据库到: `$dbHost`:`$dbPort/`$dbName" -ForegroundColor Yellow

# 创建数据库（如果需要）
if (`$CreateDatabase) {
    Write-Host "创建数据库..." -ForegroundColor Yellow
    psql -h `$dbHost -p `$dbPort -U `$dbUser -d postgres -c "CREATE DATABASE `$dbName;"
}

# 恢复 Schema
Write-Host "恢复数据库结构..." -ForegroundColor Yellow
psql -h `$dbHost -p `$dbPort -U `$dbUser -d `$dbName -f "01_schema.sql"

# 恢复数据
if (Test-Path "02_data.sql") {
    Write-Host "恢复数据..." -ForegroundColor Yellow
    psql -h `$dbHost -p `$dbPort -U `$dbUser -d `$dbName -f "02_data.sql"
}

# 或使用自定义格式恢复
# pg_restore -h `$dbHost -p `$dbPort -U `$dbUser -d `$dbName --clean --if-exists "03_full_backup.dump"

Write-Host "恢复完成!" -ForegroundColor Green
"@

$restoreContent | Out-File -FilePath $restoreScript -Encoding UTF8
Write-Host "✅ 恢复脚本生成: $restoreScript" -ForegroundColor Green

# 5. 生成备份信息文件
$infoFile = Join-Path $backupPath "backup_info.json"
$backupInfo = @{
    timestamp = Get-Date -Format "o"
    database = $dbName
    host = "$dbHost`:$dbPort"
    version = & npx prisma version --json | ConvertFrom-Json | Select-Object -ExpandProperty prisma
    files = @($backupFiles | ForEach-Object { 
        $file = Get-Item $_
        @{
            name = $file.Name
            size = $file.Length
            path = $file.FullName
        }
    })
    tables = @()
} | ConvertTo-Json -Depth 5

$backupInfo | Out-File -FilePath $infoFile -Encoding UTF8
Write-Host "✅ 备份信息: $infoFile" -ForegroundColor Green

# ===========================================
# 备份完成
# ===========================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ 数据库备份完成!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📁 备份位置: $backupPath" -ForegroundColor Yellow
Write-Host ""
Write-Host "备份文件清单:" -ForegroundColor Cyan
foreach ($file in $backupFiles) {
    $item = Get-Item $file
    $size = if ($item.Length -gt 1MB) { 
        "$([math]::Round($item.Length / 1MB, 2)) MB" 
    } else { 
        "$([math]::Round($item.Length / 1KB, 2)) KB" 
    }
    Write-Host "   • $($item.Name) ($size)" -ForegroundColor Gray
}
Write-Host ""
Write-Host "恢复说明:" -ForegroundColor Cyan
Write-Host "   1. 复制备份目录到目标服务器" -ForegroundColor Gray
Write-Host "   2. 运行 restore.ps1 脚本" -ForegroundColor Gray
Write-Host "   3. 或使用 pg_restore 恢复 .dump 文件" -ForegroundColor Gray
Write-Host ""

# 清理环境变量
Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
