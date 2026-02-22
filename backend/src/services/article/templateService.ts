/**
 * 工作流配置模板服务
 */

import { PrismaClient } from '@prisma/client';
import {
  WorkflowTemplateConfig,
  ValidationResult,
} from '../../types/workflowTemplate.js';

const prisma = new PrismaClient();

/**
 * 加载配置模板
 */
export async function loadTemplate(templateId: string): Promise<WorkflowTemplateConfig> {
  const template = await prisma.workflowTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    throw new Error('配置模板不存在');
  }

  if (!template.isEnabled) {
    throw new Error('配置模板已禁用');
  }

  try {
    const config = JSON.parse(template.config);
    return config as WorkflowTemplateConfig;
  } catch (error) {
    throw new Error('配置模板格式错误');
  }
}

/**
 * 变量替换
 */
export function replaceVariables(
  template: string,
  variables: Record<string, any>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, String(value || ''));
  }
  return result;
}

/**
 * 应用配置模板到 Prompt 构建
 */
export function buildPromptWithTemplate(
  templateConfig: WorkflowTemplateConfig,
  promptType: string,
  variables: Record<string, any>
): string {
  const promptTemplate = (templateConfig.prompts as any)[promptType];
  if (!promptTemplate) {
    throw new Error(`Prompt 类型 "${promptType}" 不存在`);
  }

  return replaceVariables(promptTemplate, variables);
}

/**
 * 提取模板中的变量
 */
function extractVariables(template: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const variables: string[] = [];
  let match;
  while ((match = regex.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  return variables;
}

/**
 * 验证配置模板
 */
export function validateTemplate(config: WorkflowTemplateConfig): ValidationResult {
  const errors: string[] = [];

  // 检查必需字段
  if (!config.steps || Object.keys(config.steps).length === 0) {
    errors.push('至少需要配置一个步骤');
  }

  // 检查 Prompt 模板
  if (!config.prompts) {
    errors.push('缺少 Prompt 模板配置');
  } else {
    // 检查 Prompt 模板中的变量
    for (const [key, prompt] of Object.entries(config.prompts)) {
      if (typeof prompt !== 'string') continue;
      const variables = extractVariables(prompt);
      for (const variable of variables) {
        if (!config.variables || !config.variables[variable]) {
          errors.push(`Prompt "${key}" 中使用了未定义的变量: {{${variable}}}`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
