# 项目同步与部署 - 快速参考

## ✅ 已完成

### 1. Git 工作流配置
- ✅ 本地分支统一为 `main`
- ✅ `.gitignore` 已配置，排除敏感文件（.env、数据库备份等）
- ✅ 代码已推送到 GitHub：https://github.com/chuanlbx-ui/aigc.git
- ✅ 最新提交：5b0e0ff（新增部署流程验证脚本）

### 2. 部署脚本
- ✅ `deploy.ps1` - 一键部署脚本
- ✅ `verify-deploy.ps1` - 部署配置验证脚本
- ✅ `setup-server-git.sh` - 服务器 Git 初始化脚本
- ✅ `.github/workflows/deploy.yml` - GitHub Actions CI/CD

### 3. 文档
- ✅ `SERVER_SETUP.md` - 详细配置指南
- ✅ `CLAUDE.md` - 项目开发指南

---

## ⚠️ 待完成（需要 SSH 访问权限）

### 步骤 1：配置 SSH 连接

**当前问题**：SSH 连接失败（Permission denied）

**解决方案（三选一）**：

#### 方案 A：使用密码登录（最简单）
```bash
ssh root@162.14.114.224
# 输入密码
```

#### 方案 B：配置 SSH 密钥（推荐）
```bash
# 1. 生成密钥（如果没有）
ssh-keygen -t ed25519 -C "deploy@aigc" -f ~/.ssh/aigc_deploy

# 2. 复制公钥到服务器
ssh-copy-id -i ~/.ssh/aigc_deploy.pub root@162.14.114.224

# 3. 测试连接
ssh -i ~/.ssh/aigc_deploy root@162.14.114.224
```

#### 方案 C：使用现有 SSH 密钥
```bash
# 如果已有密钥，添加到 SSH 配置
# 编辑 ~/.ssh/config
Host aigc-server
    HostName 162.14.114.224
    User root
    IdentityFile ~/.ssh/id_rsa  # 或其他密钥路径
```

---

### 步骤 2：服务器端配置 Git

**SSH 连接成功后**，执行以下命令：

```bash
# 方法 1：使用自动化脚本（推荐）
cd /d/AGC/remotion-video/web
scp setup-server-git.sh root@162.14.114.224:/www/wwwroot/aigc.wenbita.cn/
ssh root@162.14.114.224 "cd /www/wwwroot/aigc.wenbita.cn && bash setup-server-git.sh"

# 方法 2：手动配置
ssh root@162.14.114.224
cd /www/wwwroot/aigc.wenbita.cn
git init
git remote add origin https://github.com/chuanlbx-ui/aigc.git
git fetch origin main
git checkout -b main origin/main
git pull origin main
```

---

### 步骤 3：验证部署流程

```powershell
# 1. 验证配置
.\verify-deploy.ps1

# 2. 测试部署（仅服务器端）
.\deploy.ps1 -DeployOnly

# 3. 完整部署测试
.\deploy.ps1 -CommitMessage "test: 测试部署流程"
```

---

### 步骤 4：配置 GitHub Actions（可选）

访问：https://github.com/chuanlbx-ui/aigc/settings/secrets/actions

添加以下 Secrets：

| Name | Value |
|------|-------|
| `SERVER_HOST` | `162.14.114.224` |
| `SERVER_USER` | `root` |
| `SSH_PRIVATE_KEY` | SSH 私钥内容（`cat ~/.ssh/aigc_deploy`） |

配置完成后，每次 push 到 main 分支会自动触发部署。

---

## 🚀 日常使用

### 完整部署（推荐）
```powershell
.\deploy.ps1 -CommitMessage "fix: 修复 xxx 问题"
```

### 只推送到 GitHub
```powershell
.\deploy.ps1 -PushOnly
```

### 只部署服务器
```powershell
.\deploy.ps1 -DeployOnly
```

### 跳过 commit（已手动提交）
```powershell
.\deploy.ps1 -SkipCommit
```

---

## 📊 部署流程对比

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

## 🔧 故障排查

### 问题 1：SSH 连接失败
```bash
# 检查 SSH 配置
ssh -v root@162.14.114.224

# 测试密钥
ssh -i ~/.ssh/aigc_deploy root@162.14.114.224
```

### 问题 2：服务器 git pull 冲突
```bash
ssh root@162.14.114.224
cd /www/wwwroot/aigc.wenbita.cn
git stash  # 暂存本地修改
git pull origin main
```

### 问题 3：PM2 进程未启动
```bash
ssh root@162.14.114.224
cd /www/wwwroot/aigc.wenbita.cn/backend
pm2 list
pm2 restart remotion-backend
# 或
pm2 start dist/index.js --name remotion-backend
```

### 问题 4：验证脚本报错
```powershell
# 查看详细错误
.\verify-deploy.ps1 -Verbose
```

---

## 📝 相关文档

- `SERVER_SETUP.md` - 详细配置指南
- `CLAUDE.md` - 项目开发指南
- `DEPLOY.md` - 部署文档
- `DEVELOPMENT_GUIDE.md` - 开发指南

---

## 🎯 下一步行动

1. **立即执行**：配置 SSH 连接（步骤 1）
2. **必须完成**：服务器端配置 Git（步骤 2）
3. **验证**：运行 `.\verify-deploy.ps1` 检查配置
4. **测试**：执行 `.\deploy.ps1 -DeployOnly` 测试部署
5. **可选**：配置 GitHub Actions 自动部署（步骤 4）

完成后，日常部署只需一条命令：
```powershell
.\deploy.ps1 -CommitMessage "你的提交信息"
```
