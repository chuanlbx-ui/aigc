# Git 工作流配置完成

## ✅ 已完成配置

### 本地环境
- ✅ 分支统一为 `main`
- ✅ `.gitignore` 已配置
- ✅ 代码已推送到 GitHub（最新：04e9fdb）

### 服务器环境
- ✅ SSH 密钥认证已配置
- ✅ Git 仓库已初始化
- ✅ Remote 已配置：git@github.com:chuanlbx-ui/aigc.git
- ✅ 代码已同步到最新版本（04e9fdb）

### 部署脚本
- ✅ `deploy.ps1` - 一键部署
- ✅ `verify-deploy.ps1` - 配置验证
- ✅ `setup-server-git.sh` - 服务器初始化
- ✅ `setup-ssh.ps1` - SSH 配置
- ✅ `.github/workflows/deploy.yml` - CI/CD

---

## 🚀 日常部署流程

### 方式一：使用 deploy.ps1（推荐）

```powershell
# 完整部署（提交 + 推送 + 服务器部署）
.\deploy.ps1 -CommitMessage "fix: 修复 xxx 问题"

# 只部署服务器（不推送 GitHub）
.\deploy.ps1 -DeployOnly

# 只推送 GitHub（不部署服务器）
.\deploy.ps1 -PushOnly
```

### 方式二：手动执行

```bash
# 1. 本地提交并推送
git add .
git commit -m "fix: xxx"
git push origin main

# 2. 服务器拉取并重启
ssh wenbita "cd /www/wwwroot/aigc.wenbita.cn && \
  git pull origin main && \
  cd backend && \
  npm install --production && \
  npx prisma generate && \
  npm run build && \
  pm2 restart remotion-backend"
```

### 方式三：GitHub Actions（自动）

配置 GitHub Secrets 后，每次 push 到 main 会自动部署。

---

## 📊 工作流对比

### 旧流程（scp 直传）
```
本地 → scp 上传 → 服务器
```
- ❌ 绕过 GitHub，三端不统一
- ❌ 无版本控制
- ❌ 无法回滚

### 新流程（Git 工作流）
```
本地 → git push → GitHub → 服务器 git pull
```
- ✅ 三端统一，版本可追溯
- ✅ 支持回滚（git reset）
- ✅ 支持 CI/CD 自动部署

---

## 🔧 常用命令

### 本地
```bash
# 查看状态
git status

# 查看提交历史
git log --oneline -10

# 推送到 GitHub
git push origin main
```

### 服务器
```bash
# SSH 连接
ssh wenbita

# 拉取最新代码
cd /www/wwwroot/aigc.wenbita.cn && git pull origin main

# 重启服务
pm2 restart remotion-backend

# 查看日志
pm2 logs remotion-backend
```

---

## 📝 下一步（可选）

### 配置 GitHub Actions 自动部署

1. 访问：https://github.com/chuanlbx-ui/aigc/settings/secrets/actions

2. 添加 Secrets：
   - `SERVER_HOST`: `162.14.114.224`
   - `SERVER_USER`: `root`
   - `SSH_PRIVATE_KEY`: SSH 私钥内容

3. 完成后，每次 push 到 main 会自动部署

---

## ✅ 配置完成

现在可以使用标准 Git 工作流进行开发和部署了！
