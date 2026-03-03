# 服务器 Git 配置指南

## 当前状态

✅ **已完成**：
- 本地分支统一为 main
- .gitignore 已配置，敏感文件已排除
- 代码已推送到 GitHub（https://github.com/chuanlbx-ui/aigc.git）
- deploy.ps1 一键部署脚本已创建
- GitHub Actions CI/CD 已配置

⚠️ **待完成**：
- 服务器端配置 git remote（需要 SSH 访问权限）
- 配置 GitHub Secrets（用于 CI/CD）

---

## 步骤一：服务器端配置 Git（必须）

### 1.1 SSH 连接到服务器

```bash
ssh root@162.14.114.224
```

如果提示密码认证失败，需要：
- 方案 A：使用密码登录（询问服务器管理员）
- 方案 B：配置 SSH 密钥（推荐）

### 1.2 在服务器上初始化 Git 仓库

```bash
cd /www/wwwroot/aigc.wenbita.cn

# 初始化 Git 仓库
git init

# 添加远程仓库
git remote add origin https://github.com/chuanlbx-ui/aigc.git

# 拉取最新代码
git pull origin main

# 如果提示冲突，可以强制覆盖（谨慎！）
# git fetch origin main
# git reset --hard origin/main
```

### 1.3 验证配置

```bash
git remote -v
# 应该显示：
# origin  https://github.com/chuanlbx-ui/aigc.git (fetch)
# origin  https://github.com/chuanlbx-ui/aigc.git (push)

git status
# 应该显示：On branch main
```

---

## 步骤二：配置 GitHub Secrets（可选，用于 CI/CD）

### 2.1 生成 SSH 私钥（如果没有）

在**本地**执行：

```bash
ssh-keygen -t ed25519 -C "github-actions@aigc.wenbita.cn" -f ~/.ssh/aigc_deploy
```

### 2.2 将公钥添加到服务器

```bash
# 复制公钥内容
cat ~/.ssh/aigc_deploy.pub

# SSH 到服务器，添加到 authorized_keys
ssh root@162.14.114.224
mkdir -p ~/.ssh
echo "公钥内容" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 2.3 在 GitHub 配置 Secrets

访问：https://github.com/chuanlbx-ui/aigc/settings/secrets/actions

添加以下 Secrets：

| Name | Value |
|------|-------|
| `SERVER_HOST` | `162.14.114.224` |
| `SERVER_USER` | `root` |
| `SSH_PRIVATE_KEY` | 私钥内容（`cat ~/.ssh/aigc_deploy`） |

---

## 步骤三：测试部署

### 3.1 测试手动部署（推荐先测试）

在**本地**执行：

```powershell
.\deploy.ps1 -DeployOnly
```

这会 SSH 到服务器执行 `git pull` 和 `pm2 restart`。

### 3.2 测试完整部署

```powershell
.\deploy.ps1 -CommitMessage "test: 测试部署流程"
```

这会：
1. git commit + push 到 GitHub
2. SSH 到服务器执行 git pull
3. 重启 PM2 服务

### 3.3 测试 GitHub Actions（配置 Secrets 后）

推送任意代码到 main 分支，GitHub Actions 会自动触发部署。

访问：https://github.com/chuanlbx-ui/aigc/actions

---

## 常见问题

### Q1: SSH 连接失败 "Permission denied"

**原因**：没有配置 SSH 密钥或密码错误。

**解决**：
- 使用密码登录：`ssh root@162.14.114.224`（输入密码）
- 或配置 SSH 密钥（见步骤二）

### Q2: 服务器 git pull 提示冲突

**原因**：服务器本地有未提交的修改。

**解决**：
```bash
cd /www/wwwroot/aigc.wenbita.cn
git stash  # 暂存本地修改
git pull origin main
git stash pop  # 恢复本地修改（如果需要）
```

### Q3: PM2 进程未启动

**原因**：PM2 未安装或进程名错误。

**解决**：
```bash
# 安装 PM2
npm install -g pm2

# 启动进程
cd /www/wwwroot/aigc.wenbita.cn/backend
pm2 start dist/index.js --name remotion-backend
pm2 save
pm2 startup  # 设置开机自启
```

### Q4: GitHub Actions 部署失败

**原因**：Secrets 未配置或 SSH 密钥错误。

**解决**：
- 检查 GitHub Secrets 是否正确配置
- 测试 SSH 连接：`ssh -i ~/.ssh/aigc_deploy root@162.14.114.224`

---

## 部署流程对比

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

## 下一步

1. **立即执行**：SSH 到服务器配置 git remote（步骤一）
2. **可选**：配置 GitHub Secrets 启用 CI/CD（步骤二）
3. **测试**：执行 `.\deploy.ps1` 验证部署流程（步骤三）

完成后，日常部署只需：
```powershell
.\deploy.ps1 -CommitMessage "fix: xxx"
```

或直接推送到 GitHub，GitHub Actions 会自动部署。
