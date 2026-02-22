/**
 * 内置排版主题配置
 */

import { LayoutTemplateConfig } from '../types';

// 默认主题配置
export const defaultThemeConfig: LayoutTemplateConfig = {
  version: '1.0',
  base: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 15,
    lineHeight: 1.8,
    color: '#333',
  },
  headings: {
    h1: { fontSize: 24, fontWeight: 'bold', margin: '24px 0 16px', borderBottom: '1px solid #eee', paddingBottom: '8px' },
    h2: { fontSize: 20, fontWeight: 'bold', margin: '20px 0 12px' },
    h3: { fontSize: 17, fontWeight: 'bold', margin: '16px 0 8px' },
  },
  paragraph: { margin: '12px 0' },
  blockquote: { borderLeft: '4px solid #ddd', padding: '0 0 0 16px', margin: '16px 0', color: '#666' },
  code: {
    inline: { backgroundColor: '#f5f5f5', color: '#333', padding: '2px 6px', borderRadius: '3px', fontSize: 14 },
    block: { backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '6px' },
  },
  link: { color: '#1890ff', textDecoration: 'none' },
  list: { paddingLeft: 24, margin: '12px 0', itemMargin: '6px 0' },
  image: { maxWidth: '100%', borderRadius: '4px' },
};

// 微信优雅主题
export const wechatElegantConfig: LayoutTemplateConfig = {
  version: '1.0',
  base: {
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: 16,
    lineHeight: 2,
    color: '#3f3f3f',
    letterSpacing: 0.5,
  },
  headings: {
    h1: { fontSize: 22, fontWeight: 'bold', margin: '32px 0 24px', color: '#1a1a1a', textAlign: 'center' },
    h2: { fontSize: 18, fontWeight: 'bold', margin: '28px 0 16px', color: '#1a1a1a', borderLeft: '4px solid #07c160', paddingLeft: '12px' },
    h3: { fontSize: 16, fontWeight: 'bold', margin: '20px 0 12px', color: '#07c160' },
  },
  paragraph: { margin: '16px 0', textAlign: 'justify' },
  blockquote: { backgroundColor: '#f7f7f7', borderLeft: '4px solid #07c160', padding: '12px 16px', margin: '20px 0', color: '#666' },
  code: {
    inline: { backgroundColor: '#fff5f5', color: '#ff502c', padding: '2px 6px', borderRadius: '3px', fontSize: 14 },
    block: { backgroundColor: '#282c34', color: '#abb2bf', padding: '16px', borderRadius: '8px' },
  },
  link: { color: '#07c160', textDecoration: 'none', borderBottom: '1px solid #07c160' },
  list: { paddingLeft: 24, margin: '16px 0', itemMargin: '8px 0' },
  image: { maxWidth: '100%', borderRadius: '8px', margin: '16px 0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  emphasis: { strong: { color: '#07c160' } },
};

// 所有内置主题
export const BUILTIN_THEMES = [
  { id: 'default', name: '默认', description: '简洁清爽的默认样式', config: defaultThemeConfig },
  { id: 'wechat-elegant', name: '微信优雅', description: '适合公众号的优雅排版', config: wechatElegantConfig },
];

// 获取默认配置
export function getDefaultConfig(): LayoutTemplateConfig {
  return JSON.parse(JSON.stringify(defaultThemeConfig));
}
