# 查看当前环境状态
Write-Host "📊 当前开发环境状态" -ForegroundColor Green
$separator = "=" * 60
Write-Host $separator -ForegroundColor Gray

# 检查 Docker PostgreSQL
Write-Host "`n🐳 Docker 容器状态：" -ForegroundColor Cyan
$containers = docker ps --filter "name=remotion-postgres" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>$null
if ($containers -and $containers.Count -gt 1) {
    Write-Host $containers -ForegroundColor White
} else {
    Write-Host "  未运行本地 PostgreSQL 容器" -ForegroundColor Yellow
}

# 检查当前环境配置
Write-Host "`n⚙️  当前环境配置：" -ForegroundColor Cyan
if (Test-Path ".\backend\.env") {
    $envContent = Get-Content ".\backend\.env" -Raw
    if ($envContent -match 'localhost:5432') {
        Write-Host "  📍 本地数据库 (localhost:5432)" -ForegroundColor Green
        Write-Host "  💾 数据库: remotion_video_dev" -ForegroundColor White
    } elseif ($envContent -match '162\.14\.114\.224') {
        Write-Host "  🌐 远程数据库 (162.14.114.224:5432)" -ForegroundColor Yellow
        Write-Host "  💾 数据库: remotion_video (生产)" -ForegroundColor White
    }
    
    if ($envContent -match 'NODE_ENV=development') {
        Write-Host "  🔧 开发模式" -ForegroundColor Green
    } elseif ($envContent -match 'NODE_ENV=production') {
        Write-Host "  🚀 生产模式" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  未找到 .env 配置文件" -ForegroundColor Red
    Write-Host "  💡 运行 .\dev-local.ps1 或 .\dev-remote.ps1 初始化环境" -ForegroundColor Gray
}

# 检查后端进程
Write-Host "`n🏃 运行中的服务：" -ForegroundColor Cyan
$backendPort = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
if ($backendPort) {
    Write-Host "  ✅ 后端服务运行中 (http://localhost:3001)" -ForegroundColor Green
} else {
    Write-Host "  ⭕ 后端服务未启动" -ForegroundColor Gray
}

# 检查前端进程
$frontendPort = Get-NetTCPConnection -LocalPort 5175 -State Listen -ErrorAction SilentlyContinue
if ($frontendPort) {
    Write-Host "  ✅ 前端服务运行中 (http://localhost:5175)" -ForegroundColor Green
} else {
    Write-Host "  ⭕ 前端服务未启动" -ForegroundColor Gray
}

# 检查 PgAdmin
$pgadminPort = Get-NetTCPConnection -LocalPort 5050 -State Listen -ErrorAction SilentlyContinue
if ($pgadminPort) {
    Write-Host "  ✅ PgAdmin 运行中 (http://localhost:5050)" -ForegroundColor Green
}

# 快捷操作提示
Write-Host "`n💡 快捷操作：" -ForegroundColor Yellow
Write-Host "  .\dev-local.ps1          - 启动本地开发环境" -ForegroundColor White
Write-Host "  .\dev-local.ps1 -Tools   - 启动本地环境（含PgAdmin）" -ForegroundColor White
Write-Host "  .\dev-remote.ps1         - 切换到远程数据库" -ForegroundColor White
Write-Host "  .\sync-to-server.ps1     - 同步代码到服务器" -ForegroundColor White
Write-Host "  .\status.ps1             - 查看当前状态" -ForegroundColor White

Write-Host ""
Write-Host $separator -ForegroundColor Gray
