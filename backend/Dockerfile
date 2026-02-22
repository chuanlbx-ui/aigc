# 后端 Dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制源码
COPY . .

# 生成 Prisma Client
RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "start"]
