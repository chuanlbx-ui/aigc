# deploy.ps1 - 一键部署脚本：本地 -> GitHub -> 服务器
param(
    [string]$ServerIP = "162.14.114.224",
    [string]$ServerUser = "root",
    [string]$RemoteBase = "/www/wwwroot/aigc.wenbita.cn",
    [int]$SSHPort = 22,
    [string]$CommitMessage = "",
    [switch]$PushOnly,
    [switch]$DeployOnly,
    [switch]$SkipCommit
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "[Deploy] 本地 -> GitHub -> 服务器" -ForegroundColor Green
Write-Host "------------------------------------" -ForegroundColor DarkGray

# --- 阶段一：推送到 GitHub ---
if (-not $DeployOnly) {
    Write-Host ""
    Write-Host "[1/3] 推送代码到 GitHub..." -ForegroundColor Cyan

    $gitStatus = git status --porcelain
    if ($gitStatus -and -not $SkipCommit) {
        if (-not $CommitMessage) {
            $CommitMessage = Read-Host "  请输入提交信息（留空使用默认）"
            if (-not $CommitMessage) {
                $CommitMessage = "deploy: 更新代码 $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
            }
        }
        Write-Host "  -> git commit: $CommitMessage" -ForegroundColor Gray
        git add -A
        git commit -m $CommitMessage
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERROR] git commit 失败" -ForegroundColor Red
            exit 1
        }
    }

    Write-Host "  -> git push origin main" -ForegroundColor Gray
    git push origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] git push 失败" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] 代码已推送到 GitHub" -ForegroundColor Green
}

if ($PushOnly) {
    Write-Host "[OK] 已完成推送，跳过服务器部署" -ForegroundColor Green
    exit 0
}

# --- 阶段二：服务器拉取并重启 ---
Write-Host ""
Write-Host "[2/3] 连接服务器执行部署..." -ForegroundColor Cyan

$sshTarget = "${ServerUser}@${ServerIP}"
$sshArgs = @()
if ($SSHPort -ne 22) {
    $sshArgs += "-p"
    $sshArgs += "$SSHPort"
}
$sshArgs += $sshTarget

$remoteScript = @'
set -euo pipefail
cd /www/wwwroot/aigc.wenbita.cn
echo "[1] 拉取最新代码..."
git fetch origin main
git reset --hard origin/main
echo "[2] 安装后端依赖..."
cd backend
if [ -f package-lock.json ]; then
    npm ci --no-audit --no-fund
else
    npm install --no-audit --no-fund
fi
echo "[3] 生成 Prisma 客户端..."
npx prisma generate
echo "[4] 部署数据库迁移..."
npx prisma migrate deploy || echo "[WARN] 数据库迁移失败，继续部署..."
echo "[5] 构建后端..."
npm run build
echo "[6] 清理开发依赖..."
npm prune --production
echo "[7] 重启 PM2 服务..."
if pm2 list | grep -q remotion-backend; then
    pm2 reload /www/wwwroot/aigc.wenbita.cn/ecosystem.config.js --env production
else
    pm2 start /www/wwwroot/aigc.wenbita.cn/ecosystem.config.js --env production
fi
pm2 save
echo "[OK] 服务器部署完成"
pm2 list | grep remotion-backend
'@

ssh @sshArgs $remoteScript

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] 服务器部署失败" -ForegroundColor Red
    exit 1
}

# --- 阶段三：完成 ---
Write-Host ""
Write-Host "[3/3] 验证部署..." -ForegroundColor Cyan
Write-Host "  -> 访问 https://aigc.wenbita.cn 确认服务正常" -ForegroundColor Gray
Write-Host ""
Write-Host "[OK] 部署完成！" -ForegroundColor Green
Write-Host "     https://aigc.wenbita.cn" -ForegroundColor Cyan
Write-Host ""
Write-Host "用法示例：" -ForegroundColor Yellow
Write-Host "  .\deploy.ps1                          # 完整部署" -ForegroundColor Gray
Write-Host "  .\deploy.ps1 -CommitMessage 'fix: x'  # 指定提交信息" -ForegroundColor Gray
Write-Host "  .\deploy.ps1 -SkipCommit              # 跳过 commit" -ForegroundColor Gray
Write-Host "  .\deploy.ps1 -PushOnly                # 只推送 GitHub" -ForegroundColor Gray
Write-Host "  .\deploy.ps1 -DeployOnly              # 只部署服务器" -ForegroundColor Gray
