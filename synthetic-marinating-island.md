# 内容创作系统升级优化方案

## Context

当前系统已实现完整的9步创作工作流、降AI味审校、HKR评分、智能配图、多平台发布等功能。但在深入分析后发现，有多个环节存在薄弱点或缺失，直接影响内容创作质量。本方案聚焦于**能直接提升内容质量**的优化，分4个阶段实施。

---

## 第一阶段：直接提升内容质量（高优先级）

### 1.1 素材搜索升级为向量语义搜索

**问题**：工作流 Step 6（素材搜索）是降AI味的核心，但当前 `/ai/search-knowledge` 端点（`backend/src/routes/article.ts:1178-1218`）使用简单的 `contains` 字符串匹配。搜索"AI编程工具"不会匹配到"Claude Code使用心得"。而知识库路由中已有完整的向量搜索实现（`backend/src/routes/knowledge.ts` 的 `/search/vector`）。

**改动**：
- 修改 `backend/src/routes/article.ts` 的 `/ai/search-knowledge` 端点，优先使用向量搜索，回退到文本搜索
- 复用已有的 `backend/src/services/embedding.ts` 中的 `createEmbeddingService`

**效果**：素材命中率大幅提升，能找到更多语义相关的真实素材，直接增强"活人感"。

### 1.2 发布前质量门槛（Quality Gate）

**问题**：审校完成后可直接发布，没有自动化质量检查。HKR评分是可选的，不会阻止低质量内容发布。

**改动**：
- 新建 `backend/src/services/article/qualityGate.ts`，实现：
  - 降AI味关键词正则扫描（基于 `prompts.ts` 的 `ANTI_AI_CHECKLIST`，无需AI调用）
  - HKR最低分数门槛（可配置，如综合分 ≥ 6）
  - 字数范围检查（根据平台/栏目）
  - 必要步骤完成检查（选题讨论、审校是否已执行）
  - 图片数量检查（根据平台要求）
- 在 `backend/src/routes/article.ts` 添加 `/ai/quality-check` 端点
- 在 `frontend/src/components/Article/WorkflowPanel.tsx` 审校步骤后添加质量检查结果展示

**效果**：将质量控制从"建议"变为"门槛"，防止低质量内容发布。

### 1.3 工作流步骤间上下文智能传递

**问题**：当前各步骤数据传递是割裂的。选题分析结果不会传给大纲生成，风格学习结果不会自动用于初稿生成。`WorkflowPanel.tsx:286-327` 的 `handleDraft` 虽然拼接了素材和搜索内容，但不传入选题分析、风格分析等前序结果。

**改动**：
- 在 `backend/src/services/article/workflow.ts` 添加 `buildWorkflowContext` 函数，自动聚合所有已完成步骤的数据
- 扩展 `backend/src/services/article/prompts.ts` 中的 prompt 构建函数，支持接收完整上下文
- 修改 `frontend/src/components/Article/WorkflowPanel.tsx` 的 `handleDraft`，自动判断是否有风格分析结果并选择对应 prompt
- 修改 `backend/src/routes/article.ts` 的 `/ai/draft` 端点，接收完整工作流上下文

**效果**：每个步骤都能利用前序步骤的成果，避免信息丢失，初稿质量显著提升。

---

## 第二阶段：补全核心缺失功能（中高优先级）

### 2.1 内容去重与相似度检测

**问题**：没有机制检测新文章与已发布文章的相似度，可能导致重复选题、内容同质化。

**改动**：
- `backend/prisma/schema.prisma` 的 `Article` 模型添加 `embedding` 字段
- 新建 `backend/src/services/article/dedup.ts`，基于向量的相似度检测（复用 pgvector）
- 在选题讨论步骤和发布前检查中调用
- 依赖：1.1（向量搜索基础设施）

### 2.2 发布后数据反馈循环

**问题**：系统流程到"三遍审校"就结束了，没有发布后的效果追踪和优化机制。`PublishRecord` 没有效果数据字段。

**改动**：
- `backend/prisma/schema.prisma` 新建 `ContentMetrics` 模型（阅读量、点赞、评论、分享等）
- 新建 `backend/src/services/publish/metrics.ts`，实现微信公众号数据回收（通过已有 accessToken 调用微信数据分析 API）
- 新建 `content-creation-skill/workflows/post-publish.md`，定义发布后优化流程
- 前端添加文章效果数据面板

**效果**：形成"创作→发布→数据→优化"完整闭环。

### 2.3 SEO/算法优化建议

**问题**：没有关键词密度分析、标题优化建议等功能，内容可见性未被考虑。

**改动**：
- 新建 `backend/src/services/article/seoAnalyzer.ts`
- 在 `prompts.ts` 添加 `buildSEOAnalysisPrompt`
- 实现：关键词提取和密度分析、标题吸引力评分、平台特定优化建议（公众号标题长度、小红书标签推荐等）
- 在审校步骤或质量门槛中集成

---

## 第三阶段：扩展能力边界（中优先级）

### 3.1 内容多平台改编（一稿多用）

**问题**：没有"将一篇文章改编成多平台内容"的流程。

**改动**：
- 新建 `content-creation-skill/workflows/cross-platform.md`
- 在 `prompts.ts` 添加 `buildAdaptPrompt`（公众号→小红书、长文→短文等）
- 在 `backend/src/routes/article.ts` 添加 `/ai/adapt` 端点
- 前端文章列表添加"改编到其他平台"操作

### 3.2 工作流条件跳过与自动化

**问题**：没有基于条件的自动跳过逻辑。`prompts.ts` 中有 `isNewsContent` 函数但未在工作流中使用。

**改动**：
- 扩展 `backend/src/services/article/workflow.ts`，添加条件判断逻辑
- 规则：非时事内容可跳过信息搜索、已有大纲可跳过协作文档、不需要外部数据可跳过等待数据
- 前端添加自动跳过提示和手动覆盖选项

### 3.3 技能包方法论补全

**问题**：信息搜索方法论不足、素材库操作指南缺失、修改流程与新创作流程衔接不清。

**改动**：
- 扩展 `content-creation-skill/workflows/new-content.md` 的 Step 2（添加搜索策略矩阵、信息时效性判断标准）和 Step 6（添加素材分类体系、搜索技巧）
- 完善 `content-creation-skill/workflows/revision.md`（明确触发条件、与新创作流程的衔接）
- 补充异常处理场景（反复修改不满意、用户中途改需求等）

---

## 第四阶段：按需实施（低优先级）

| 优化项 | 说明 | 依赖 |
|--------|------|------|
| 4.1 多平台发布器补全 | 小红书/头条/知乎 API 发布器（浏览器扩展已覆盖） | 无 |
| 4.2 内容日历与排期 | 日历视图 + 定时发布集成 | 无 |
| 4.3 多账号管理 | 同一平台多个账号 | 无 |
| 4.4 数据驱动选题 | 基于历史效果数据推荐选题方向 | 2.2 |

---

## 关键文件清单

| 文件 | 涉及优化项 |
|------|-----------|
| `backend/src/routes/article.ts` | 1.1, 1.2, 1.3, 2.1, 2.3, 3.1 |
| `backend/src/services/article/prompts.ts` | 1.3, 2.3, 3.1 |
| `backend/src/services/article/workflow.ts` | 1.3, 3.2 |
| `frontend/src/components/Article/WorkflowPanel.tsx` | 1.2, 1.3, 2.1, 3.2 |
| `backend/prisma/schema.prisma` | 2.1, 2.2 |
| `backend/src/services/embedding.ts` | 1.1（复用） |
| `backend/src/routes/knowledge.ts` | 1.1（参考向量搜索实现） |
| `content-creation-skill/workflows/` | 2.2, 3.1, 3.3 |

## 验证方式

- 1.1：在创作流程中搜索语义相关但关键词不同的素材，验证能否命中
- 1.2：创建一篇包含AI味关键词的文章，验证质量门槛能否检测并阻止
- 1.3：完成选题→大纲→初稿流程，验证初稿是否包含选题分析和风格学习的结果
- 2.1：创建与已有文章相似的选题，验证是否提示相似度
- 2.2：发布文章后，验证能否自动拉取平台效果数据
- 2.3：对文章运行SEO分析，验证是否给出关键词和标题优化建议
