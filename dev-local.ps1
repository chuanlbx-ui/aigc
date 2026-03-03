# 本地开发环境启动脚本
param(
    [switch]$SkipDB,
    [switch]$Tools
)

Write-Host "🚀 启动本地开发环境..." -ForegroundColor Green

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# 1. 启动 PostgreSQL（如果需要）
if (-not $SkipDB) {
    Write-Host "`n📦 启动 PostgreSQL Docker 容器..." -ForegroundColor Cyan
    
    if ($Tools) {
        docker-compose -f docker-compose.dev.yml up -d --profile tools
    } else {
        docker-compose -f docker-compose.dev.yml up -d
    }
    
    # 等待数据库就绪
    Write-Host "⏳ 等待数据库启动..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    # 检查数据库连接
    $dbReady = $false
    $attempts = 0
    while (-not $dbReady -and $attempts -lt 10) {
        try {
            $result = docker exec remotion-postgres-dev pg_isready -U postgres 2>&1
            if ($LASTEXITCODE -eq 0) {
                $dbReady = $true
                Write-Host "✅ 数据库已就绪" -ForegroundColor Green
            }
        } catch {
            $attempts++
            Start-Sleep -Seconds 2
        }
    }
    
    if (-not $dbReady) {
        Write-Host "⚠️  数据库启动超时，请检查 Docker 状态" -ForegroundColor Yellow
    }
}

# 2. 应用环境配置
Write-Host "`n🔧 配置环境变量..." -ForegroundColor Cyan
Copy-Item -Path ".\backend\.env.local" -Destination ".\backend\.env" -Force
Write-Host "✅ 使用本地数据库配置" -ForegroundColor Green

# 3. 初始化数据库（如果需要）
if (-not $SkipDB) {
    $needMigrate = Read-Host "`n是否需要初始化/更新数据库？ (y/n)"
    if ($needMigrate -eq "y") {
        Write-Host "`n📊 执行数据库迁移..." -ForegroundColor Cyan
        Set-Location ".\backend"
        npm run db:push
        Set-Location ".."
    }
}

# 4. 显示启动说明
Write-Host "`n✨ 环境准备完成！" -ForegroundColor Green
Write-Host "`n📝 请在两个终端分别执行：" -ForegroundColor Yellow
Write-Host "  终端1: cd backend; npm run dev   # 启动后端" -ForegroundColor White
Write-Host "  终端2: cd frontend; npm run dev  # 启动前端" -ForegroundColor White
Write-Host "`n🌐 访问地址：" -ForegroundColor Cyan
Write-Host "  前端: http://localhost:5175" -ForegroundColor White
Write-Host "  后端: http://localhost:3001" -ForegroundColor White

if ($Tools) {
    Write-Host "  PgAdmin: http://localhost:5050 (admin@admin.com / admin123)" -ForegroundColor White
}

Write-Host "`n💡 提示：" -ForegroundColor Yellow
Write-Host "  - 使用 .\dev-local.ps1 -SkipDB 可跳过数据库启动" -ForegroundColor Gray
Write-Host "  - 使用 .\dev-local.ps1 -Tools 可同时启动 PgAdmin" -ForegroundColor Gray
Write-Host "  - 使用 .\dev-remote.ps1 可切换到远程数据库" -ForegroundColor Gray
