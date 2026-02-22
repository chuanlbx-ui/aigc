/**
 * 模板引擎服务
 * 基于 Handlebars 实现高级模板语法
 */

// 模板变量
export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  defaultValue?: any;
  description?: string;
}

// 模板上下文
export interface TemplateContext {
  [key: string]: any;
}

// 渲染选项
export interface RenderOptions {
  strict?: boolean;
  helpers?: Record<string, Function>;
}

export class TemplateEngine {
  private helpers: Record<string, Function> = {};

  constructor() {
    this.registerDefaultHelpers();
  }

  /**
   * 注册默认辅助函数
   */
  private registerDefaultHelpers(): void {
    // 大写转换
    this.helpers['uppercase'] = (str: string) =>
      typeof str === 'string' ? str.toUpperCase() : str;

    // 小写转换
    this.helpers['lowercase'] = (str: string) =>
      typeof str === 'string' ? str.toLowerCase() : str;

    // 日期格式化
    this.helpers['formatDate'] = (date: string | Date, format?: string) => {
      const d = new Date(date);
      if (isNaN(d.getTime())) return date;
      return d.toLocaleDateString('zh-CN');
    };

    // 数字格式化
    this.helpers['formatNumber'] = (num: number) =>
      typeof num === 'number' ? num.toLocaleString('zh-CN') : num;
  }

  /**
   * 注册自定义辅助函数
   */
  registerHelper(name: string, fn: Function): void {
    this.helpers[name] = fn;
  }

  /**
   * 渲染模板
   */
  render(template: string, context: TemplateContext, options?: RenderOptions): string {
    let result = template;

    // 合并辅助函数
    const allHelpers = { ...this.helpers, ...options?.helpers };

    // 处理辅助函数调用 {{helper arg}}
    result = this.processHelpers(result, context, allHelpers);

    // 处理条件语句 {{#if}}...{{/if}}
    result = this.processConditions(result, context);

    // 处理循环 {{#each}}...{{/each}}
    result = this.processLoops(result, context);

    // 处理简单变量替换 {{variable}}
    result = this.processVariables(result, context);

    return result;
  }

  /**
   * 处理辅助函数
   */
  private processHelpers(
    template: string,
    context: TemplateContext,
    helpers: Record<string, Function>
  ): string {
    // 匹配 {{helperName arg}}
    const pattern = /\{\{(\w+)\s+([^}]+)\}\}/g;

    return template.replace(pattern, (match, helperName, argExpr) => {
      const helper = helpers[helperName];
      if (!helper) return match;

      const argValue = this.resolveValue(argExpr.trim(), context);
      return String(helper(argValue));
    });
  }

  /**
   * 处理条件语句
   */
  private processConditions(template: string, context: TemplateContext): string {
    // 匹配 {{#if condition}}...{{/if}}
    const pattern = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

    return template.replace(pattern, (match, condition, content) => {
      const value = this.evaluateCondition(condition.trim(), context);
      return value ? content : '';
    });
  }

  /**
   * 处理循环
   */
  private processLoops(template: string, context: TemplateContext): string {
    const pattern = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

    return template.replace(pattern, (match, arrayName, itemTemplate) => {
      const array = context[arrayName];
      if (!Array.isArray(array)) return '';

      return array.map((item, index) => {
        const itemContext = { ...context, this: item, '@index': index };
        return this.processVariables(itemTemplate, itemContext);
      }).join('');
    });
  }

  /**
   * 处理变量替换
   */
  private processVariables(template: string, context: TemplateContext): string {
    const pattern = /\{\{([^#/][^}]*)\}\}/g;

    return template.replace(pattern, (match, varName) => {
      const value = this.resolveValue(varName.trim(), context);
      return value !== undefined ? String(value) : '';
    });
  }

  /**
   * 解析变量值
   */
  private resolveValue(path: string, context: TemplateContext): any {
    const parts = path.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value === undefined || value === null) return undefined;
      value = value[part];
    }

    return value;
  }

  /**
   * 评估条件表达式
   */
  private evaluateCondition(condition: string, context: TemplateContext): boolean {
    // 简单相等比较 variable === 'value'
    const eqMatch = condition.match(/(\w+)\s*===?\s*['"]([^'"]+)['"]/);
    if (eqMatch) {
      const [, varName, expected] = eqMatch;
      return context[varName] === expected;
    }

    // 简单变量真值判断
    const value = this.resolveValue(condition, context);
    return Boolean(value);
  }
}
