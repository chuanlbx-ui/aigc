/**
 * Google Drive 导出服务
 * 将知识库文档上传到 Google Drive，间接打通 NotebookLM
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

interface DriveUploadResult {
  uploaded: number;
  errors: string[];
  fileIds: string[];
}

/**
 * 上传文档到 Google Drive
 */
export async function uploadToGoogleDrive(params: {
  accessToken: string;
  folderId?: string;
  docIds: string[];
  userId: string;
  format?: 'markdown' | 'google-docs';
}): Promise<DriveUploadResult> {
  const { accessToken, folderId, docIds, userId, format = 'google-docs' } = params;
  const result: DriveUploadResult = { uploaded: 0, errors: [], fileIds: [] };

  const docs = await prisma.knowledgeDoc.findMany({
    where: { id: { in: docIds }, userId },
    include: { category: true },
  });

  for (const doc of docs) {
    try {
      if (!doc.filePath || !fs.existsSync(doc.filePath)) {
        result.errors.push(`${doc.title}: 文件不存在`);
        continue;
      }

      const content = fs.readFileSync(doc.filePath, 'utf-8');

      // Google Drive API: multipart upload
      const metadata: any = {
        name: `${doc.title}.md`,
        mimeType: format === 'google-docs' ? 'application/vnd.google-apps.document' : undefined,
      };
      if (folderId) metadata.parents = [folderId];

      const boundary = '---boundary' + Date.now();
      const body = [
        `--${boundary}`,
        'Content-Type: application/json; charset=UTF-8',
        '',
        JSON.stringify(metadata),
        `--${boundary}`,
        `Content-Type: text/markdown`,
        '',
        content,
        `--${boundary}--`,
      ].join('\r\n');

      const res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body,
        }
      );

      if (!res.ok) {
        const err = await res.text();
        result.errors.push(`${doc.title}: ${err}`);
        continue;
      }

      const data = await res.json();
      result.fileIds.push(data.id);
      result.uploaded++;
    } catch (e: any) {
      result.errors.push(`${doc.title}: ${e.message}`);
    }
  }

  return result;
}
