# 服务器端配置指令（在服务器上执行）

## 方式一：通过宝塔面板配置（推荐）

### 步骤 1：添加 SSH 公钥

1. 登录宝塔面板：https://162.14.114.224:8888
2. 进入「安全」→「SSH 安全」→「授权密钥」
3. 添加以下公钥：

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAfABsVvL1wNhmfAMeD0+anuFN7s/j4qLFlFzyNM+c7A chuanlbx@gmail.com
```

### 步骤 2：配置 Git 仓库

在宝塔面板「终端」或 SSH 登录后执行：

```bash
cd /www/wwwroot/aigc.wenbita.cn

# 检查是否已有 .git 目录
if [ -d ".git" ]; then
    echo "已存在 Git 仓库"
    git remote -v
else
    echo "初始化 Git 仓库"
    git init
    git remote add origin https://github.com/chuanlbx-ui/aigc.git
fi

# 拉取最新代码
git fetch origin main
git checkout -b main origin/main || git checkout main
git pull origin main

# 显示状态
git status
git log -1 --oneline
```

---

## 方式二：使用自动化脚本（推荐）

### 步骤 1：下载并执行初始化脚本

```bash
cd /www/wwwroot/aigc.wenbita.cn

# 下载脚本（如果本地已有，可以跳过）
# curl -O https://raw.githubusercontent.com/chuanlbx-ui/aigc/main/setup-server-git.sh

# 或者手动创建脚本文件
cat > setup-server-git.sh << 'SCRIPT_EOF'
#!/bin/bash
set -e

REMOTE_BASE="/www/wwwroot/aigc.wenbita.cn"
GITHUB_REPO="https://github.com/chuanlbx-ui/aigc.git"

echo "🚀 开始配置服务器 Git 工作流..."
cd "$REMOTE_BASE"

if [ -d ".git" ]; then
    echo "✅ 已存在 .git 目录"
    if git remote | grep -q "origin"; then
        CURRENT_REMOTE=$(git remote get-url origin)
        if [ "$CURRENT_REMOTE" != "$GITHUB_REPO" ]; then
            git remote set-url origin "$GITHUB_REPO"
            echo "✅ remote URL 已更新"
        fi
    else
        git remote add origin "$GITHUB_REPO"
        echo "✅ remote 已添加"
    fi
else
    echo "📦 初始化 Git 仓库..."
    git init
    git remote add origin "$GITHUB_REPO"
fi

CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
if [ -z "$CURRENT_BRANCH" ]; then
    git fetch origin main
    git checkout -b main origin/main
elif [ "$CURRENT_BRANCH" != "main" ]; then
    git checkout main || git checkout -b main origin/main
fi

echo "📥 拉取最新代码..."
git fetch origin main

if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    git stash push -m "Auto stash $(date +%Y%m%d_%H%M%S)"
fi

git pull origin main

echo ""
echo "✅ 服务器 Git 配置完成！"
echo "分支: $(git branch --show-current)"
echo "最新提交: $(git log -1 --oneline)"
SCRIPT_EOF

# 执行脚本
chmod +x setup-server-git.sh
bash setup-server-git.sh
```

---

## 方式三：手动逐步配置

### 步骤 1：添加 SSH 公钥（如果需要）

```bash
# 创建 .ssh 目录（如果不存在）
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# 添加公钥到 authorized_keys
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAfABsVvL1wNhmfAMeD0+anuFN7s/j4qLFlFzyNM+c7A chuanlbx@gmail.com" >> ~/.ssh/authorized_keys

# 设置权限
chmod 600 ~/.ssh/authorized_keys

# 验证
cat ~/.ssh/authorized_keys | grep "chuanlbx@gmail.com"
```

### 步骤 2：初始化 Git 仓库

```bash
cd /www/wwwroot/aigc.wenbita.cn

# 初始化 Git
git init

# 添加远程仓库
git remote add origin https://github.com/chuanlbx-ui/aigc.git

# 验证
git remote -v
```

### 步骤 3：拉取代码

```bash
# 拉取 main 分支
git fetch origin main

# 创建并切换到 main 分支
git checkout -b main origin/main

# 或者如果已有 main 分支
git checkout main
git pull origin main
```

### 步骤 4：验证配置

```bash
# 查看当前状态
git status

# 查看最新提交
git log -1 --oneline

# 查看分支
git branch -a
```

---

## 验证 SSH 连接（本地执行）

配置完成后，在**本地**执行以下命令验证：

```powershell
# 测试 SSH 连接
ssh wenbita "echo SSH_OK"

# 或
ssh root@162.14.114.224 "echo SSH_OK"

# 验证部署配置
.\verify-deploy.ps1

# 测试部署
.\deploy.ps1 -DeployOnly
```

---

## 常见问题

### Q1: git pull 提示冲突

```bash
# 暂存本地修改
git stash

# 拉取最新代码
git pull origin main

# 恢复本地修改（如果需要）
git stash pop
```

### Q2: 权限问题

```bash
# 确保目录权限正确
chown -R root:root /www/wwwroot/aigc.wenbita.cn
chmod -R 755 /www/wwwroot/aigc.wenbita.cn
```

### Q3: Git 用户配置

```bash
# 配置 Git 用户信息（可选）
git config --global user.name "Server Deploy"
git config --global user.email "deploy@aigc.wenbita.cn"
```

---

## 完成后的部署流程

配置完成后，日常部署只需在**本地**执行：

```powershell
# 完整部署
.\deploy.ps1 -CommitMessage "fix: 修复 xxx"

# 或只部署服务器
.\deploy.ps1 -DeployOnly
```

服务器会自动执行：
1. `git pull origin main` - 拉取最新代码
2. `npm install --production` - 安装依赖
3. `npx prisma generate` - 生成 Prisma 客户端
4. `npm run build` - 构建后端
5. `pm2 restart remotion-backend` - 重启服务

---

## 下一步

1. ✅ 在服务器上执行上述任一方式的配置
2. ✅ 在本地执行 `.\verify-deploy.ps1` 验证配置
3. ✅ 在本地执行 `.\deploy.ps1 -DeployOnly` 测试部署
4. ✅ 配置 GitHub Actions Secrets（可选）

完成！
