# Remotion Publisher 浏览器扩展

多平台内容发布浏览器扩展，支持微博、B站、抖音、快手等平台。

## 项目结构

```
browser-extension/
├── manifest.json              # 扩展配置文件
├── package.json              # 项目依赖
├── tsconfig.json             # TypeScript 配置
├── webpack.config.js         # Webpack 打包配置
├── src/
│   ├── background/           # 后台服务
│   │   ├── index.ts         # Service Worker 入口
│   │   ├── taskManager.ts   # 任务管理器
│   │   └── apiClient.ts     # API 客户端
│   └── popup/               # 弹窗界面
│       └── index.ts         # 弹窗脚本
└── popup/
    └── index.html           # 弹窗页面
```

## 安装依赖

```bash
cd browser-extension
npm install
```

## 开发构建

```bash
npm run dev
```

这会启动 webpack 监听模式，自动编译 TypeScript 文件。
