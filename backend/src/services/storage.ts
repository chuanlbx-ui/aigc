import fs from 'fs';
import path from 'path';

// 存储服务接口
export interface StorageService {
  upload(filePath: string, content: Buffer): Promise<string>;
  download(filePath: string): Promise<Buffer>;
  delete(filePath: string): Promise<void>;
  getUrl(filePath: string): string;
}

// 本地存储实现
export class LocalStorage implements StorageService {
  private baseDir: string;
  private baseUrl: string;

  constructor(baseDir: string, baseUrl: string = '/generated') {
    this.baseDir = baseDir;
    this.baseUrl = baseUrl;
  }

  async upload(filePath: string, content: Buffer): Promise<string> {
    const fullPath = path.join(this.baseDir, filePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content);
    return this.getUrl(filePath);
  }

  async download(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.baseDir, filePath);
    return fs.readFileSync(fullPath);
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.baseDir, filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  getUrl(filePath: string): string {
    return `${this.baseUrl}/${filePath}`;
  }
}

// S3 兼容存储实现（阿里云 OSS / 腾讯云 COS 等）
export class S3Storage implements StorageService {
  private endpoint: string;
  private bucket: string;
  private accessKey: string;
  private secretKey: string;

  constructor(config: {
    endpoint: string;
    bucket: string;
    accessKey: string;
    secretKey: string;
  }) {
    this.endpoint = config.endpoint;
    this.bucket = config.bucket;
    this.accessKey = config.accessKey;
    this.secretKey = config.secretKey;
  }

  async upload(filePath: string, content: Buffer): Promise<string> {
    // TODO: 实现 S3 上传（需要安装 @aws-sdk/client-s3）
    console.log(`[S3] 上传文件: ${filePath}`);
    throw new Error('S3 存储需要安装 @aws-sdk/client-s3');
  }

  async download(filePath: string): Promise<Buffer> {
    // TODO: 实现 S3 下载
    throw new Error('S3 存储需要安装 @aws-sdk/client-s3');
  }

  async delete(filePath: string): Promise<void> {
    // TODO: 实现 S3 删除
    throw new Error('S3 存储需要安装 @aws-sdk/client-s3');
  }

  getUrl(filePath: string): string {
    return `${this.endpoint}/${this.bucket}/${filePath}`;
  }
}

// 存储服务工厂
export function createStorageService(): StorageService {
  const storageType = process.env.STORAGE_TYPE || 'local';

  if (storageType === 's3') {
    return new S3Storage({
      endpoint: process.env.S3_ENDPOINT || '',
      bucket: process.env.S3_BUCKET || '',
      accessKey: process.env.S3_ACCESS_KEY || '',
      secretKey: process.env.S3_SECRET_KEY || '',
    });
  }

  // 默认本地存储
  const baseDir = path.resolve(process.cwd(), '..', 'public', 'generated');
  return new LocalStorage(baseDir, '/generated');
}

// 导出默认实例
export const storage = createStorageService();
