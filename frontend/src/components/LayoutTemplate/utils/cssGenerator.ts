/**
 * 前端 CSS 生成工具
 * 用于实时预览
 */

import { LayoutTemplateConfig, HeadingStyle } from '../types';

export function generateCSS(config: LayoutTemplateConfig, themeId: string): string {
  const className = `.md-theme-${themeId}`;
  const rules: string[] = [];

  // 基础样式
  rules.push(generateBaseCSS(className, config.base));

  // 标题样式
  rules.push(generateHeadingsCSS(className, config.headings));

  // 段落样式
  rules.push(generateParagraphCSS(className, config.paragraph));

  // 引用块样式
  rules.push(generateBlockquoteCSS(className, config.blockquote));

  // 代码样式
  rules.push(generateCodeCSS(className, config.code));

  // 链接样式
  rules.push(generateLinkCSS(className, config.link));

  // 列表样式
  rules.push(generateListCSS(className, config.list));

  // 图片样式
  rules.push(generateImageCSS(className, config.image));

  // 自定义 CSS
  if (config.customCSS) {
    rules.push(config.customCSS);
  }

  return rules.filter(r => r).join('\n');
}

function generateBaseCSS(className: string, base: LayoutTemplateConfig['base']): string {
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

function generateHeadingsCSS(className: string, headings: LayoutTemplateConfig['headings']): string {
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

    return `${className} ${tag} { ${props.join('; ')}; }`;
  };

  rules.push(generateHeading('h1', headings.h1));
  rules.push(generateHeading('h2', headings.h2));
  rules.push(generateHeading('h3', headings.h3));

  return rules.join('\n');
}

function generateParagraphCSS(className: string, paragraph: LayoutTemplateConfig['paragraph']): string {
  const props: string[] = [`margin: ${paragraph.margin}`];
  if (paragraph.textIndent) props.push(`text-indent: ${paragraph.textIndent}em`);
  if (paragraph.textAlign) props.push(`text-align: ${paragraph.textAlign}`);
  return `${className} p { ${props.join('; ')}; }`;
}

function generateBlockquoteCSS(className: string, blockquote: LayoutTemplateConfig['blockquote']): string {
  const props: string[] = [`padding: ${blockquote.padding}`, `margin: ${blockquote.margin}`];
  if (blockquote.borderLeft) props.push(`border-left: ${blockquote.borderLeft}`);
  if (blockquote.backgroundColor) props.push(`background-color: ${blockquote.backgroundColor}`);
  if (blockquote.color) props.push(`color: ${blockquote.color}`);
  if (blockquote.borderRadius) props.push(`border-radius: ${blockquote.borderRadius}`);
  return `${className} blockquote { ${props.join('; ')}; }`;
}

function generateCodeCSS(className: string, code: LayoutTemplateConfig['code']): string {
  const rules: string[] = [];

  const inlineProps: string[] = [
    `background-color: ${code.inline.backgroundColor}`,
    `color: ${code.inline.color}`,
    `padding: ${code.inline.padding}`,
    `border-radius: ${code.inline.borderRadius}`,
  ];
  rules.push(`${className} code { ${inlineProps.join('; ')}; }`);

  const blockProps: string[] = [
    `background-color: ${code.block.backgroundColor}`,
    `padding: ${code.block.padding}`,
    `border-radius: ${code.block.borderRadius}`,
    'overflow-x: auto',
  ];
  if (code.block.color) blockProps.push(`color: ${code.block.color}`);
  rules.push(`${className} pre { ${blockProps.join('; ')}; }`);

  return rules.join('\n');
}

function generateLinkCSS(className: string, link: LayoutTemplateConfig['link']): string {
  const props: string[] = [`color: ${link.color}`, `text-decoration: ${link.textDecoration}`];
  if (link.borderBottom) props.push(`border-bottom: ${link.borderBottom}`);
  return `${className} a { ${props.join('; ')}; }`;
}

function generateListCSS(className: string, list: LayoutTemplateConfig['list']): string {
  const rules: string[] = [];
  rules.push(`${className} ul, ${className} ol { padding-left: ${list.paddingLeft}px; margin: ${list.margin}; }`);
  rules.push(`${className} li { margin: ${list.itemMargin}; }`);
  if (list.markerColor) {
    rules.push(`${className} li::marker { color: ${list.markerColor}; }`);
  }
  return rules.join('\n');
}

function generateImageCSS(className: string, image: LayoutTemplateConfig['image']): string {
  const props: string[] = [`max-width: ${image.maxWidth}`];
  if (image.borderRadius) props.push(`border-radius: ${image.borderRadius}`);
  if (image.margin) props.push(`margin: ${image.margin}`);
  if (image.boxShadow) props.push(`box-shadow: ${image.boxShadow}`);
  return `${className} img { ${props.join('; ')}; }`;
}
