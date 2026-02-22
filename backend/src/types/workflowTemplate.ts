/**
 * 工作流配置模板类型定义
 */

// 工作流步骤配置
export interface WorkflowStepConfig {
  enabled: boolean;
  required: boolean;
  name: string;
  label: string;
  description: string;
  promptTemplate?: string;  // 支持变量的 Prompt 模板
  variables?: string[];     // 该步骤支持的变量
}

// HKR 评估维度配置
export interface HKRDimensionConfig {
  name: string;
  description: string;
  criteria: string[];
  weight: number;
}

// 降AI味检查项
export interface AntiAICheckItem {
  pattern: string;
  action: string;
  enabled: boolean;
}

// 变量定义
export interface VariableDefinition {
  name: string;
  description: string;
  defaultValue?: string;
  required: boolean;
}

// 高级配置
export interface AdvancedConfig {
  maxRetries: number;
  timeout: number;
  temperature: number;
  enableAutoSave: boolean;
  autoSaveInterval: number;
}

// 完整的工作流配置模板
export interface WorkflowTemplateConfig {
  // 工作流步骤配置
  steps: {
    [stepIndex: number]: WorkflowStepConfig;
  };

  // 平台栏目风格配置
  columnStyles: {
    [platform: string]: {
      [column: string]: string;
    };
  };

  // HKR 评估维度配置
  hkrDimensions: {
    H: HKRDimensionConfig;
    K: HKRDimensionConfig;
    R: HKRDimensionConfig;
  };

  // 降AI味检查清单
  antiAIChecklist: AntiAICheckItem[];

  // Prompt 模板配置
  prompts: {
    topicDiscussion: string;
    outline: string;
    draft: string;
    review: string;
    hkr: string;
    hkrImprove: string;
    optimize: string;
  };

  // 变量定义
  variables: {
    [key: string]: VariableDefinition;
  };

  // 高级配置
  advanced: AdvancedConfig;
}

// 配置验证结果
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// 工作流模板（数据库模型对应）
export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'system' | 'custom';
  isSystem: boolean;
  isDefault: boolean;
  platform?: string;
  column?: string;
  config: string;  // JSON 字符串
  version: number;
  parentId?: string;
  usageCount: number;
  userId?: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 创建模板请求
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  platform?: string;
  column?: string;
  config: WorkflowTemplateConfig;
  isDefault?: boolean;
}

// 更新模板请求
export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  platform?: string;
  column?: string;
  config?: WorkflowTemplateConfig;
  isDefault?: boolean;
  isEnabled?: boolean;
}

// 导出配置格式
export interface ExportedTemplate {
  version: string;
  exportedAt: string;
  template: {
    name: string;
    description?: string;
    platform?: string;
    column?: string;
    config: WorkflowTemplateConfig;
  };
}

// 导入配置请求
export interface ImportTemplateRequest {
  data: ExportedTemplate;
  overwrite?: boolean;
  createVersion?: boolean;
}
