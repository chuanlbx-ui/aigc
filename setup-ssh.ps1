# SSH 连接配置辅助脚本
# 用于快速配置 SSH 密钥认证
param(
    [string]$ServerIP = "162.14.114.224",
    [string]$ServerUser = "root",
    [string]$KeyName = "aigc_deploy",
    [switch]$TestOnly  # 仅测试连接，不配置
)

$ErrorActionPreference = "Stop"

Write-Host "🔐 SSH 连接配置辅助工具" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

$sshDir = "$env:USERPROFILE\.ssh"
$keyPath = "$sshDir\$KeyName"
$pubKeyPath = "$keyPath.pub"

# ─── 测试连接 ────────────────────────────────────────────────────────────────
Write-Host "`n[1/4] 测试 SSH 连接..." -ForegroundColor Cyan

$testResult = ssh -o ConnectTimeout=5 -o BatchMode=yes "${ServerUser}@${ServerIP}" "echo SSH_OK" 2>&1

if ($testResult -like "*SSH_OK*") {
    Write-Host "  ✅ SSH 连接成功！" -ForegroundColor Green
    Write-Host "  → 已配置密钥认证，无需额外配置" -ForegroundColor Gray

    if ($TestOnly) {
        exit 0
    }

    $continue = Read-Host "`n是否继续配置新密钥？(y/N)"
    if ($continue -ne "y") {
        Write-Host "  → 跳过配置" -ForegroundColor Gray
        exit 0
    }
} else {
    Write-Host "  ❌ SSH 连接失败" -ForegroundColor Red
    Write-Host "  → 需要配置 SSH 密钥或密码认证" -ForegroundColor Yellow

    if ($TestOnly) {
        Write-Host "`n💡 解决方案：" -ForegroundColor Yellow
        Write-Host "  1. 运行此脚本不带 -TestOnly 参数来配置 SSH 密钥" -ForegroundColor Gray
        Write-Host "  2. 或手动使用密码登录：ssh ${ServerUser}@${ServerIP}" -ForegroundColor Gray
        exit 1
    }
}

# ─── 检查/生成密钥 ───────────────────────────────────────────────────────────
Write-Host "`n[2/4] 检查 SSH 密钥..." -ForegroundColor Cyan

if (-not (Test-Path $sshDir)) {
    Write-Host "  → 创建 .ssh 目录" -ForegroundColor Gray
    New-Item -ItemType Directory -Path $sshDir -Force | Out-Null
}

if (Test-Path $keyPath) {
    Write-Host "  ✅ 密钥已存在: $keyPath" -ForegroundColor Green
    $useExisting = Read-Host "  是否使用现有密钥？(Y/n)"

    if ($useExisting -eq "n") {
        Write-Host "  → 生成新密钥..." -ForegroundColor Gray
        ssh-keygen -t ed25519 -C "deploy@aigc" -f $keyPath -N '""'
        Write-Host "  ✅ 新密钥已生成" -ForegroundColor Green
    }
} else {
    Write-Host "  → 生成新密钥..." -ForegroundColor Gray
    ssh-keygen -t ed25519 -C "deploy@aigc" -f $keyPath -N '""'
    Write-Host "  ✅ 密钥已生成: $keyPath" -ForegroundColor Green
}

# ─── 上传公钥到服务器 ────────────────────────────────────────────────────────
Write-Host "`n[3/4] 上传公钥到服务器..." -ForegroundColor Cyan

if (-not (Test-Path $pubKeyPath)) {
    Write-Host "  ❌ 公钥文件不存在: $pubKeyPath" -ForegroundColor Red
    exit 1
}

$pubKey = Get-Content $pubKeyPath -Raw

Write-Host "  → 公钥内容:" -ForegroundColor Gray
Write-Host "    $pubKey" -ForegroundColor DarkGray

Write-Host "`n  ⚠️  需要密码认证来上传公钥" -ForegroundColor Yellow
Write-Host "  → 请输入服务器密码（如果有）" -ForegroundColor Gray

$uploadCommand = @"
mkdir -p ~/.ssh && \
chmod 700 ~/.ssh && \
echo '$pubKey' >> ~/.ssh/authorized_keys && \
chmod 600 ~/.ssh/authorized_keys && \
echo 'SSH_KEY_UPLOADED'
"@

try {
    $uploadResult = ssh "${ServerUser}@${ServerIP}" $uploadCommand 2>&1

    if ($uploadResult -like "*SSH_KEY_UPLOADED*") {
        Write-Host "  ✅ 公钥已上传到服务器" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  上传结果不确定" -ForegroundColor Yellow
        Write-Host "  → 输出: $uploadResult" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ❌ 上传失败: $_" -ForegroundColor Red
    Write-Host "`n💡 手动上传方法：" -ForegroundColor Yellow
    Write-Host "  1. 复制公钥内容：" -ForegroundColor Gray
    Write-Host "     Get-Content $pubKeyPath" -ForegroundColor DarkGray
    Write-Host "  2. SSH 登录服务器：" -ForegroundColor Gray
    Write-Host "     ssh ${ServerUser}@${ServerIP}" -ForegroundColor DarkGray
    Write-Host "  3. 添加到 authorized_keys：" -ForegroundColor Gray
    Write-Host "     mkdir -p ~/.ssh && echo '公钥内容' >> ~/.ssh/authorized_keys" -ForegroundColor DarkGray
    exit 1
}

# ─── 验证连接 ────────────────────────────────────────────────────────────────
Write-Host "`n[4/4] 验证 SSH 连接..." -ForegroundColor Cyan

Start-Sleep -Seconds 1

$verifyResult = ssh -i $keyPath -o ConnectTimeout=5 "${ServerUser}@${ServerIP}" "echo SSH_OK" 2>&1

if ($verifyResult -like "*SSH_OK*") {
    Write-Host "  ✅ SSH 密钥认证成功！" -ForegroundColor Green
} else {
    Write-Host "  ❌ SSH 密钥认证失败" -ForegroundColor Red
    Write-Host "  → 错误: $verifyResult" -ForegroundColor Gray
    exit 1
}

# ─── 配置 SSH config ─────────────────────────────────────────────────────────
Write-Host "`n[可选] 配置 SSH config..." -ForegroundColor Cyan

$sshConfigPath = "$sshDir\config"
$configEntry = @"

# AIGC Server
Host aigc-server
    HostName $ServerIP
    User $ServerUser
    IdentityFile $keyPath
    ServerAliveInterval 60
    ServerAliveCountMax 3
"@

if (Test-Path $sshConfigPath) {
    $existingConfig = Get-Content $sshConfigPath -Raw
    if ($existingConfig -like "*aigc-server*") {
        Write-Host "  ℹ️  SSH config 已存在 aigc-server 配置" -ForegroundColor Cyan
    } else {
        $addConfig = Read-Host "  是否添加到 SSH config？(Y/n)"
        if ($addConfig -ne "n") {
            Add-Content -Path $sshConfigPath -Value $configEntry
            Write-Host "  ✅ 已添加到 SSH config" -ForegroundColor Green
            Write-Host "  → 现在可以使用: ssh aigc-server" -ForegroundColor Gray
        }
    }
} else {
    $createConfig = Read-Host "  是否创建 SSH config？(Y/n)"
    if ($createConfig -ne "n") {
        Set-Content -Path $sshConfigPath -Value $configEntry.TrimStart()
        Write-Host "  ✅ SSH config 已创建" -ForegroundColor Green
        Write-Host "  → 现在可以使用: ssh aigc-server" -ForegroundColor Gray
    }
}

# ─── 完成 ────────────────────────────────────────────────────────────────────
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "✅ SSH 配置完成！" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

Write-Host "`n💡 下一步：" -ForegroundColor Yellow
Write-Host "  1. 验证部署配置：" -ForegroundColor Cyan
Write-Host "     .\verify-deploy.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. 配置服务器 Git：" -ForegroundColor Cyan
Write-Host "     scp setup-server-git.sh ${ServerUser}@${ServerIP}:/www/wwwroot/aigc.wenbita.cn/" -ForegroundColor Gray
Write-Host "     ssh ${ServerUser}@${ServerIP} 'cd /www/wwwroot/aigc.wenbita.cn && bash setup-server-git.sh'" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. 测试部署：" -ForegroundColor Cyan
Write-Host "     .\deploy.ps1 -DeployOnly" -ForegroundColor Gray
Write-Host ""
