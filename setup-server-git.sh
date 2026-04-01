# 服务器 Git 初始化脚本
# 在服务器上执行此脚本以配置 Git 工作流
# 使用方法：将此脚本上传到服务器，然后执行 bash setup-server-git.sh

set -euo pipefail

REMOTE_BASE="/www/wwwroot/aigc.wenbita.cn"
GITHUB_REPO="https://github.com/chuanlbx-ui/aigc.git"

echo "🚀 开始配置服务器 Git 工作流..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查目录是否存在
if [ ! -d "$REMOTE_BASE" ]; then
    echo "❌ 目录不存在: $REMOTE_BASE"
    exit 1
fi

cd "$REMOTE_BASE"
echo "📂 当前目录: $(pwd)"

# 检查是否已经是 Git 仓库
if [ -d ".git" ]; then
    echo "ℹ️  已存在 .git 目录"

    # 检查 remote
    if git remote | grep -q "origin"; then
        CURRENT_REMOTE=$(git remote get-url origin)
        echo "  → 当前 remote: $CURRENT_REMOTE"

        if [ "$CURRENT_REMOTE" != "$GITHUB_REPO" ]; then
            echo "⚠️  remote URL 不匹配，更新中..."
            git remote set-url origin "$GITHUB_REPO"
            echo "✅ remote URL 已更新"
        else
            echo "✅ remote URL 正确"
        fi
    else
        echo "  → 添加 remote..."
        git remote add origin "$GITHUB_REPO"
        echo "✅ remote 已添加"
    fi
else
    echo "📦 初始化 Git 仓库..."
    git init
    git remote add origin "$GITHUB_REPO"
    echo "✅ Git 仓库已初始化"
fi

# 检查当前分支
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
if [ -z "$CURRENT_BRANCH" ]; then
    echo "📥 首次拉取代码..."
    git fetch origin main
    git checkout -b main origin/main
    echo "✅ 已切换到 main 分支"
elif [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  当前分支: $CURRENT_BRANCH，切换到 main..."
    git checkout main || git checkout -b main origin/main
    echo "✅ 已切换到 main 分支"
else
    echo "✅ 当前分支: main"
fi

# 拉取最新代码
echo ""
echo "📥 拉取最新代码..."
git fetch origin main

# 检查是否有本地修改
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo "⚠️  检测到本地修改，暂存中..."
    git stash push -m "Auto stash before pull $(date +%Y%m%d_%H%M%S)"
    echo "  → 本地修改已暂存"
fi

git reset --hard origin/main
echo "✅ 代码已更新到最新版本"

# 显示当前状态
echo ""
echo "📊 当前状态："
echo "  → 分支: $(git branch --show-current)"
echo "  → 最新提交: $(git log -1 --oneline)"
echo "  → Remote: $(git remote get-url origin)"

# 检查 PM2
echo ""
echo "🔍 检查 PM2 状态..."
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 已安装"
    if pm2 list | grep -q remotion-backend; then
        echo "  → remotion-backend 进程存在"
        pm2 describe remotion-backend | grep -E "status|uptime|restarts"
    else
        echo "⚠️  remotion-backend 进程不存在"
        echo "  → 提示：需要手动启动 PM2 进程"
        echo "     pm2 start ecosystem.config.js --env production"
    fi
else
    echo "⚠️  PM2 未安装"
    echo "  → 安装命令: npm install -g pm2"
fi

echo ""
echo "✅ 服务器 Git 配置完成！"
echo ""
echo "💡 后续部署流程："
echo "  1. 本地执行: git push origin main"
echo "  2. 服务器执行: cd $REMOTE_BASE && git pull origin main"
echo "  3. 重启服务: cd backend && npm install && npm run build && pm2 reload ecosystem.config.js"
echo ""
echo "或使用本地一键部署脚本："
echo "  .\deploy.ps1"
