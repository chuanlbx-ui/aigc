# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 开发命令

### 前端 (frontend/)
```bash
cd frontend
npm run dev      # 启动开发服务器 (端口 5175)
npm run build    # 构建: tsc && vite build
npm run preview  # 预览生产构建
```

### 后端 (backend/)
```bash
cd backend
npm run dev      # 启动开发服务器 (端口 3001，热重载)
npm run build    # 编译 TypeScript
npm start        # 运行编译后代码
npm run db:push  # 推送数据库 schema 变更
npm run db:studio # 打开 Prisma Studio 数据库管理界面
```

### 同时启动前后端
在两个终端分别运行：
- 终端1: `cd frontend && npm run dev`
- 终端2: `cd backend && npm run dev`

## 项目架构

前后端分离的视频混剪和内容创作平台。

```
web/
├── frontend/          # React + Vite 前端
│   └── src/
│       ├── pages/     # 页面组件 (Projects, Editor, Assets, Knowledge, Articles, Tasks)
│       ├── components/
│       │   ├── Editor/    # 视频编辑器组件 (TTS, Preview, Filters, BGM, Popups)
│       │   ├── Article/   # 文章系统组件 (AI审核, HKR评分, 工作流)
│       │   └── Knowledge/ # 知识库组件
│       ├── backgrounds/   # 背景渲染器
│       └── popups/        # 弹窗渲染器
├── backend/           # Express + Prisma 后端
│   └── src/
│       ├── routes/        # API 路由
│       ├── services/
│       │   ├── ai/        # AI 服务 (openai, claude, deepseek)
│       │   └── article/   # 文章服务 (workflow, smartImage, poster)
│       ├── generators/    # 内容生成器 (dalle, stability, tongyi, kling, runway, pika)
│       ├── searchers/     # 资源搜索器 (unsplash, pexels, pixabay, freesound)
│       └── queue/         # 渲染队列
└── public/            # 静态资源和生成内容
```

## API 结构

后端 API 前缀: `/api`，端口 3001

| 路由 | 功能 |
|------|------|
| `/api/projects` | 项目管理 |
| `/api/assets` | 资源管理 |
| `/api/tasks` | 渲染任务 |
| `/api/tts` | 文本转语音 |
| `/api/voice-clone` | 声音克隆 |
| `/api/popup-templates` | 弹窗模板 |
| `/api/knowledge` | 知识库 |
| `/api/articles` | 文章管理 |
| `/api/auth` | 身份认证 |
| `/api/billing` | 计费系统 |
| `/api/publish` | 多平台发布 |
| `/api/posters` | 海报生成 |
| `/api/extension` | 浏览器扩展 |
| `/api/marketplace` | 模板市场 |
| `/api/portal` | 用户端内容展示 |
| `/api/open` | 开放 API |
| `/api/ai-stats` | AI 调用统计 |

前端 Vite 配置已代理 `/api` 到后端。

## 数据库

使用 Prisma + PostgreSQL（生产），schema 位于 `backend/prisma/schema.prisma`，支持 vector 扩展用于向量搜索。

核心模型：
- `Project` / `RenderTask` - 视频项目和渲染任务
- `Asset` / `AssetCategory` - 资源管理
- `KnowledgeDoc` / `KnowledgeCategory` / `KnowledgeVersion` - 知识库系统
- `Article` / `ArticleCategory` / `ArticleVersion` / `ArticleScore` - 文章系统（含 HKR 评分）
- `PopupTemplate` / `Template` / `TemplateBundle` - 模板系统
- `AIServiceConfig` / `AICallLog` / `AIUsageDaily` - AI 服务配置与统计
- `Tenant` / `User` / `Session` - 多租户用户系统
- `Plan` / `Subscription` / `PaymentOrder` - 计费系统
- `PublishPlatform` / `PublishRecord` / `ExtensionTask` - 多平台发布
- `WorkflowTemplate` / `WorkflowStep` - 工作流系统

## 关键技术点

- **视频预览**: 使用 Remotion Player (`@remotion/player`)，组件在 `frontend/src/components/Editor/`
- **状态管理**: Zustand
- **AI 集成**: 统一接口在 `backend/src/services/ai/index.ts`
- **内容生成**: 生成器基类在 `backend/src/generators/base.ts`
- **资源搜索**: 搜索器基类在 `backend/src/searchers/base.ts`
