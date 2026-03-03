# 从 GitHub 同步代码到本地
param(
    [string]$RepoURL = "",
    [switch]$Force
)

Write-Host "🔄 从 GitHub 同步代码..." -ForegroundColor Green

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# 检查是否已配置 Git 仓库
if (-not (Test-Path ".git")) {
    Write-Host "`n⚠️  未检测到 Git 仓库" -ForegroundColor Yellow
    
    if ($RepoURL) {
        $repoUrlToUse = $RepoURL
    } else {
        $repoUrlToUse = Read-Host "请输入 GitHub 仓库地址 (例如：https://github.com/username/repo.git)"
    }
    
    Write-Host "`n📦 初始化 Git 仓库..." -ForegroundColor Cyan
    git init
    
    Write-Host "🔗 添加远程仓库..." -ForegroundColor Cyan
    git remote add origin $repoUrlToUse
    
} else {
    # 获取远程仓库地址
    $remoteUrl = git remote get-url origin 2>$null
    
    if (-not $remoteUrl) {
        Write-Host "❌ 未找到远程仓库配置" -ForegroundColor Red
        exit 1
    }
    
    $repoUrlToUse = $remoteUrl
    Write-Host "`n✅ 使用远程仓库：$repoUrlToUse" -ForegroundColor Green
}

# 获取远程分支列表
Write-Host "`n📋 获取远程分支信息..." -ForegroundColor Cyan
git fetch origin

# 查看当前分支
$currentBranch = git branch --show-current 2>$null
if (-not $currentBranch) {
    $currentBranch = "main"
    Write-Host "ℹ️  当前不在任何分支上，将切换到 main 分支" -ForegroundColor Yellow
} else {
    Write-Host "ℹ️  当前分支：$currentBranch" -ForegroundColor Cyan
}

# 强制覆盖本地修改
if ($Force) {
    Write-Host "`n⚠️  警告：即将强制覆盖本地修改！" -ForegroundColor Yellow
    $confirm = Read-Host "确定要继续吗？所有未提交的更改都将丢失 (y/n)"
    
    if ($confirm -ne "y") {
        Write-Host "❌ 操作已取消" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "`n🗑️  重置本地修改..." -ForegroundColor Cyan
    git reset --hard HEAD
    git clean -fd
    
    Write-Host "📥 拉取最新代码..." -ForegroundColor Cyan
    git pull origin $currentBranch --force
    
    Write-Host "✅ 代码同步完成！" -ForegroundColor Green
} else {
    # 检查是否有未提交的更改
    $status = git status --porcelain
    
    if ($status) {
        Write-Host "`n⚠️  检测到未提交的本地修改：" -ForegroundColor Yellow
        Write-Host $status -ForegroundColor Yellow
        Write-Host ""
        
        $choice = Read-Host "请选择处理方式：`n  1) 暂存并提交本地修改 `n  2) 丢弃本地修改（危险）`n  3) 取消操作"
        
        switch ($choice) {
            "1" {
                Write-Host "`n💾 提交本地修改..." -ForegroundColor Cyan
                $message = Read-Host "输入提交信息"
                git add .
                git commit -m $message
                
                Write-Host "📥 拉取远程代码..." -ForegroundColor Cyan
                git pull origin $currentBranch --rebase
            }
            "2" {
                $confirm = Read-Host "确定要丢弃所有本地修改吗？此操作不可恢复 (y/n)"
                if ($confirm -eq "y") {
                    Write-Host "🗑️  重置本地修改..." -ForegroundColor Cyan
                    git reset --hard HEAD
                    git clean -fd
                    
                    Write-Host "📥 拉取最新代码..." -ForegroundColor Cyan
                    git pull origin $currentBranch --force
                } else {
                    Write-Host "❌ 操作已取消" -ForegroundColor Red
                    exit 1
                }
            }
            default {
                Write-Host "❌ 操作已取消" -ForegroundColor Red
                exit 1
            }
        }
    } else {
        Write-Host "📥 拉取最新代码..." -ForegroundColor Cyan
        git pull origin $currentBranch
    }
    
    Write-Host "✅ 代码同步完成！" -ForegroundColor Green
}

Write-Host "`n📊 当前状态：" -ForegroundColor Cyan
git status

Write-Host "`n💡 提示：" -ForegroundColor Yellow
Write-Host "  - 使用 'git log --oneline -5' 查看最近的提交" -ForegroundColor Gray
Write-Host "  - 使用 'git diff' 查看本地与远程的差异" -ForegroundColor Gray
Write-Host "  - 使用 '.\sync-from-github.ps1 -Force' 强制同步（丢弃本地修改）" -ForegroundColor Gray
