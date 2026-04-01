# 代码同步到服务器脚本
param(
    [string]$ServerIP = "162.14.114.224",
    [string]$ServerUser = "root",
    [string]$RemoteBase = "/www/wwwroot/aigc.wenbita.cn",
    [int]$SSHPort = 22,
    [switch]$SkipBuild,
    [switch]$OnlyBackend,
    [switch]$OnlyFrontend,
    [switch]$SkipNginx,
    [switch]$CheckConfig
)

$RemotePath = $RemoteBase

Write-Host "🚀 同步代码到服务器..." -ForegroundColor Green

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# 1. 构建前端（如果需要）
if (-not $SkipBuild -and -not $OnlyBackend) {
    Write-Host "`n📦 构建前端..." -ForegroundColor Cyan
    Set-Location ".\frontend"
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 前端构建失败" -ForegroundColor Red
        exit 1
    }
    Set-Location ".."
}

# 2. 切换到生产环境配置
Write-Host "`n🔧 准备生产环境配置..." -ForegroundColor Cyan
Copy-Item -Path ".\backend\.env.remote" -Destination ".\backend\.env" -Force

# 3. 同步后端
if (-not $OnlyFrontend) {
    Write-Host "`n📤 上传后端代码..." -ForegroundColor Yellow
    
    # 使用 rsync 或 scp（需要安装 rsync）
    scp -r .\backend\ ${ServerUser}@${ServerIP}:${RemotePath}/
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 后端代码已上传" -ForegroundColor Green
    } else {
        Write-Host "❌ 后端代码上传失败" -ForegroundColor Red
        exit 1
    }
}

# 4. 同步前端
if (-not $OnlyBackend) {
    Write-Host "`n📤 上传前端代码..." -ForegroundColor Yellow
    
    scp -r .\frontend\ ${ServerUser}@${ServerIP}:${RemotePath}/
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 前端代码已上传" -ForegroundColor Green
    } else {
        Write-Host "❌ 前端代码上传失败" -ForegroundColor Red
        exit 1
    }
}

# 5. SSH 到服务器执行操作
Write-Host "`n🔄 在服务器上重启服务..." -ForegroundColor Yellow

# 构建 SSH 命令
$sshPortParam = if ($SSHPort -ne 22) { "-p $SSHPort" } else { "" }
$sshTarget = "${ServerUser}@${ServerIP}"
if ($sshPortParam) {
    $sshTarget = "-p $SSHPort ${ServerUser}@${ServerIP}"
}

$nginxScript = if (-not $SkipNginx) {
@"
echo "`n🌐 检查 Nginx 配置..."

NGINX_CONF=""
if [ -f /etc/nginx/conf.d/aigc.wenbita.cn.conf ]; then
    NGINX_CONF="/etc/nginx/conf.d/aigc.wenbita.cn.conf"
elif [ -f /etc/nginx/sites-enabled/aigc.wenbita.cn ]; then
    NGINX_CONF="/etc/nginx/sites-enabled/aigc.wenbita.cn"
elif [ -f /www/server/panel/vhost/nginx/aigc.wenbita.cn.conf ]; then
    NGINX_CONF="/www/server/panel/vhost/nginx/aigc.wenbita.cn.conf"
fi

if [ -n "\$NGINX_CONF" ]; then
    echo "  → 找到 Nginx 配置文件：\$NGINX_CONF"
    nginx -t && nginx -s reload && echo "✅ Nginx 已重启"
else
    echo "ℹ️  未找到 Nginx 配置文件，跳过重启"
fi
"@
} else {
    'echo "ℹ️  跳过 Nginx 重启"'
}

$remoteCommands = @"
set -euo pipefail
cd ${RemoteBase}

echo "📦 当前目录结构："
ls -la

# 安装后端依赖（如果需要）
cd backend
echo "`n🔧 安装后端依赖..."
if [ -f package-lock.json ]; then
    npm ci --no-audit --no-fund
else
    npm install --no-audit --no-fund
fi

echo "`n🛠️ 生成 Prisma 客户端..."
npx prisma generate

# 构建后端（如果存在构建脚本）
if [ -f package.json ]; then
    if grep -q '"build"' package.json 2>/dev/null; then
        echo "`n🏗️  构建后端..."
        npm run build
    else
        echo "`nℹ️  package.json 中未找到 build 脚本，跳过构建"
    fi
fi

echo "`n🧹 清理后端开发依赖..."
npm prune --production

# 启动后端（使用 PM2）
echo "`n🚀 启动后端服务..."
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q remotion-backend; then
        echo "  → 平滑重启 PM2 进程"
        pm2 reload ecosystem.config.js --env production
    else
        echo "  → 创建新的 PM2 进程"
        pm2 start ecosystem.config.js --env production
    fi
    pm2 save
    echo "✅ PM2 进程已保存"
else
    echo "⚠️  未安装 PM2，使用 nohup 启动"
    pkill -f 'node.*dist/index.js' || true
    cd ${RemoteBase}/backend
    mkdir -p logs
    nohup npm start > logs/backend.log 2>&1 &
    echo \$! > .pm2/remotion-backend.pid
fi

$nginxScript

echo "`n✅ 部署完成！"
"@

ssh ${sshTarget} $remoteCommands

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ 部署完成！" -ForegroundColor Green
    Write-Host "🌐 访问: https://aigc.wenbita.cn" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ 部署过程中出现错误" -ForegroundColor Red
}

Write-Host "`n💡 使用示例：" -ForegroundColor Yellow
Write-Host "  .\sync-to-server.ps1                    # 完整同步" -ForegroundColor Gray
Write-Host "  .\sync-to-server.ps1 -OnlyBackend      # 只同步后端" -ForegroundColor Gray
Write-Host "  .\sync-to-server.ps1 -OnlyFrontend     # 只同步前端" -ForegroundColor Gray
Write-Host "  .\sync-to-server.ps1 -SkipBuild        # 跳过构建" -ForegroundColor Gray
Write-Host "  .\sync-to-server.ps1 -SkipNginx        # 跳过 Nginx 重启" -ForegroundColor Gray
Write-Host "  .\sync-to-server.ps1 -CheckConfig      # 仅检查配置" -ForegroundColor Gray
Write-Host "  .\sync-to-server.ps1 -ServerUser www   # 指定用户" -ForegroundColor Gray
Write-Host "  .\sync-to-server.ps1 -SSHPort 2222     # 指定 SSH 端口" -ForegroundColor Gray
