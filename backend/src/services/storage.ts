import fs from 'fs';
import path from 'path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

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

// S3 兼容存储实现（阿里云 OSS / 腾讯云 COS / AWS S3 等）
export class S3Storage implements StorageService {
  private client: S3Client;
  private bucket: string;
  private region: string;
  private endpoint: string;
  private baseUrl: string;

  constructor(config: {
    endpoint: string;
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  }) {
    this.bucket = config.bucket;
    this.region = config.region || 'ap-northeast-1';
    this.endpoint = config.endpoint || '';

    // 配置 S3 客户端
    this.client = new S3Client({
      region: this.region,
      endpoint: config.endpoint || undefined,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // 强制使用路径式寻址（适用于阿里云 OSS、腾讯云 COS 等）
      forcePathStyle: true,
    });

    // 生成基础 URL
    this.baseUrl = config.endpoint
      ? `${config.endpoint}/${config.bucket}`
      : `https://${config.bucket}.s3.${this.region}.amazonaws.com`;
  }

  async upload(filePath: string, content: Buffer): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: filePath,
        Body: content,
      });

      await this.client.send(command);
      console.log(`[S3] 上传成功: ${filePath}`);
      return this.getUrl(filePath);
    } catch (error) {
      console.error(`[S3] 上传失败: ${filePath}`, error);
      throw new Error(`S3 上传失败: ${(error as Error).message}`);
    }
  }

  async download(filePath: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: filePath,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        throw new Error('S3 下载失败：响应体为空');
      }

      // 将流转换为 Buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      console.error(`[S3] 下载失败: ${filePath}`, error);
      throw new Error(`S3 下载失败: ${(error as Error).message}`);
    }
  }

  async delete(filePath: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: filePath,
      });

      await this.client.send(command);
      console.log(`[S3] 删除成功: ${filePath}`);
    } catch (error) {
      console.error(`[S3] 删除失败: ${filePath}`, error);
      throw new Error(`S3 删除失败: ${(error as Error).message}`);
    }
  }

  getUrl(filePath: string): string {
    return `${this.baseUrl}/${filePath}`;
  }
}

// 检查 S3 环境变量是否配置
function isS3Configured(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
    process.env.S3_REGION &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
  );
}

// 存储服务工厂
export function createStorageService(): StorageService {
  const storageType = process.env.STORAGE_TYPE || 'local';

  // 优先检查 S3 环境变量配置
  if (storageType === 's3' || isS3Configured()) {
    // 验证必要的环境变量
    if (!process.env.S3_BUCKET) {
      throw new Error('S3 配置错误：缺少 S3_BUCKET 环境变量');
    }
    if (!process.env.S3_REGION) {
      throw new Error('S3 配置错误：缺少 S3_REGION 环境变量');
    }
    if (!process.env.S3_ACCESS_KEY_ID) {
      throw new Error('S3 配置错误：缺少 S3_ACCESS_KEY_ID 环境变量');
    }
    if (!process.env.S3_SECRET_ACCESS_KEY) {
      throw new Error('S3 配置错误：缺少 S3_SECRET_ACCESS_KEY 环境变量');
    }

    return new S3Storage({
      endpoint: process.env.S3_ENDPOINT || '',
      bucket: process.env.S3_BUCKET!,
      region: process.env.S3_REGION!,
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    });
  }

  // 默认本地存储
  const baseDir = path.resolve(process.cwd(), '..', 'public', 'generated');
  return new LocalStorage(baseDir, '/generated');
}

// 导出默认实例
export const storage = createStorageService();
