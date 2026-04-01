# 服务器部署配置检查工具
param(
    [string]$ServerIP = "162.14.114.224",
    [string]$ServerUser = "root",
    [int]$SSHPort = 22,
    [string]$RemoteBase = "/www/wwwroot/aigc.wenbita.cn"
)

Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host "          Server Deployment Configuration Check" -ForegroundColor White
Write-Host ("=" * 70) -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Build SSH command
$sshTarget = if ($SSHPort -ne 22) { "-p $SSHPort ${ServerUser}@${ServerIP}" } else { "${ServerUser}@${ServerIP}" }

Write-Host "`n[1/6] Testing SSH connection..." -ForegroundColor Yellow
try {
    $result = ssh $sshTarget "echo 'SSH_OK'" 2>&1
    if ($LASTEXITCODE -eq 0 -and $result -like "*SSH_OK*") {
        Write-Host "  [OK] SSH connected (${ServerUser}@${ServerIP})" -ForegroundColor Green
        if ($SSHPort -ne 22) { Write-Host "      Port: $SSHPort" -ForegroundColor Gray }
    } else {
        Write-Host "  [FAIL] SSH connection failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  [ERROR] SSH error: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n[2/6] Checking remote directory structure..." -ForegroundColor Yellow
ssh $sshTarget @"
echo "Checking: $RemoteBase"
if [ -d "$RemoteBase" ]; then
    echo "[OK] Base directory exists"
    ls -ld $RemoteBase
else
    echo "[ERROR] Base directory not found"
fi

echo ""
echo "Subdirectories:"
[ -d "$RemoteBase/backend" ] && echo "[OK] backend/" || echo "[MISSING] backend/"
[ -d "$RemoteBase/frontend" ] && echo "[OK] frontend/" || echo "[MISSING] frontend/"
[ -d "$RemoteBase/logs" ] && echo "[OK] logs/" || echo "[MISSING] logs/ (PM2 日志目录)"

echo ""
echo "Key files:"
[ -f "$RemoteBase/backend/package.json" ] && echo "[OK] package.json" || echo "[MISSING] package.json"
[ -f "$RemoteBase/ecosystem.config.js" ] && echo "[OK] ecosystem.config.js" || echo "[MISSING] ecosystem.config.js"
"@

Write-Host "`n[3/6] Checking Node.js and PM2..." -ForegroundColor Yellow
ssh $sshTarget @"
echo "Node.js version:"
node --version 2>/dev/null || echo "Not installed"
echo "npm version:"
npm --version 2>/dev/null || echo "Not installed"
echo ""
echo "PM2 status:"
if command -v pm2 &> /dev/null; then
    echo "[OK] PM2 installed"
    pm2 list 2>/dev/null | head -10
else
    echo "[WARN] PM2 not installed"
fi
"@

Write-Host "`n[4/6] Checking Nginx configuration..." -ForegroundColor Yellow
ssh $sshTarget @"
echo "Searching for Nginx config..."
for conf in "/etc/nginx/conf.d/aigc.wenbita.cn.conf" "/etc/nginx/sites-enabled/aigc.wenbita.cn" "/www/server/panel/vhost/nginx/aigc.wenbita.cn.conf"; do
    if [ -f "\$conf" ]; then
        echo "[FOUND] \$conf"
        nginx -t 2>&1 | grep -E "(successful|failed)"
        break
    fi
done
echo ""
echo "Nginx process:"
ps aux | grep nginx | grep -v grep | head -3
"@

Write-Host "`n[5/6] Checking local configuration files..." -ForegroundColor Yellow
$configFiles = @(
    ".\backend\.env.local",
    ".\backend\.env.remote",
    ".\ecosystem.config.js",
    ".\deploy\nginx.prod.conf"
)

foreach ($file in $configFiles) {
    if (Test-Path $file) {
        Write-Host "  [OK] $file" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] $file" -ForegroundColor Red
    }
}

Write-Host "`n[6/6] Checking package-lock.json..." -ForegroundColor Yellow
if (Test-Path "backend\package-lock.json") {
    Write-Host "  [OK] backend/package-lock.json" -ForegroundColor Green
} else {
    Write-Host "  [WARN] backend/package-lock.json 缺失（建议生成以使用 npm ci）" -ForegroundColor Yellow
}
if (Test-Path "frontend\package-lock.json") {
    Write-Host "  [OK] frontend/package-lock.json" -ForegroundColor Green
} else {
    Write-Host "  [WARN] frontend/package-lock.json 缺失（建议生成以使用 npm ci）" -ForegroundColor Yellow
}

Write-Host "`nConfiguration Summary" -ForegroundColor White
Write-Host ("=" * 70) -ForegroundColor Cyan
$portInfo = if ($SSHPort -ne 22) { ":$SSHPort" } else { "" }
Write-Host "Server:         ${ServerUser}@${ServerIP}${portInfo}" -ForegroundColor White
Write-Host "Remote Base:    $RemoteBase" -ForegroundColor White
Write-Host "Backend Path:   $RemoteBase/backend" -ForegroundColor White
Write-Host "Frontend Path:  $RemoteBase/frontend" -ForegroundColor White
Write-Host "Web Root:       $RemoteBase/dist (Nginx root)" -ForegroundColor White

Write-Host "`nTo deploy, run:" -ForegroundColor Yellow
Write-Host "  .\sync-to-server.ps1" -ForegroundColor Cyan
Write-Host "  .\deploy.ps1" -ForegroundColor Cyan
