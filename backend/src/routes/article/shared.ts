import fs from 'fs';
import path from 'path';

// 文章文件存储目录
export const ARTICLES_DIR = './articles';
export const VERSIONS_DIR = path.join(ARTICLES_DIR, 'versions');

// 确保目录存在
if (!fs.existsSync(ARTICLES_DIR)) {
  fs.mkdirSync(ARTICLES_DIR, { recursive: true });
}
if (!fs.existsSync(VERSIONS_DIR)) {
  fs.mkdirSync(VERSIONS_DIR, { recursive: true });
}

// 平台和栏目配置
export const PLATFORM_COLUMNS: Record<string, string[]> = {
  wechat: ['深度', '速递', '体验', '教程', '对话'],
  xiaohongshu: ['种草', '教程', '观点'],
  video: ['演示', '教程', '观点'],
};

// 生成 slug
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
}

// 计算字数和阅读时间
export function calculateReadingStats(content: string) {
  const wordCount = content.replace(/\s+/g, '').length;
  const readTime = Math.ceil(wordCount / 400);
  return { wordCount, readTime };
}

// 从 Markdown 内容中提取图片 URL
export function extractImageUrls(content: string): string[] {
  const regex = /!\[.*?\]\((.*?)\)/g;
  const urls: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match[1] && (match[1].startsWith('/api/articles/images/') || match[1].startsWith('/uploads/smart-images/'))) {
      urls.push(match[1]);
    }
  }
  return urls;
}
