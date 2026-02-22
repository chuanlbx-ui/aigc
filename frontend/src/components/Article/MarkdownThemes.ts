// Markdown 排版主题样式定义
// 参考微信公众号排版工具的主题风格

export interface MarkdownTheme {
  id: string;
  name: string;
  description: string;
  styles: string;
}

// 主题列表
export const MARKDOWN_THEMES: MarkdownTheme[] = [
  {
    id: 'default',
    name: '默认',
    description: '简洁清爽的默认样式',
    styles: `
      .md-theme-default {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 15px;
        line-height: 1.8;
        color: #333;
      }
      .md-theme-default h1 { font-size: 24px; font-weight: bold; margin: 24px 0 16px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
      .md-theme-default h2 { font-size: 20px; font-weight: bold; margin: 20px 0 12px; }
      .md-theme-default h3 { font-size: 17px; font-weight: bold; margin: 16px 0 8px; }
      .md-theme-default p { margin: 12px 0; }
      .md-theme-default blockquote { border-left: 4px solid #ddd; padding-left: 16px; color: #666; margin: 16px 0; }
      .md-theme-default code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 14px; }
      .md-theme-default pre { background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto; }
      .md-theme-default img { max-width: 100%; border-radius: 4px; }
      .md-theme-default a { color: #1890ff; text-decoration: none; }
      .md-theme-default ul, .md-theme-default ol { padding-left: 24px; margin: 12px 0; }
      .md-theme-default li { margin: 6px 0; }
    `,
  },
  {
    id: 'wechat-elegant',
    name: '微信优雅',
    description: '适合公众号的优雅排版',
    styles: `
      .md-theme-wechat-elegant {
        font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
        font-size: 16px;
        line-height: 2;
        color: #3f3f3f;
        letter-spacing: 0.5px;
      }
      .md-theme-wechat-elegant h1 { font-size: 22px; font-weight: bold; text-align: center; margin: 32px 0 24px; color: #1a1a1a; }
      .md-theme-wechat-elegant h2 { font-size: 18px; font-weight: bold; margin: 28px 0 16px; padding-left: 12px; border-left: 4px solid #07c160; color: #1a1a1a; }
      .md-theme-wechat-elegant h3 { font-size: 16px; font-weight: bold; margin: 20px 0 12px; color: #07c160; }
      .md-theme-wechat-elegant p { margin: 16px 0; text-align: justify; }
      .md-theme-wechat-elegant blockquote { background: #f7f7f7; border-left: 4px solid #07c160; padding: 12px 16px; margin: 20px 0; color: #666; font-size: 15px; }
      .md-theme-wechat-elegant code { background: #fff5f5; color: #ff502c; padding: 2px 6px; border-radius: 3px; font-size: 14px; }
      .md-theme-wechat-elegant pre { background: #282c34; color: #abb2bf; padding: 16px; border-radius: 8px; overflow-x: auto; }
      .md-theme-wechat-elegant img { max-width: 100%; border-radius: 8px; margin: 16px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
      .md-theme-wechat-elegant a { color: #07c160; text-decoration: none; border-bottom: 1px solid #07c160; }
      .md-theme-wechat-elegant strong { color: #07c160; }
      .md-theme-wechat-elegant ul, .md-theme-wechat-elegant ol { padding-left: 24px; margin: 16px 0; }
      .md-theme-wechat-elegant li { margin: 8px 0; }
    `,
  },
  {
    id: 'tech-dark',
    name: '科技深色',
    description: '适合技术文章的深色主题',
    styles: `
      .md-theme-tech-dark {
        font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
        font-size: 15px;
        line-height: 1.8;
        color: #e0e0e0;
        background: #1e1e1e;
        padding: 24px;
      }
      .md-theme-tech-dark h1 { font-size: 24px; font-weight: bold; margin: 24px 0 16px; color: #61dafb; border-bottom: 2px solid #61dafb; padding-bottom: 8px; }
      .md-theme-tech-dark h2 { font-size: 20px; font-weight: bold; margin: 20px 0 12px; color: #98c379; }
      .md-theme-tech-dark h3 { font-size: 17px; font-weight: bold; margin: 16px 0 8px; color: #e5c07b; }
      .md-theme-tech-dark p { margin: 12px 0; }
      .md-theme-tech-dark blockquote { border-left: 4px solid #61dafb; padding-left: 16px; color: #abb2bf; margin: 16px 0; background: #282c34; padding: 12px 16px; }
      .md-theme-tech-dark code { background: #282c34; color: #e06c75; padding: 2px 6px; border-radius: 3px; font-size: 14px; }
      .md-theme-tech-dark pre { background: #282c34; padding: 16px; border-radius: 6px; overflow-x: auto; border: 1px solid #3e4451; }
      .md-theme-tech-dark img { max-width: 100%; border-radius: 4px; border: 1px solid #3e4451; }
      .md-theme-tech-dark a { color: #61dafb; text-decoration: none; }
      .md-theme-tech-dark ul, .md-theme-tech-dark ol { padding-left: 24px; margin: 12px 0; }
      .md-theme-tech-dark li { margin: 6px 0; }
      .md-theme-tech-dark li::marker { color: #61dafb; }
    `,
  },
  {
    id: 'xiaohongshu',
    name: '小红书风格',
    description: '活泼可爱的小红书风格',
    styles: `
      .md-theme-xiaohongshu {
        font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
        font-size: 15px;
        line-height: 2;
        color: #333;
      }
      .md-theme-xiaohongshu h1 { font-size: 20px; font-weight: bold; text-align: center; margin: 24px 0 16px; color: #ff2442; }
      .md-theme-xiaohongshu h2 { font-size: 17px; font-weight: bold; margin: 20px 0 12px; color: #ff2442; display: inline-block; background: linear-gradient(to bottom, transparent 60%, #ffe4e8 60%); }
      .md-theme-xiaohongshu h3 { font-size: 15px; font-weight: bold; margin: 16px 0 8px; color: #ff6b81; }
      .md-theme-xiaohongshu p { margin: 12px 0; }
      .md-theme-xiaohongshu blockquote { background: #fff5f6; border-left: 4px solid #ff2442; padding: 12px 16px; margin: 16px 0; color: #666; border-radius: 0 8px 8px 0; }
      .md-theme-xiaohongshu code { background: #ffe4e8; color: #ff2442; padding: 2px 6px; border-radius: 4px; font-size: 14px; }
      .md-theme-xiaohongshu pre { background: #fff5f6; padding: 16px; border-radius: 12px; overflow-x: auto; }
      .md-theme-xiaohongshu img { max-width: 100%; border-radius: 12px; margin: 12px 0; }
      .md-theme-xiaohongshu a { color: #ff2442; text-decoration: none; }
      .md-theme-xiaohongshu strong { color: #ff2442; }
      .md-theme-xiaohongshu ul, .md-theme-xiaohongshu ol { padding-left: 20px; margin: 12px 0; }
      .md-theme-xiaohongshu li { margin: 8px 0; }
      .md-theme-xiaohongshu li::marker { color: #ff2442; }
    `,
  },
  {
    id: 'minimalist',
    name: '极简主义',
    description: '简约大气的极简风格',
    styles: `
      .md-theme-minimalist {
        font-family: "Helvetica Neue", Arial, sans-serif;
        font-size: 16px;
        line-height: 1.9;
        color: #2c3e50;
        max-width: 680px;
        margin: 0 auto;
      }
      .md-theme-minimalist h1 { font-size: 28px; font-weight: 300; margin: 40px 0 24px; color: #1a1a1a; letter-spacing: -0.5px; }
      .md-theme-minimalist h2 { font-size: 22px; font-weight: 400; margin: 32px 0 16px; color: #1a1a1a; }
      .md-theme-minimalist h3 { font-size: 18px; font-weight: 500; margin: 24px 0 12px; color: #1a1a1a; }
      .md-theme-minimalist p { margin: 16px 0; }
      .md-theme-minimalist blockquote { border-left: 2px solid #1a1a1a; padding-left: 20px; color: #666; margin: 24px 0; font-style: italic; }
      .md-theme-minimalist code { background: #f8f8f8; padding: 2px 6px; border-radius: 2px; font-size: 14px; }
      .md-theme-minimalist pre { background: #f8f8f8; padding: 20px; border-radius: 2px; overflow-x: auto; }
      .md-theme-minimalist img { max-width: 100%; margin: 24px 0; }
      .md-theme-minimalist a { color: #1a1a1a; text-decoration: underline; }
      .md-theme-minimalist ul, .md-theme-minimalist ol { padding-left: 24px; margin: 16px 0; }
      .md-theme-minimalist li { margin: 8px 0; }
    `,
  },
  {
    id: 'warm-paper',
    name: '暖色纸张',
    description: '温暖舒适的阅读体验',
    styles: `
      .md-theme-warm-paper {
        font-family: "Georgia", "Times New Roman", serif;
        font-size: 16px;
        line-height: 2;
        color: #4a4a4a;
        background: #fdf6e3;
        padding: 24px;
      }
      .md-theme-warm-paper h1 { font-size: 26px; font-weight: bold; margin: 28px 0 20px; color: #b58900; text-align: center; }
      .md-theme-warm-paper h2 { font-size: 21px; font-weight: bold; margin: 24px 0 14px; color: #cb4b16; }
      .md-theme-warm-paper h3 { font-size: 18px; font-weight: bold; margin: 18px 0 10px; color: #d33682; }
      .md-theme-warm-paper p { margin: 14px 0; text-indent: 2em; }
      .md-theme-warm-paper blockquote { background: #eee8d5; border-left: 4px solid #b58900; padding: 14px 18px; margin: 18px 0; color: #657b83; }
      .md-theme-warm-paper code { background: #eee8d5; color: #dc322f; padding: 2px 6px; border-radius: 3px; font-size: 14px; }
      .md-theme-warm-paper pre { background: #002b36; color: #839496; padding: 16px; border-radius: 6px; overflow-x: auto; }
      .md-theme-warm-paper img { max-width: 100%; border-radius: 6px; margin: 16px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
      .md-theme-warm-paper a { color: #268bd2; text-decoration: none; border-bottom: 1px dashed #268bd2; }
      .md-theme-warm-paper ul, .md-theme-warm-paper ol { padding-left: 24px; margin: 14px 0; }
      .md-theme-warm-paper li { margin: 8px 0; }
    `,
  },
];

// 获取主题样式类名
export function getThemeClassName(themeId: string): string {
  return `md-theme-${themeId}`;
}

// 获取所有主题的 CSS
export function getAllThemeStyles(): string {
  return MARKDOWN_THEMES.map(t => t.styles).join('\n');
}
