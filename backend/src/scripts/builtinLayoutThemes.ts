/**
 * 内置排版主题配置
 * 将原有 CSS 主题转换为结构化配置
 */

import { LayoutTemplateConfig } from '../services/template/types.js';

// 默认主题配置
export const defaultThemeConfig: LayoutTemplateConfig = {
  version: '1.0',
  base: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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

// 微信优雅主题配置
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

// 科技深色主题配置
export const techDarkConfig: LayoutTemplateConfig = {
  version: '1.0',
  base: {
    fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
    fontSize: 15,
    lineHeight: 1.8,
    color: '#e0e0e0',
    backgroundColor: '#1e1e1e',
    padding: 24,
  },
  headings: {
    h1: { fontSize: 24, fontWeight: 'bold', margin: '24px 0 16px', color: '#61dafb', borderBottom: '2px solid #61dafb', paddingBottom: '8px' },
    h2: { fontSize: 20, fontWeight: 'bold', margin: '20px 0 12px', color: '#98c379' },
    h3: { fontSize: 17, fontWeight: 'bold', margin: '16px 0 8px', color: '#e5c07b' },
  },
  paragraph: { margin: '12px 0' },
  blockquote: { borderLeft: '4px solid #61dafb', backgroundColor: '#282c34', padding: '12px 16px', margin: '16px 0', color: '#abb2bf' },
  code: {
    inline: { backgroundColor: '#282c34', color: '#e06c75', padding: '2px 6px', borderRadius: '3px', fontSize: 14 },
    block: { backgroundColor: '#282c34', padding: '16px', borderRadius: '6px', border: '1px solid #3e4451' },
  },
  link: { color: '#61dafb', textDecoration: 'none' },
  list: { paddingLeft: 24, margin: '12px 0', itemMargin: '6px 0', markerColor: '#61dafb' },
  image: { maxWidth: '100%', borderRadius: '4px', border: '1px solid #3e4451' },
};

// 小红书风格配置
export const xiaohongshuConfig: LayoutTemplateConfig = {
  version: '1.0',
  base: {
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: 15,
    lineHeight: 2,
    color: '#333',
  },
  headings: {
    h1: { fontSize: 20, fontWeight: 'bold', margin: '24px 0 16px', color: '#ff2442', textAlign: 'center' },
    h2: { fontSize: 17, fontWeight: 'bold', margin: '20px 0 12px', color: '#ff2442', background: 'linear-gradient(to bottom, transparent 60%, #ffe4e8 60%)' },
    h3: { fontSize: 15, fontWeight: 'bold', margin: '16px 0 8px', color: '#ff6b81' },
  },
  paragraph: { margin: '12px 0' },
  blockquote: { backgroundColor: '#fff5f6', borderLeft: '4px solid #ff2442', padding: '12px 16px', margin: '16px 0', color: '#666', borderRadius: '0 8px 8px 0' },
  code: {
    inline: { backgroundColor: '#ffe4e8', color: '#ff2442', padding: '2px 6px', borderRadius: '4px', fontSize: 14 },
    block: { backgroundColor: '#fff5f6', padding: '16px', borderRadius: '12px' },
  },
  link: { color: '#ff2442', textDecoration: 'none' },
  list: { paddingLeft: 20, margin: '12px 0', itemMargin: '8px 0', markerColor: '#ff2442' },
  image: { maxWidth: '100%', borderRadius: '12px', margin: '12px 0' },
  emphasis: { strong: { color: '#ff2442' } },
};

// 极简主义配置
export const minimalistConfig: LayoutTemplateConfig = {
  version: '1.0',
  base: {
    fontFamily: '"Helvetica Neue", Arial, sans-serif',
    fontSize: 16,
    lineHeight: 1.9,
    color: '#2c3e50',
    maxWidth: 680,
  },
  headings: {
    h1: { fontSize: 28, fontWeight: 300, margin: '40px 0 24px', color: '#1a1a1a', letterSpacing: '-0.5px' },
    h2: { fontSize: 22, fontWeight: 400, margin: '32px 0 16px', color: '#1a1a1a' },
    h3: { fontSize: 18, fontWeight: 500, margin: '24px 0 12px', color: '#1a1a1a' },
  },
  paragraph: { margin: '16px 0' },
  blockquote: { borderLeft: '2px solid #1a1a1a', padding: '0 0 0 20px', margin: '24px 0', color: '#666' },
  code: {
    inline: { backgroundColor: '#f8f8f8', color: '#333', padding: '2px 6px', borderRadius: '2px', fontSize: 14 },
    block: { backgroundColor: '#f8f8f8', padding: '20px', borderRadius: '2px' },
  },
  link: { color: '#1a1a1a', textDecoration: 'underline' },
  list: { paddingLeft: 24, margin: '16px 0', itemMargin: '8px 0' },
  image: { maxWidth: '100%', margin: '24px 0' },
};

// 暖色纸张配置
export const warmPaperConfig: LayoutTemplateConfig = {
  version: '1.0',
  base: {
    fontFamily: '"Georgia", "Times New Roman", serif',
    fontSize: 16,
    lineHeight: 2,
    color: '#4a4a4a',
    backgroundColor: '#fdf6e3',
    padding: 24,
  },
  headings: {
    h1: { fontSize: 26, fontWeight: 'bold', margin: '28px 0 20px', color: '#b58900', textAlign: 'center' },
    h2: { fontSize: 21, fontWeight: 'bold', margin: '24px 0 14px', color: '#cb4b16' },
    h3: { fontSize: 18, fontWeight: 'bold', margin: '18px 0 10px', color: '#d33682' },
  },
  paragraph: { margin: '14px 0', textIndent: 2 },
  blockquote: { backgroundColor: '#eee8d5', borderLeft: '4px solid #b58900', padding: '14px 18px', margin: '18px 0', color: '#657b83' },
  code: {
    inline: { backgroundColor: '#eee8d5', color: '#dc322f', padding: '2px 6px', borderRadius: '3px', fontSize: 14 },
    block: { backgroundColor: '#002b36', color: '#839496', padding: '16px', borderRadius: '6px' },
  },
  link: { color: '#268bd2', textDecoration: 'none', borderBottom: '1px dashed #268bd2' },
  list: { paddingLeft: 24, margin: '14px 0', itemMargin: '8px 0' },
  image: { maxWidth: '100%', borderRadius: '6px', margin: '16px 0', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
};

// 所有内置主题
export const BUILTIN_LAYOUT_THEMES = [
  { id: 'default', name: '默认', description: '简洁清爽的默认样式', config: defaultThemeConfig },
  { id: 'wechat-elegant', name: '微信优雅', description: '适合公众号的优雅排版', config: wechatElegantConfig },
  { id: 'tech-dark', name: '科技深色', description: '适合技术文章的深色主题', config: techDarkConfig },
  { id: 'xiaohongshu', name: '小红书风格', description: '活泼可爱的小红书风格', config: xiaohongshuConfig },
  { id: 'minimalist', name: '极简主义', description: '简约大气的极简风格', config: minimalistConfig },
  { id: 'warm-paper', name: '暖色纸张', description: '温暖舒适的阅读体验', config: warmPaperConfig },
];
