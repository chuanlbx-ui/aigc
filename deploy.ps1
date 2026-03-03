# 一键部署脚本：本地 → GitHub → 服务器
# 工作流：git push origin main → SSH 到服务器执行 git pull → pm2 restart
param(
    [string]$ServerIP = "162.14.114.224",
    [string]$ServerUser = "root",
    [string]$RemoteBase = "/www/wwwroot/aigc.wenbita.cn",
    [int]$SSHPort = 22,
    [string]$CommitMessage = "",
    [switch]$PushOnly,      # 只推送到 GitHub，不部署服务器
    [switch]$DeployOnly,    # 只部署服务器，不推送 GitHub
    [switch]$SkipCommit     # 跳过 git commit（已手动提交）
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "🚀 一键部署：本地 → GitHub → 服务器" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

# ─── 阶段一：推送到 GitHub ───────────────────────────────────────────────────
if (-not $DeployOnly) {
    Write-Host "`n📤 [1/3] 推送代码到 GitHub..." -ForegroundColor Cyan

    # 检查是否有未提交的变更
    $gitStatus = git status --porcelain
    if ($gitStatus -and -not $SkipCommit) {
        if (-not $CommitMessage) {
            $CommitMessage = Read-Host "  请输入提交信息（留空使用默认）"
            if (-not $CommitMessage) {
                $CommitMessage = "deploy: 更新代码 $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
            }
        }
        Write-Host "  → git add & commit: $CommitMessage" -ForegroundColor Gray
        git add -A
        git commit -m $CommitMessage
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ git commit 失败" -ForegroundColor Red
            exit 1
        }
    }

    Write-Host "  → git push origin main" -ForegroundColor Gray
    git push origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ git push 失败，请检查网络或 GitHub 权限" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ 代码已推送到 GitHub" -ForegroundColor Green
}

if ($PushOnly) {
    Write-Host "`n✅ 已完成推送，跳过服务器部署" -ForegroundColor Green
    exit 0
}

# ─── 阶段二：服务器拉取并重启 ────────────────────────────────────────────────
Write-Host "`n🖥️  [2/3] 连接服务器执行部署..." -ForegroundColor Cyan

$sshTarget = "${ServerUser}@${ServerIP}"
$sshPortParam = if ($SSHPort -ne 22) { @("-p", "$SSHPort") } else { @() }

$remoteScript = @"
set -e
cd ${RemoteBase}

echo "📥 拉取最新代码..."
git pull origin main

echo ""
echo "📦 安装后端依赖..."
cd backend
npm install --production

echo ""
echo "🛠️  生成 Prisma 客户端..."
npx prisma generate

echo ""
echo "🏗️  构建后端..."
npm run build

echo ""
echo "🔄 重启 PM2 服务..."
if pm2 list | grep -q remotion-backend; then
    pm2 restart remotion-backend
else
    pm2 start dist/index.js --name remotion-backend
fi
pm2 save

echo ""
echo "✅ 服务器部署完成！"
pm2 list | grep remotion-backend
"@

ssh @sshPortParam $sshTarget $remoteScript

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ 服务器部署失败" -ForegroundColor Red
    exit 1
}

# ─── 阶段三：验证 ────────────────────────────────────────────────────────────
Write-Host "`n🔍 [3/3] 验证部署..." -ForegroundColor Cyan
Write-Host "  → 访问 https://aigc.wenbita.cn 确认服务正常" -ForegroundColor Gray

Write-Host "`n✅ 部署完成！" -ForegroundColor Green
Write-Host "🌐 https://aigc.wenbita.cn" -ForegroundColor Cyan

Write-Host "`n💡 使用示例：" -ForegroundColor Yellow
Write-Host "  .\deploy.ps1                                    # 完整部署（提交+推送+服务器）" -ForegroundColor Gray
Write-Host "  .\deploy.ps1 -CommitMessage 'fix: xxx'         # 指定提交信息" -ForegroundColor Gray
Write-Host "  .\deploy.ps1 -SkipCommit                       # 跳过 commit（已手动提交）" -ForegroundColor Gray
Write-Host "  .\deploy.ps1 -PushOnly                         # 只推送到 GitHub" -ForegroundColor Gray
Write-Host "  .\deploy.ps1 -DeployOnly                       # 只部署服务器（不推送）" -ForegroundColor Gray
