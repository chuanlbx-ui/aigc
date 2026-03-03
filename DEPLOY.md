# 内容创作平台部署指南

## 环境要求

- Node.js 18+
- Docker & Docker Compose（可选）
- PostgreSQL 15+（生产环境）
- Redis 7+（生产环境，可选）

## 快速开始（开发环境）

```bash
# 1. 安装依赖
cd web/backend && npm install
cd ../frontend && npm install

# 2. 初始化数据库
cd ../backend
npx prisma db push

# 3. 启动服务
npm run dev  # 后端
cd ../frontend && npm run dev  # 前端
```

访问 http://localhost:5173

## Docker 部署（简易模式）

```bash
cd web
docker-compose up -d
```

访问 http://localhost

## 生产环境部署

```bash
cd web
docker-compose -f docker-compose.prod.yml up -d
```

访问 http://localhost

### 环境变量配置

在 `backend/.env` 中配置：

```env
# 数据库
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Redis（可选）
REDIS_URL=redis://host:6379

# 对象存储（可选）
STORAGE_TYPE=s3
S3_ENDPOINT=https://oss.example.com
S3_BUCKET=content-platform
S3_ACCESS_KEY=your-key
S3_SECRET_KEY=your-secret
```

## 数据库切换

切换到 PostgreSQL：

1. 修改 `backend/prisma/schema.prisma` 中的 provider 为 `postgresql`
2. 更新 `.env` 中的 `DATABASE_URL`
3. 运行 `npx prisma db push`
