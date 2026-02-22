/**
 * 排版模板 CSS 生成服务
 * 将 LayoutTemplateConfig 转换为 CSS 样式
 */

import { LayoutTemplateConfig, HeadingStyle } from './types.js';

export class LayoutCSSGenerator {
  /**
   * 将配置转换为完整的 CSS 字符串
   */
  generateCSS(config: LayoutTemplateConfig, themeId: string): string {
    const className = `.md-theme-${themeId}`;
    const rules: string[] = [];

    // 基础样式
    rules.push(this.generateBaseCSS(className, config.base));

    // 标题样式
    rules.push(this.generateHeadingsCSS(className, config.headings));

    // 段落样式
    rules.push(this.generateParagraphCSS(className, config.paragraph));

    // 引用块样式
    rules.push(this.generateBlockquoteCSS(className, config.blockquote));

    // 代码样式
    rules.push(this.generateCodeCSS(className, config.code));

    // 链接样式
    rules.push(this.generateLinkCSS(className, config.link));

    // 列表样式
    rules.push(this.generateListCSS(className, config.list));

    // 图片样式
    rules.push(this.generateImageCSS(className, config.image));

    // 分割线样式
    if (config.hr) {
      rules.push(this.generateHrCSS(className, config.hr));
    }

    // 表格样式
    if (config.table) {
      rules.push(this.generateTableCSS(className, config.table));
    }

    // 强调样式
    if (config.emphasis) {
      rules.push(this.generateEmphasisCSS(className, config.emphasis));
    }

    // 自定义 CSS
    if (config.customCSS) {
      rules.push(config.customCSS);
    }

    return rules.filter(r => r).join('\n');
  }

  private generateBaseCSS(className: string, base: LayoutTemplateConfig['base']): string {
    const props: string[] = [
      `font-family: ${base.fontFamily}`,
      `font-size: ${base.fontSize}px`,
      `line-height: ${base.lineHeight}`,
      `color: ${base.color}`,
    ];

    if (base.backgroundColor) props.push(`background-color: ${base.backgroundColor}`);
    if (base.letterSpacing) props.push(`letter-spacing: ${base.letterSpacing}px`);
    if (base.maxWidth) props.push(`max-width: ${base.maxWidth}px`);
    if (base.padding) props.push(`padding: ${base.padding}px`);

    return `${className} { ${props.join('; ')}; }`;
  }

  private generateHeadingsCSS(className: string, headings: LayoutTemplateConfig['headings']): string {
    const rules: string[] = [];

    const generateHeading = (tag: string, style: HeadingStyle) => {
      const props: string[] = [
        `font-size: ${style.fontSize}px`,
        `font-weight: ${style.fontWeight}`,
        `margin: ${style.margin}`,
      ];

      if (style.color) props.push(`color: ${style.color}`);
      if (style.textAlign) props.push(`text-align: ${style.textAlign}`);
      if (style.borderBottom) props.push(`border-bottom: ${style.borderBottom}`);
      if (style.paddingBottom) props.push(`padding-bottom: ${style.paddingBottom}`);
      if (style.borderLeft) props.push(`border-left: ${style.borderLeft}`);
      if (style.paddingLeft) props.push(`padding-left: ${style.paddingLeft}`);
      if (style.background) props.push(`background: ${style.background}`);
      if (style.letterSpacing) props.push(`letter-spacing: ${style.letterSpacing}`);

      return `${className} ${tag} { ${props.join('; ')}; }`;
    };

    rules.push(generateHeading('h1', headings.h1));
    rules.push(generateHeading('h2', headings.h2));
    rules.push(generateHeading('h3', headings.h3));
    if (headings.h4) rules.push(generateHeading('h4', headings.h4));
    if (headings.h5) rules.push(generateHeading('h5', headings.h5));
    if (headings.h6) rules.push(generateHeading('h6', headings.h6));

    return rules.join('\n');
  }

  private generateParagraphCSS(className: string, paragraph: LayoutTemplateConfig['paragraph']): string {
    const props: string[] = [`margin: ${paragraph.margin}`];

    if (paragraph.textIndent) props.push(`text-indent: ${paragraph.textIndent}em`);
    if (paragraph.textAlign) props.push(`text-align: ${paragraph.textAlign}`);

    return `${className} p { ${props.join('; ')}; }`;
  }

  private generateBlockquoteCSS(className: string, blockquote: LayoutTemplateConfig['blockquote']): string {
    const props: string[] = [
      `padding: ${blockquote.padding}`,
      `margin: ${blockquote.margin}`,
    ];

    if (blockquote.borderLeft) props.push(`border-left: ${blockquote.borderLeft}`);
    if (blockquote.backgroundColor) props.push(`background-color: ${blockquote.backgroundColor}`);
    if (blockquote.color) props.push(`color: ${blockquote.color}`);
    if (blockquote.borderRadius) props.push(`border-radius: ${blockquote.borderRadius}`);

    return `${className} blockquote { ${props.join('; ')}; }`;
  }

  private generateCodeCSS(className: string, code: LayoutTemplateConfig['code']): string {
    const rules: string[] = [];

    // 行内代码
    const inlineProps: string[] = [
      `background-color: ${code.inline.backgroundColor}`,
      `color: ${code.inline.color}`,
      `padding: ${code.inline.padding}`,
      `border-radius: ${code.inline.borderRadius}`,
    ];
    if (code.inline.fontSize) inlineProps.push(`font-size: ${code.inline.fontSize}px`);
    rules.push(`${className} code { ${inlineProps.join('; ')}; }`);

    // 代码块
    const blockProps: string[] = [
      `background-color: ${code.block.backgroundColor}`,
      `padding: ${code.block.padding}`,
      `border-radius: ${code.block.borderRadius}`,
      'overflow-x: auto',
    ];
    if (code.block.color) blockProps.push(`color: ${code.block.color}`);
    if (code.block.border) blockProps.push(`border: ${code.block.border}`);
    rules.push(`${className} pre { ${blockProps.join('; ')}; }`);

    return rules.join('\n');
  }

  private generateLinkCSS(className: string, link: LayoutTemplateConfig['link']): string {
    const props: string[] = [
      `color: ${link.color}`,
      `text-decoration: ${link.textDecoration}`,
    ];

    if (link.borderBottom) props.push(`border-bottom: ${link.borderBottom}`);

    return `${className} a { ${props.join('; ')}; }`;
  }

  private generateListCSS(className: string, list: LayoutTemplateConfig['list']): string {
    const rules: string[] = [];

    rules.push(`${className} ul, ${className} ol { padding-left: ${list.paddingLeft}px; margin: ${list.margin}; }`);
    rules.push(`${className} li { margin: ${list.itemMargin}; }`);

    if (list.markerColor) {
      rules.push(`${className} li::marker { color: ${list.markerColor}; }`);
    }

    return rules.join('\n');
  }

  private generateImageCSS(className: string, image: LayoutTemplateConfig['image']): string {
    const props: string[] = [`max-width: ${image.maxWidth}`];

    if (image.borderRadius) props.push(`border-radius: ${image.borderRadius}`);
    if (image.margin) props.push(`margin: ${image.margin}`);
    if (image.boxShadow) props.push(`box-shadow: ${image.boxShadow}`);
    if (image.border) props.push(`border: ${image.border}`);

    return `${className} img { ${props.join('; ')}; }`;
  }

  private generateHrCSS(className: string, hr: NonNullable<LayoutTemplateConfig['hr']>): string {
    return `${className} hr { border: ${hr.border}; margin: ${hr.margin}; }`;
  }

  private generateTableCSS(className: string, table: NonNullable<LayoutTemplateConfig['table']>): string {
    const rules: string[] = [];

    const tableProps: string[] = [`border-collapse: ${table.borderCollapse}`];
    if (table.border) tableProps.push(`border: ${table.border}`);
    rules.push(`${className} table { ${tableProps.join('; ')}; width: 100%; }`);

    if (table.headerBackground) {
      rules.push(`${className} th { background-color: ${table.headerBackground}; }`);
    }

    if (table.cellPadding) {
      rules.push(`${className} th, ${className} td { padding: ${table.cellPadding}; }`);
    }

    if (table.border) {
      rules.push(`${className} th, ${className} td { border: ${table.border}; }`);
    }

    return rules.join('\n');
  }

  private generateEmphasisCSS(className: string, emphasis: NonNullable<LayoutTemplateConfig['emphasis']>): string {
    const rules: string[] = [];

    if (emphasis.strong) {
      const props: string[] = [];
      if (emphasis.strong.color) props.push(`color: ${emphasis.strong.color}`);
      if (emphasis.strong.fontWeight) props.push(`font-weight: ${emphasis.strong.fontWeight}`);
      if (props.length > 0) {
        rules.push(`${className} strong { ${props.join('; ')}; }`);
      }
    }

    if (emphasis.em) {
      const props: string[] = [];
      if (emphasis.em.color) props.push(`color: ${emphasis.em.color}`);
      if (emphasis.em.fontStyle) props.push(`font-style: ${emphasis.em.fontStyle}`);
      if (props.length > 0) {
        rules.push(`${className} em { ${props.join('; ')}; }`);
      }
    }

    return rules.join('\n');
  }

  /**
   * 生成内联样式映射（用于一键复制功能）
   */
  generateInlineStyles(config: LayoutTemplateConfig): Record<string, string> {
    const styles: Record<string, string> = {};

    // 基础样式
    const baseStyles = [
      `font-family: ${config.base.fontFamily}`,
      `font-size: ${config.base.fontSize}px`,
      `line-height: ${config.base.lineHeight}`,
      `color: ${config.base.color}`,
    ];
    if (config.base.letterSpacing) baseStyles.push(`letter-spacing: ${config.base.letterSpacing}px`);
    styles['body'] = baseStyles.join('; ');

    // 标题样式
    const generateHeadingInline = (style: HeadingStyle): string => {
      const props = [
        `font-size: ${style.fontSize}px`,
        `font-weight: ${style.fontWeight}`,
        `margin: ${style.margin}`,
      ];
      if (style.color) props.push(`color: ${style.color}`);
      if (style.textAlign) props.push(`text-align: ${style.textAlign}`);
      if (style.borderBottom) props.push(`border-bottom: ${style.borderBottom}`);
      if (style.paddingBottom) props.push(`padding-bottom: ${style.paddingBottom}`);
      if (style.borderLeft) props.push(`border-left: ${style.borderLeft}`);
      if (style.paddingLeft) props.push(`padding-left: ${style.paddingLeft}`);
      return props.join('; ');
    };

    styles['h1'] = generateHeadingInline(config.headings.h1);
    styles['h2'] = generateHeadingInline(config.headings.h2);
    styles['h3'] = generateHeadingInline(config.headings.h3);

    // 段落样式
    const pProps = [`margin: ${config.paragraph.margin}`];
    if (config.paragraph.textIndent) pProps.push(`text-indent: ${config.paragraph.textIndent}em`);
    if (config.paragraph.textAlign) pProps.push(`text-align: ${config.paragraph.textAlign}`);
    styles['p'] = pProps.join('; ');

    // 引用块样式
    const bqProps = [`padding: ${config.blockquote.padding}`, `margin: ${config.blockquote.margin}`];
    if (config.blockquote.borderLeft) bqProps.push(`border-left: ${config.blockquote.borderLeft}`);
    if (config.blockquote.backgroundColor) bqProps.push(`background-color: ${config.blockquote.backgroundColor}`);
    if (config.blockquote.color) bqProps.push(`color: ${config.blockquote.color}`);
    styles['blockquote'] = bqProps.join('; ');

    // 代码样式
    styles['code'] = [
      `background-color: ${config.code.inline.backgroundColor}`,
      `color: ${config.code.inline.color}`,
      `padding: ${config.code.inline.padding}`,
      `border-radius: ${config.code.inline.borderRadius}`,
    ].join('; ');

    styles['pre'] = [
      `background-color: ${config.code.block.backgroundColor}`,
      `padding: ${config.code.block.padding}`,
      `border-radius: ${config.code.block.borderRadius}`,
      'overflow-x: auto',
    ].join('; ');

    // 链接样式
    const linkProps = [`color: ${config.link.color}`, `text-decoration: ${config.link.textDecoration}`];
    if (config.link.borderBottom) linkProps.push(`border-bottom: ${config.link.borderBottom}`);
    styles['a'] = linkProps.join('; ');

    // 列表样式
    styles['ul'] = `padding-left: ${config.list.paddingLeft}px; margin: ${config.list.margin}`;
    styles['ol'] = styles['ul'];
    styles['li'] = `margin: ${config.list.itemMargin}`;

    // 图片样式
    const imgProps = [`max-width: ${config.image.maxWidth}`];
    if (config.image.borderRadius) imgProps.push(`border-radius: ${config.image.borderRadius}`);
    if (config.image.boxShadow) imgProps.push(`box-shadow: ${config.image.boxShadow}`);
    styles['img'] = imgProps.join('; ');

    // 强调样式
    if (config.emphasis?.strong?.color) {
      styles['strong'] = `color: ${config.emphasis.strong.color}`;
    }

    return styles;
  }
}

export const layoutCSSGenerator = new LayoutCSSGenerator();
