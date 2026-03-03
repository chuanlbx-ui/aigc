# 服务器配置检查脚本
Write-Host "Checking server deployment configuration..." -ForegroundColor Green
Write-Host ("=" * 60) -ForegroundColor Gray

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Configuration
$serverIP = "162.14.114.224"
$serverUser = "root"
$remoteBase = "/www/wwwroot/aigc.wenbita.cn"

Write-Host "`n[1] Testing SSH connection..." -ForegroundColor Cyan
try {
    ssh ${serverUser}@${serverIP} "echo 'SSH OK'" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] SSH connected (${serverUser}@${serverIP})" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] SSH connection failed" -ForegroundColor Red
    }
} catch {
    Write-Host "  [ERROR] SSH error: $_" -ForegroundColor Red
}

Write-Host "`n[2] Checking remote directory structure..." -ForegroundColor Cyan
ssh ${serverUser}@${serverIP} @"
echo "Base path: $remoteBase"
if [ -d "$remoteBase" ]; then
    echo "[OK] Base directory exists"
    [ -d "$remoteBase/backend" ] && echo "[OK] backend/ exists" || echo "[MISSING] backend/"
    [ -d "$remoteBase/frontend" ] && echo "[OK] frontend/ exists" || echo "[MISSING] frontend/"
    command -v pm2 >/dev/null && echo "[OK] PM2 installed" || echo "[WARN] PM2 not installed"
    [ -f /etc/nginx/conf.d/aigc.wenbita.cn.conf ] && echo "[OK] Nginx config found" || echo "[INFO] Check Nginx config manually"
else
    echo "[ERROR] Base directory not found"
fi
"@

Write-Host "`n[3] Checking local environment..." -ForegroundColor Cyan
$checks = @{
    "Node.js" = "node"
    "npm" = "npm"
    "Git" = "git"
    "SCP" = "scp"
}

foreach ($check in $checks.GetEnumerator()) {
    if (Get-Command $check.Value -ErrorAction SilentlyContinue) {
        Write-Host "  [OK] $($check.Key) available" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] $($check.Key)" -ForegroundColor Red
    }
}

Write-Host "`n[4] Checking config files..." -ForegroundColor Cyan
if (Test-Path ".\backend\.env.local") {
    Write-Host "  [OK] .env.local exists" -ForegroundColor Green
} else {
    Write-Host "  [MISSING] .env.local" -ForegroundColor Red
}

if (Test-Path ".\backend\.env.remote") {
    Write-Host "  [OK] .env.remote exists" -ForegroundColor Green
} else {
    Write-Host "  [MISSING] .env.remote" -ForegroundColor Red
}

Write-Host "`n[5] Deployment parameters:" -ForegroundColor Cyan
Write-Host "  Server IP:      $serverIP" -ForegroundColor White
Write-Host "  Server User:    $serverUser" -ForegroundColor White
Write-Host "  Remote Base:    $remoteBase" -ForegroundColor White
Write-Host "  Backend Path:   $remoteBase/backend" -ForegroundColor White
Write-Host "  Frontend Path:  $remoteBase/frontend" -ForegroundColor White

Write-Host "`n" + ("=" * 60) -ForegroundColor Gray
Write-Host "Run '.\sync-to-server.ps1' to deploy" -ForegroundColor Yellow
