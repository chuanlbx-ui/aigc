# 生产环境部署指南

域名：`aigc.wenbita.cn`

## 快速部署

### 1. 上传代码到服务器
```bash
scp -r deploy/ user@your-server:/opt/video-mixer/
scp -r backend/ user@your-server:/opt/video-mixer/
scp -r frontend/ user@your-server:/opt/video-mixer/
```

### 2. 启动服务
```bash
cd /opt/video-mixer/deploy
docker-compose -f docker-compose.prod.yml up -d --build
```

### 3. 初始化数据库
```bash
docker exec video-mixer-backend npx prisma db push
```

## 常用命令

```bash
# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 重启服务
docker-compose -f docker-compose.prod.yml restart

# 停止服务
docker-compose -f docker-compose.prod.yml down

# 重新构建
docker-compose -f docker-compose.prod.yml up -d --build
```
