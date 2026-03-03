# 本地开发与远程同步 - 快速指南

## 📦 已创建的文件

```
web/
├── docker-compose.dev.yml       # 本地 PostgreSQL Docker 配置
├── backend/
│   ├── .env.local              # 本地开发环境配置
│   └── .env.remote             # 远程服务器环境配置
├── dev-local.ps1               # 启动本地开发环境脚本
├── dev-remote.ps1              # 切换到远程数据库脚本
├── sync-to-server.ps1          # 同步代码到服务器脚本
├── status.ps1                  # 查看当前环境状态脚本
├── ecosystem.config.js         # PM2 生产环境配置
└── .gitignore                  # Git 忽略文件配置
```

## 🚀 快速开始

### 1️⃣ 本地开发（使用本地数据库）

```powershell
# 首次启动 - 包含 PgAdmin 管理工具
.\dev-local.ps1 -Tools

# 日常启动
.\dev-local.ps1

# 在新终端启动后端
cd backend
npm run dev

# 在另一个终端启动前端
cd frontend
npm run dev
```

访问地址：
- 前端: http://localhost:5175
- 后端: http://localhost:3001
- PgAdmin: http://localhost:5050 (admin@admin.com / admin123)

### 2️⃣ 本地开发（使用远程数据库）

```powershell
# 切换到远程数据库
.\dev-remote.ps1

# 启动服务（同上）
cd backend; npm run dev
cd frontend; npm run dev
```

### 3️⃣ 同步代码到服务器

```powershell
# 完整同步（构建+上传+重启）
.\sync-to-server.ps1

# 只同步后端
.\sync-to-server.ps1 -OnlyBackend

# 只同步前端
.\sync-to-server.ps1 -OnlyFrontend

# 跳过前端构建
.\sync-to-server.ps1 -SkipBuild
```

### 4️⃣ 查看当前状态

```powershell
.\status.ps1
```

## 📋 常见场景

### 场景 1：从零开始本地开发

```powershell
# 1. 启动本地环境
.\dev-local.ps1 -Tools

# 2. 初始化数据库（选择 y）

# 3. 启动服务
cd backend; npm run dev
cd frontend; npm run dev

# 4. 开始开发...
```

### 场景 2：在本地和远程数据库之间切换

```powershell
# 切换到本地
.\dev-local.ps1 -SkipDB  # 跳过数据库启动

# 切换到远程
.\dev-remote.ps1

# 查看当前配置
.\status.ps1
```

### 场景 3：开发完成后部署到服务器

```powershell
# 1. 确保本地代码已提交到 Git
git add .
git commit -m "feat: 新功能"
git push

# 2. 同步到服务器
.\sync-to-server.ps1

# 3. 访问生产环境
# https://aigc.wenbita.cn
```

### 场景 4：快速修复后端 Bug

```powershell
# 1. 使用远程数据库测试
.\dev-remote.ps1

# 2. 修复代码...

# 3. 只同步后端
.\sync-to-server.ps1 -OnlyBackend -SkipBuild

# 4. 查看服务器日志
ssh root@162.14.114.224 "pm2 logs remotion-backend --lines 50"
```

## 🔧 环境配置说明

### 本地开发环境 (.env.local)
- 数据库: `localhost:5432`
- 数据库名: `remotion_video_dev`
- 模式: `development`

### 远程生产环境 (.env.remote)
- 数据库: `162.14.114.224:5432`
- 数据库名: `remotion_video`
- 模式: `production`

## 💡 最佳实践

1. **本地开发优先使用本地数据库**
   - 避免影响生产数据
   - 提高开发速度

2. **测试使用远程数据库**
   - 确保与生产环境一致
   - 发现潜在问题

3. **代码同步前先提交 Git**
   - 保持版本控制
   - 方便回滚

4. **使用 status.ps1 检查状态**
   - 避免环境混淆
   - 确保配置正确

## 🐛 故障排查

### 问题 1：Docker 容器启动失败

```powershell
# 查看容器日志
docker logs remotion-postgres-dev

# 重启容器
docker-compose -f docker-compose.dev.yml restart
```

### 问题 2：数据库连接失败

```powershell
# 检查当前配置
.\status.ps1

# 测试数据库连接
cd backend
npx prisma db pull
```

### 问题 3：代码同步失败

```powershell
# 检查 SSH 连接
ssh root@162.14.114.224

# 手动上传单个文件
scp .\backend\src\index.ts root@162.14.114.224:/opt/video-mixer/backend/src/
```

## 📚 参考命令

### Docker 命令

```powershell
# 启动本地数据库
docker-compose -f docker-compose.dev.yml up -d

# 停止数据库
docker-compose -f docker-compose.dev.yml down

# 查看日志
docker-compose -f docker-compose.dev.yml logs -f
```

### Prisma 命令

```powershell
cd backend

# 同步数据库结构
npm run db:push

# 打开数据库管理界面
npm run db:studio

# 查看数据库结构
npx prisma db pull
```

### PM2 命令（服务器端）

```bash
# 查看所有进程
pm2 list

# 查看日志
pm2 logs remotion-backend

# 重启服务
pm2 restart remotion-backend

# 停止服务
pm2 stop remotion-backend
```

## 🎯 下一步

1. ✅ 环境配置已完成
2. 🔄 选择开发模式（本地/远程）
3. 💻 开始开发
4. 🚀 部署到服务器

Happy Coding! 🎉
