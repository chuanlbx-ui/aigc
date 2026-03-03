# 工作流配置模板系统使用文档

## 概述

工作流配置模板系统允许用户自定义和管理文章创作的工作流程。系统提供了预设模板和自定义模板功能，支持不同平台和栏目的个性化配置。

## 功能特性

### 1. 预设模板
系统内置了两个预设模板：
- **深度分析模板**：适用于公众号深度分析类文章，强调数据支撑和逻辑严密
- **快讯速递模板**：适用于公众号快讯类文章，强调时效性和信息密度

### 2. 自定义模板
用户可以创建自己的工作流模板，包括：
- 自定义工作流步骤
- 配置 Prompt 模板
- 设置 HKR 评估维度
- 定义降AI味检查清单
- 配置高级参数

### 3. 模板管理
- 创建、编辑、删除模板
- 设置默认模板
- 导入/导出模板配置
- 模板版本管理

## 快速开始

### 初始化默认模板

首次使用时，需要初始化默认的预设模板：

```bash
cd backend
npx tsx src/scripts/initWorkflowTemplates.ts
```

这将创建两个系统预设模板。

### 使用模板创建文章

1. 在文章列表页面，点击"新建文章"
2. 在创建文章表单中，选择平台和栏目
3. 系统会自动匹配对应的默认模板
4. 也可以手动选择其他模板

## API 接口

### 获取模板列表

```http
GET /api/workflow-templates?platform=wechat&page=1&pageSize=20
```

**查询参数：**
- `platform` (可选): 平台筛选
- `type` (可选): 模板类型 (system/custom)
- `page` (可选): 页码，默认 1
- `pageSize` (可选): 每页数量，默认 20

**响应示例：**
```json
{
  "templates": [
    {
      "id": "xxx",
      "name": "深度分析模板",
      "description": "适用于公众号深度分析类文章",
      "platform": "wechat",
      "column": "深度",
      "isDefault": true,
      "config": "{...}"
    }
  ],
  "total": 2,
  "page": 1,
  "pageSize": 20
}
```

### 获取单个模板

```http
GET /api/workflow-templates/:id
```

**响应示例：**
```json
{
  "id": "xxx",
  "name": "深度分析模板",
  "description": "适用于公众号深度分析类文章",
  "platform": "wechat",
  "column": "深度",
  "isDefault": true,
  "config": "{...}",
  "createdAt": "2026-02-09T06:45:38.509Z",
  "updatedAt": "2026-02-09T06:45:38.509Z"
}
```

### 创建模板

```http
POST /api/workflow-templates
Content-Type: application/json

{
  "name": "我的自定义模板",
  "description": "模板描述",
  "platform": "wechat",
  "column": "深度",
  "config": {
    "steps": {...},
    "prompts": {...},
    "hkrDimensions": {...},
    "antiAIChecklist": [...],
    "variables": {...},
    "advanced": {...}
  },
  "isDefault": false
}
```

### 更新模板

```http
PUT /api/workflow-templates/:id
Content-Type: application/json

{
  "name": "更新后的模板名称",
  "description": "更新后的描述",
  "config": {...},
  "isDefault": true
}
```

### 删除模板

```http
DELETE /api/workflow-templates/:id
```

### 导出模板

```http
GET /api/workflow-templates/:id/export
```

### 导入模板

```http
POST /api/workflow-templates/import
Content-Type: application/json

{
  "data": {
    "version": "1.0",
    "exportedAt": "2026-02-09T06:45:38.509Z",
    "template": {...}
  },
  "overwrite": false,
  "createVersion": true
}
```

## 配置说明

### 工作流步骤配置

每个步骤包含以下字段：

```typescript
{
  enabled: boolean;      // 是否启用该步骤
  required: boolean;     // 是否为必做步骤
  name: string;          // 步骤名称（英文标识）
  label: string;         // 步骤显示标签
  description: string;   // 步骤描述
}
```

**系统支持的 9 个步骤：**

| 步骤索引 | 名称 | 标签 | 说明 |
|---------|------|------|------|
| 0 | understand | 理解需求 | 明确写作目标和受众 |
| 1 | search | 信息搜索 | 搜索相关资料 |
| 2 | topic | 选题讨论 | 确定切入角度（必做） |
| 3 | collaboration | 协作文档 | 整理素材和大纲 |
| 4 | style | 学习风格 | 学习平台风格 |
| 5 | materials | 使用素材库 | 引用知识库素材（必做） |
| 6 | data | 等待数据 | 等待数据补充 |
| 7 | draft | 创作初稿 | 生成文章初稿（必做） |
| 8 | review | 三遍审校 | HKR评分和降AI味（必做） |

### HKR 评估维度配置

HKR 是文章质量评估的三个维度：

```typescript
{
  H: {  // Happiness/Hook - 开头吸引力
    name: "Happiness/Hook",
    description: "开头吸引力，前3秒/前50字能否抓住注意力",
    criteria: ["是否有悬念或冲突", "是否直击痛点", ...],
    weight: 0.3  // 权重
  },
  K: {  // Knowledge - 知识价值
    name: "Knowledge",
    description: "知识价值，读者能获得什么",
    criteria: ["信息是否准确可靠", "是否有独特见解", ...],
    weight: 0.4
  },
  R: {  // Resonance - 情感共鸣
    name: "Resonance",
    description: "情感共鸣，能否引发认同",
    criteria: ["是否有真实感受", "是否触及情绪", ...],
    weight: 0.3
  }
}
```

### 降AI味检查清单

用于检测和修正 AI 生成文本的常见问题：

```typescript
[
  {
    pattern: "在当今时代",
    action: "删除或替换为具体时间",
    enabled: true
  },
  {
    pattern: "综上所述",
    action: "删除，直接给结论",
    enabled: true
  }
]
```

### Prompt 模板配置

系统支持以下 Prompt 模板，支持变量替换：

- `topicDiscussion`: 选题讨论
- `outline`: 大纲生成
- `draft`: 初稿创作
- `review`: 三遍审校
- `hkr`: HKR 评估
- `hkrImprove`: HKR 改进
- `optimize`: 内容优化

**变量语法：** `{{variableName}}`

**支持的变量：**
- `{{title}}` - 文章标题
- `{{platform}}` - 平台名称
- `{{column}}` - 栏目名称
- `{{topic}}` - 选题内容
- `{{outline}}` - 大纲内容
- `{{materials}}` - 素材内容
- `{{content}}` - 文章内容

### 高级配置

```typescript
{
  maxRetries: 3,           // 最大重试次数
  timeout: 60000,          // 超时时间（毫秒）
  temperature: 0.7,        // AI 温度参数
  enableAutoSave: true,    // 启用自动保存
  autoSaveInterval: 30000  // 自动保存间隔（毫秒）
}
```

## 使用示例

### 示例 1：创建自定义模板

```bash
curl -X POST http://localhost:3001/api/workflow-templates \
  -H "Content-Type: application/json" \
  -d @custom-template.json
```

### 示例 2：在文章中使用模板

在创建文章时，可以指定 `templateId` 来使用特定的工作流模板：

```typescript
const article = await api.post('/articles', {
  title: '我的文章',
  platform: 'wechat',
  column: '深度',
  templateId: 'ba4b7aa8-84ec-4dd1-8401-a1b5a8e4fcc3'
});
```

## 注意事项

1. **系统模板不可删除**：标记为 `isSystem: true` 的模板无法删除
2. **默认模板唯一性**：同一时间只能有一个默认模板
3. **配置验证**：创建或更新模板时会自动验证配置格式
4. **版本管理**：修改模板时建议创建新版本而不是直接覆盖

## 故障排查

### 问题：模板列表为空

**解决方案：** 运行初始化脚本
```bash
cd backend
npx tsx src/scripts/initWorkflowTemplates.ts
```

### 问题：配置验证失败

**解决方案：** 检查配置格式是否符合 `WorkflowTemplateConfig` 类型定义

### 问题：模板无法应用到文章

**解决方案：** 确保文章的 `platform` 和 `column` 与模板匹配

## 相关文档

- [文章系统使用文档](./articles.md)
- [AI 服务配置文档](./ai-services.md)
- [工作流步骤说明](./workflow-steps.md)
