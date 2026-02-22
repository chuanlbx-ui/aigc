/**
 * 排版模板实时预览组件
 */

import React, { useMemo } from 'react';
import { generateCSS } from './utils/cssGenerator';
import { LayoutTemplateConfig } from './types';

interface LayoutTemplatePreviewProps {
  config: LayoutTemplateConfig;
  themeId?: string;
}

const PREVIEW_CONTENT = `
# 一级标题示例

这是一段正文内容，用于展示当前排版模板的效果。文字会根据配置的字体、字号、行高和颜色进行渲染。

## 二级标题示例

段落之间会有适当的间距，让阅读更加舒适。这里是第二段文字，可以看到段落样式的效果。

### 三级标题示例

> 这是一段引用文字，通常用于引用他人的观点或者强调某些重要内容。引用块有独特的样式。

下面是一些常用的文本格式：

- 无序列表项 1
- 无序列表项 2
- 无序列表项 3

1. 有序列表项 1
2. 有序列表项 2
3. 有序列表项 3

这是一个 \`行内代码\` 的示例，用于展示代码样式。

\`\`\`javascript
// 代码块示例
function hello() {
  console.log('Hello, World!');
}
\`\`\`

这是一个[链接示例](#)，点击可以跳转到其他页面。

---

以上就是排版模板的预览效果。
`;

export const LayoutTemplatePreview: React.FC<LayoutTemplatePreviewProps> = ({
  config,
  themeId = 'preview'
}) => {
  const css = useMemo(() => generateCSS(config, themeId), [config, themeId]);
  const className = `md-theme-${themeId}`;

  // 简单的 Markdown 转 HTML
  const html = useMemo(() => {
    return convertMarkdownToHTML(PREVIEW_CONTENT);
  }, []);

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <style>{css}</style>
      <div
        className={className}
        style={{ padding: 24 }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};

// 简单的 Markdown 转 HTML 函数
function convertMarkdownToHTML(markdown: string): string {
  let html = markdown;

  // 代码块
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 标题
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // 引用
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // 分割线
  html = html.replace(/^---$/gm, '<hr />');

  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // 有序列表
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
    if (match.includes('无序')) return match;
    return `<ol>${match}</ol>`;
  });

  // 无序列表
  html = html.replace(/^- (.+)$/gm, '<li class="ul-item">$1</li>');
  html = html.replace(/(<li class="ul-item">.*<\/li>\n?)+/g, (match) => {
    return `<ul>${match.replace(/class="ul-item"/g, '')}</ul>`;
  });

  // 段落
  html = html.replace(/^(?!<[hpuolbca]|<\/|<hr)(.+)$/gm, '<p>$1</p>');

  // 清理空行
  html = html.replace(/<p><\/p>/g, '');

  return html;
}

export default LayoutTemplatePreview;
