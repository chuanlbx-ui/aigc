# 远程数据库开发环境启动脚本
param(
    [switch]$StopLocal
)

Write-Host "🌐 切换到远程数据库环境..." -ForegroundColor Green

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# 1. 停止本地 PostgreSQL（如果需要）
if ($StopLocal) {
    Write-Host "`n🛑 停止本地 PostgreSQL..." -ForegroundColor Yellow
    docker-compose -f docker-compose.dev.yml down
}

# 2. 应用远程环境配置
Write-Host "`n🔧 配置远程环境变量..." -ForegroundColor Cyan
Copy-Item -Path ".\backend\.env.remote" -Destination ".\backend\.env" -Force
Write-Host "✅ 使用远程数据库配置 (162.14.114.224)" -ForegroundColor Green

# 3. 测试远程数据库连接
Write-Host "`n🔍 测试远程数据库连接..." -ForegroundColor Cyan
Set-Location ".\backend"
$testResult = npx prisma db pull --force 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 远程数据库连接成功" -ForegroundColor Green
} else {
    Write-Host "⚠️  远程数据库连接失败，请检查网络和配置" -ForegroundColor Red
    Write-Host $testResult -ForegroundColor Red
}
Set-Location ".."

# 4. 显示启动说明
Write-Host "`n✨ 环境准备完成！" -ForegroundColor Green
Write-Host "`n📝 请在两个终端分别执行：" -ForegroundColor Yellow
Write-Host "  终端1: cd backend; npm run dev   # 启动后端" -ForegroundColor White
Write-Host "  终端2: cd frontend; npm run dev  # 启动前端" -ForegroundColor White
Write-Host "`n🌐 访问地址：" -ForegroundColor Cyan
Write-Host "  前端: http://localhost:5175" -ForegroundColor White
Write-Host "  后端: http://localhost:3001" -ForegroundColor White
Write-Host "  远程数据库: 162.14.114.224:5432" -ForegroundColor White

Write-Host "`n💡 提示：" -ForegroundColor Yellow
Write-Host "  - 当前使用远程生产数据库，请谨慎操作" -ForegroundColor Gray
Write-Host "  - 使用 .\dev-local.ps1 可切换回本地数据库" -ForegroundColor Gray
