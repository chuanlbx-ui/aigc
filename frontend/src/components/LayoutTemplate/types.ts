/**
 * 排版模板类型定义
 */

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
  headings: {
    h1: HeadingStyle;
    h2: HeadingStyle;
    h3: HeadingStyle;
    h4?: HeadingStyle;
    h5?: HeadingStyle;
    h6?: HeadingStyle;
  };
  paragraph: {
    margin: string;
    textIndent?: number;
    textAlign?: 'left' | 'justify' | 'center';
  };
  blockquote: {
    borderLeft?: string;
    backgroundColor?: string;
    padding: string;
    margin: string;
    color?: string;
    borderRadius?: string;
  };
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
  link: {
    color: string;
    textDecoration: string;
    borderBottom?: string;
  };
  list: {
    paddingLeft: number;
    margin: string;
    itemMargin: string;
    markerColor?: string;
  };
  image: {
    maxWidth: string;
    borderRadius?: string;
    margin?: string;
    boxShadow?: string;
    border?: string;
  };
  hr?: {
    border: string;
    margin: string;
  };
  table?: {
    borderCollapse: 'collapse' | 'separate';
    border?: string;
    headerBackground?: string;
    cellPadding?: string;
  };
  emphasis?: {
    strong?: { color?: string; fontWeight?: string };
    em?: { color?: string; fontStyle?: string };
  };
  customCSS?: string;
}

// 排版模板
export interface LayoutTemplate {
  id: string;
  name: string;
  description?: string;
  config: LayoutTemplateConfig;
  isSystem: boolean;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}
