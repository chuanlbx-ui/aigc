# 部署流程验证脚本
# 用于测试 Git 工作流和部署配置是否正确
param(
    [string]$ServerIP = "162.14.114.224",
    [string]$ServerUser = "root",
    [string]$RemoteBase = "/www/wwwroot/aigc.wenbita.cn",
    [int]$SSHPort = 22
)

$ErrorActionPreference = "Continue"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "🔍 部署流程验证" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

$checks = @()

# ─── 检查 1：本地 Git 配置 ───────────────────────────────────────────────────
Write-Host "`n[1/7] 检查本地 Git 配置..." -ForegroundColor Cyan

$currentBranch = git branch --show-current
if ($currentBranch -eq "main") {
    Write-Host "  ✅ 当前分支: main" -ForegroundColor Green
    $checks += @{Name="本地分支"; Status="✅"; Message="main"}
} else {
    Write-Host "  ❌ 当前分支: $currentBranch (应为 main)" -ForegroundColor Red
    $checks += @{Name="本地分支"; Status="❌"; Message="$currentBranch (应为 main)"}
}

$remoteUrl = git remote get-url origin 2>$null
if ($remoteUrl -like "*github.com/chuanlbx-ui/aigc*") {
    Write-Host "  ✅ Remote URL: $remoteUrl" -ForegroundColor Green
    $checks += @{Name="Remote URL"; Status="✅"; Message="正确"}
} else {
    Write-Host "  ❌ Remote URL: $remoteUrl" -ForegroundColor Red
    $checks += @{Name="Remote URL"; Status="❌"; Message="不正确"}
}

# ─── 检查 2：.gitignore ──────────────────────────────────────────────────────
Write-Host "`n[2/7] 检查 .gitignore..." -ForegroundColor Cyan

if (Test-Path ".gitignore") {
    $gitignoreContent = Get-Content ".gitignore" -Raw
    $requiredPatterns = @(".env.remote", "backend/.env.remote", "backend/data-export/", ".claude/")
    $missingPatterns = @()

    foreach ($pattern in $requiredPatterns) {
        if ($gitignoreContent -notlike "*$pattern*") {
            $missingPatterns += $pattern
        }
    }

    if ($missingPatterns.Count -eq 0) {
        Write-Host "  ✅ .gitignore 配置完整" -ForegroundColor Green
        $checks += @{Name=".gitignore"; Status="✅"; Message="配置完整"}
    } else {
        Write-Host "  ⚠️  .gitignore 缺少: $($missingPatterns -join ', ')" -ForegroundColor Yellow
        $checks += @{Name=".gitignore"; Status="⚠️"; Message="缺少部分规则"}
    }
} else {
    Write-Host "  ❌ .gitignore 不存在" -ForegroundColor Red
    $checks += @{Name=".gitignore"; Status="❌"; Message="不存在"}
}

# ─── 检查 3：部署脚本 ────────────────────────────────────────────────────────
Write-Host "`n[3/7] 检查部署脚本..." -ForegroundColor Cyan

$deployFiles = @("deploy.ps1", "setup-server-git.sh", ".github/workflows/deploy.yml", "ecosystem.config.js")
foreach ($file in $deployFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file 存在" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file 不存在" -ForegroundColor Red
    }
}

if ((Test-Path "deploy.ps1") -and (Test-Path "setup-server-git.sh") -and (Test-Path "ecosystem.config.js")) {
    $checks += @{Name="部署脚本"; Status="✅"; Message="完整"}
} else {
    $checks += @{Name="部署脚本"; Status="❌"; Message="缺失"}
}

# ─── 检查 4：Nginx 配置一致性 ────────────────────────────────────────────────
Write-Host "`n[4/7] 检查 Nginx 配置与部署脚本一致性..." -ForegroundColor Cyan

if (Test-Path "deploy/nginx.prod.conf") {
    $nginxContent = Get-Content "deploy/nginx.prod.conf" -Raw
    if ($nginxContent -like "*root /www/wwwroot/aigc.wenbita.cn/dist*") {
        Write-Host "  ✅ Nginx root 与部署脚本一致" -ForegroundColor Green
        $checks += @{Name="Nginx 配置"; Status="✅"; Message="root 路径一致"}
    } else {
        Write-Host "  ⚠️  Nginx root 路径可能与部署脚本不一致" -ForegroundColor Yellow
        Write-Host "     部署脚本目标: /www/wwwroot/aigc.wenbita.cn/dist" -ForegroundColor Gray
        $checks += @{Name="Nginx 配置"; Status="⚠️"; Message="root 路径可能不一致"}
    }
} else {
    Write-Host "  ℹ️  未找到 deploy/nginx.prod.conf" -ForegroundColor Gray
    $checks += @{Name="Nginx 配置"; Status="ℹ️"; Message="未找到配置文件"}
}

# ─── 检查 5：SSH 连接 ────────────────────────────────────────────────────────
Write-Host "`n[5/7] 检查 SSH 连接..." -ForegroundColor Cyan

$sshTarget = "${ServerUser}@${ServerIP}"
$sshTest = ssh -o ConnectTimeout=5 -o BatchMode=yes $sshTarget "echo 'SSH_OK'" 2>&1

if ($sshTest -like "*SSH_OK*") {
    Write-Host "  ✅ SSH 连接成功" -ForegroundColor Green
    $checks += @{Name="SSH 连接"; Status="✅"; Message="正常"}
} else {
    Write-Host "  ❌ SSH 连接失败" -ForegroundColor Red
    Write-Host "     错误: $sshTest" -ForegroundColor Gray
    Write-Host "     提示: 需要配置 SSH 密钥或密码认证" -ForegroundColor Yellow
    $checks += @{Name="SSH 连接"; Status="❌"; Message="失败"}
}

# ─── 检查 6：服务器 Git 配置 ─────────────────────────────────────────────────
Write-Host "`n[6/7] 检查服务器 Git 配置..." -ForegroundColor Cyan

if ($sshTest -like "*SSH_OK*") {
    $serverGitCheck = ssh $sshTarget "cd $RemoteBase && git remote get-url origin 2>&1 || echo 'NO_GIT'"

    if ($serverGitCheck -like "*github.com/chuanlbx-ui/aigc*") {
        Write-Host "  ✅ 服务器 Git 已配置" -ForegroundColor Green
        $checks += @{Name="服务器 Git"; Status="✅"; Message="已配置"}

        # 检查服务器分支
        $serverBranch = ssh $sshTarget "cd $RemoteBase && git branch --show-current 2>&1"
        if ($serverBranch -eq "main") {
            Write-Host "  ✅ 服务器分支: main" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  服务器分支: $serverBranch (应为 main)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ❌ 服务器 Git 未配置" -ForegroundColor Red
        Write-Host "     提示: 需要在服务器上执行 setup-server-git.sh" -ForegroundColor Yellow
        $checks += @{Name="服务器 Git"; Status="❌"; Message="未配置"}
    }
} else {
    Write-Host "  ⏭️  跳过（SSH 连接失败）" -ForegroundColor Gray
    $checks += @{Name="服务器 Git"; Status="⏭️"; Message="无法检查"}
}

# ─── 检查 7：GitHub Actions Secrets ──────────────────────────────────────────
Write-Host "`n[7/7] 检查 GitHub Actions 配置..." -ForegroundColor Cyan

if (Test-Path ".github/workflows/deploy.yml") {
    Write-Host "  ✅ deploy.yml 存在" -ForegroundColor Green
    Write-Host "  ℹ️  需要手动配置 GitHub Secrets:" -ForegroundColor Cyan
    Write-Host "     - SERVER_HOST: $ServerIP" -ForegroundColor Gray
    Write-Host "     - SERVER_USER: $ServerUser" -ForegroundColor Gray
    Write-Host "     - SSH_PRIVATE_KEY: (SSH 私钥)" -ForegroundColor Gray
    Write-Host "     配置地址: https://github.com/chuanlbx-ui/aigc/settings/secrets/actions" -ForegroundColor Gray
    $checks += @{Name="GitHub Actions"; Status="ℹ️"; Message="需手动配置 Secrets"}
} else {
    Write-Host "  ❌ deploy.yml 不存在" -ForegroundColor Red
    $checks += @{Name="GitHub Actions"; Status="❌"; Message="配置缺失"}
}

# ─── package-lock.json 建议 ─────────────────────────────────────────────────
Write-Host "`n[建议] 检查 package-lock.json..." -ForegroundColor Cyan
$hasBackendLock = Test-Path "backend/package-lock.json"
$hasFrontendLock = Test-Path "frontend/package-lock.json"
if ($hasBackendLock -and $hasFrontendLock) {
    Write-Host "  ✅ 前后端均已生成 package-lock.json" -ForegroundColor Green
} else {
    if (-not $hasBackendLock) {
        Write-Host "  ⚠️  backend 缺少 package-lock.json，建议进入 backend 目录执行 npm install 后提交" -ForegroundColor Yellow
    }
    if (-not $hasFrontendLock) {
        Write-Host "  ⚠️  frontend 缺少 package-lock.json，建议进入 frontend 目录执行 npm install 后提交" -ForegroundColor Yellow
    }
}

# ─── 汇总报告 ────────────────────────────────────────────────────────────────
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "📊 检查汇总" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

foreach ($check in $checks) {
    Write-Host "  $($check.Status) $($check.Name): $($check.Message)" -ForegroundColor White
}

$passCount = ($checks | Where-Object { $_.Status -eq "✅" }).Count
$totalCount = $checks.Count

Write-Host "`n通过: $passCount / $totalCount" -ForegroundColor $(if ($passCount -eq $totalCount) { "Green" } else { "Yellow" })

# ─── 下一步建议 ──────────────────────────────────────────────────────────────
Write-Host "`n💡 下一步操作建议：" -ForegroundColor Yellow

$failedChecks = $checks | Where-Object { $_.Status -eq "❌" }
if ($failedChecks.Count -gt 0) {
    Write-Host ""
    foreach ($check in $failedChecks) {
        switch ($check.Name) {
            "SSH 连接" {
                Write-Host "  1️⃣  配置 SSH 密钥或密码认证" -ForegroundColor Cyan
                Write-Host "     参考: SERVER_SETUP.md 步骤二" -ForegroundColor Gray
            }
            "服务器 Git" {
                Write-Host "  2️⃣  在服务器上执行 setup-server-git.sh" -ForegroundColor Cyan
                Write-Host "     scp setup-server-git.sh ${ServerUser}@${ServerIP}:${RemoteBase}/" -ForegroundColor Gray
                Write-Host "     ssh ${ServerUser}@${ServerIP} 'cd ${RemoteBase} && bash setup-server-git.sh'" -ForegroundColor Gray
            }
            "GitHub Actions" {
                Write-Host "  3️⃣  配置 GitHub Secrets（可选）" -ForegroundColor Cyan
                Write-Host "     参考: SERVER_SETUP.md 步骤二" -ForegroundColor Gray
            }
        }
    }
} else {
    Write-Host "  ✅ 所有检查通过！可以开始使用部署流程" -ForegroundColor Green
    Write-Host ""
    Write-Host "  测试部署:" -ForegroundColor Cyan
    Write-Host "    .\deploy.ps1 -CommitMessage 'test: 测试部署'" -ForegroundColor Gray
}

Write-Host ""
