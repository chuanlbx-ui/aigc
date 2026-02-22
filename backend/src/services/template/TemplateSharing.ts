/**
 * 模板分享服务
 */

import { PrismaClient } from '@prisma/client';
import { TemplateType } from './types.js';
import crypto from 'crypto';

const prisma = new PrismaClient();

// 分享权限
export type SharePermission = 'view' | 'clone' | 'edit';

// 分享选项
export interface ShareOptions {
  permission?: SharePermission;
  expiresInDays?: number;
  maxUses?: number;
}

// 分享信息
export interface ShareInfo {
  id: string;
  shareCode: string;
  permission: SharePermission;
  expiresAt?: Date;
  maxUses?: number;
  useCount: number;
  createdAt: Date;
}

export class TemplateSharing {
  /**
   * 生成分享码
   */
  private generateShareCode(): string {
    return crypto.randomBytes(6).toString('hex');
  }

  /**
   * 创建分享
   */
  async createShare(
    templateId: string,
    templateType: TemplateType,
    options: ShareOptions = {},
    createdBy?: string
  ): Promise<ShareInfo> {
    const {
      permission = 'view',
      expiresInDays,
      maxUses,
    } = options;

    let expiresAt: Date | undefined;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    const share = await prisma.templateShare.create({
      data: {
        templateId,
        templateType,
        shareCode: this.generateShareCode(),
        permission,
        expiresAt,
        maxUses,
        createdBy,
      },
    });

    return this.toShareInfo(share);
  }

  /**
   * 通过分享码获取分享信息
   */
  async getByCode(shareCode: string): Promise<ShareInfo | null> {
    const share = await prisma.templateShare.findUnique({
      where: { shareCode },
    });

    if (!share) return null;
    return this.toShareInfo(share);
  }

  /**
   * 验证分享是否有效
   */
  async validateShare(shareCode: string): Promise<boolean> {
    const share = await prisma.templateShare.findUnique({
      where: { shareCode },
    });

    if (!share) return false;

    // 检查过期
    if (share.expiresAt && share.expiresAt < new Date()) {
      return false;
    }

    // 检查使用次数
    if (share.maxUses && share.useCount >= share.maxUses) {
      return false;
    }

    return true;
  }

  /**
   * 使用分享（增加使用次数）
   */
  async useShare(shareCode: string): Promise<ShareInfo | null> {
    const isValid = await this.validateShare(shareCode);
    if (!isValid) return null;

    const share = await prisma.templateShare.update({
      where: { shareCode },
      data: { useCount: { increment: 1 } },
    });

    return this.toShareInfo(share);
  }

  /**
   * 获取模板的所有分享
   */
  async listShares(
    templateId: string,
    templateType: TemplateType
  ): Promise<ShareInfo[]> {
    const shares = await prisma.templateShare.findMany({
      where: { templateId, templateType },
      orderBy: { createdAt: 'desc' },
    });

    return shares.map(s => this.toShareInfo(s));
  }

  /**
   * 撤销分享
   */
  async revokeShare(shareCode: string): Promise<boolean> {
    try {
      await prisma.templateShare.delete({
        where: { shareCode },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 转换为分享信息
   */
  private toShareInfo(share: any): ShareInfo {
    return {
      id: share.id,
      shareCode: share.shareCode,
      permission: share.permission as SharePermission,
      expiresAt: share.expiresAt || undefined,
      maxUses: share.maxUses || undefined,
      useCount: share.useCount,
      createdAt: share.createdAt,
    };
  }
}
