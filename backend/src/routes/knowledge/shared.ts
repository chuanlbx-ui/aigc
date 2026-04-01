import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import multer from 'multer';

export const prisma = new PrismaClient();

// 支持的文件扩展名
export const SUPPORTED_EXTENSIONS = ['.md', '.txt', '.pdf'];

// 知识库文件存储目录
export const KNOWLEDGE_DIR = './knowledge-base';
export const VERSIONS_DIR = path.join(KNOWLEDGE_DIR, 'versions');
export const UPLOADS_DIR = path.join(KNOWLEDGE_DIR, 'uploads');

// 确保目录存在
if (!fs.existsSync(KNOWLEDGE_DIR)) {
  fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
}
if (!fs.existsSync(VERSIONS_DIR)) {
  fs.mkdirSync(VERSIONS_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer 配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`),
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (SUPPORTED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${ext}`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

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
  const readTime = Math.ceil(wordCount / 400); // 假设每分钟400字
  return { wordCount, readTime };
}

// 从文件读取内容（支持多种格式）
export async function readFileContent(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    // 动态导入 pdf-parse 避免启动时的测试文件问题
    const pdfParse = (await import('pdf-parse')).default;
    const pdfData = await pdfParse(dataBuffer);
    return pdfData.text || '';
  } else {
    // .md 和 .txt 直接读取
    return fs.readFileSync(filePath, 'utf-8');
  }
}
