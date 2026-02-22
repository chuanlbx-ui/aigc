/**
 * 统一模板服务类型定义
 */

// 模板类型枚举
export type TemplateType = 'popup' | 'workflow' | 'general' | 'layout';

// ========== 排版模板配置类型 ==========

// 标题样式
export interface HeadingStyle {
  fontSize: number;
  fontWeight: string | number;
  margin: string;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  borderBottom?: string;
  paddingBottom?: string;
  borderLeft?: string;
  paddingLeft?: string;
  background?: string;
  letterSpacing?: string;
}

// 排版模板配置
export interface LayoutTemplateConfig {
  version: '1.0';

  // 基础样式
  base: {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    color: string;
    backgroundColor?: string;
    letterSpacing?: number;
    maxWidth?: number;
    padding?: number;
  };

  // 标题样式
  headings: {
    h1: HeadingStyle;
    h2: HeadingStyle;
    h3: HeadingStyle;
    h4?: HeadingStyle;
    h5?: HeadingStyle;
    h6?: HeadingStyle;
  };

  // 段落样式
  paragraph: {
    margin: string;
    textIndent?: number;
    textAlign?: 'left' | 'justify' | 'center';
  };

  // 引用块样式
  blockquote: {
    borderLeft?: string;
    backgroundColor?: string;
    padding: string;
    margin: string;
    color?: string;
    borderRadius?: string;
  };

  // 代码样式
  code: {
    inline: {
      backgroundColor: string;
      color: string;
      padding: string;
      borderRadius: string;
      fontSize?: number;
    };
    block: {
      backgroundColor: string;
      color?: string;
      padding: string;
      borderRadius: string;
      border?: string;
    };
  };

  // 链接样式
  link: {
    color: string;
    textDecoration: string;
    borderBottom?: string;
  };

  // 列表样式
  list: {
    paddingLeft: number;
    margin: string;
    itemMargin: string;
    markerColor?: string;
  };

  // 图片样式
  image: {
    maxWidth: string;
    borderRadius?: string;
    margin?: string;
    boxShadow?: string;
    border?: string;
  };

  // 分割线样式
  hr?: {
    border: string;
    margin: string;
  };

  // 表格样式
  table?: {
    borderCollapse: 'collapse' | 'separate';
    border?: string;
    headerBackground?: string;
    cellPadding?: string;
  };

  // 强调样式
  emphasis?: {
    strong?: { color?: string; fontWeight?: string };
    em?: { color?: string; fontStyle?: string };
  };

  // 自定义 CSS
  customCSS?: string;
}

// 模板分类
export type TemplateCategory = 'system' | 'custom';

// 统一模板接口
export interface UnifiedTemplate {
  id: string;
  type: TemplateType;
  name: string;
  description?: string;
  category: TemplateCategory;
  isSystem: boolean;
  config: Record<string, any>;
  thumbnail?: string;
  platform?: string;
  column?: string;
  tags?: string[];
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
}

// 模板筛选条件
export interface TemplateFilters {
  type?: TemplateType;
  category?: TemplateCategory;
  platform?: string;
  column?: string;
  tags?: string[];
  search?: string;
  isSystem?: boolean;
  userId?: string;
}

// 模板创建数据
export interface CreateTemplateData {
  type: TemplateType;
  name: string;
  description?: string;
  config: Record<string, any>;
  thumbnail?: string;
  platform?: string;
  column?: string;
  tags?: string[];
}

// 模板更新数据
export interface UpdateTemplateData {
  name?: string;
  description?: string;
  config?: Record<string, any>;
  thumbnail?: string;
  platform?: string;
  column?: string;
  tags?: string[];
  isEnabled?: boolean;
}

// 模板列表响应
export interface TemplateListResponse {
  templates: UnifiedTemplate[];
  total: number;
  page: number;
  pageSize: number;
}

// 分页参数
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}
