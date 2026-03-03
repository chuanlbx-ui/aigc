# 浏览器扩展内容分发 - 快速开始

## 当前状态 ✅

- ✅ 扩展已安装：Remotion Publisher v1.0.0
- ✅ 扩展在线：正常连接到后端
- ✅ 后端运行：http://localhost:3001
- ✅ 支持平台：微博、B站、抖音、快手、视频号、小红书、知乎

---

## 快速测试（3步）

### 步骤1：打开目标平台

在浏览器中打开以下任一平台并登录：
- 微博：https://weibo.com
- B站：https://www.bilibili.com
- 小红书：https://www.xiaohongshu.com
- 知乎：https://www.zhihu.com

### 步骤2：创建测试任务

使用以下命令创建一个测试任务：

```bash
# 在 web 目录下执行
node create-test-task.js
```

### 步骤3：观察扩展执行

1. 打开扩展的 Service Worker 控制台
2. 观察日志输出
3. 扩展会自动打开平台页面并填充内容

---

## 实际使用场景

### 场景1：发布单篇文章到微博
