import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 扩展通信桥接服务
 * 负责与浏览器扩展的通信管理
 */
export class ExtensionBridge {
  private static instance: ExtensionBridge;

  private constructor() {}

  static getInstance(): ExtensionBridge {
    if (!ExtensionBridge.instance) {
      ExtensionBridge.instance = new ExtensionBridge();
    }
    return ExtensionBridge.instance;
  }

  /**
   * 检测扩展是否在线
   * @param userId 用户ID（可选）
   * @returns 是否在线
   */
  async isExtensionOnline(userId?: string): Promise<boolean> {
    try {
      const extensionId = 'remotion-publisher-extension';

      const status = await prisma.extensionStatus.findFirst({
        where: {
          userId: userId || null,
          extensionId,
          isInstalled: true,
          isEnabled: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      if (!status || !status.lastPingAt) {
        return false;
      }

      // 检查最后心跳时间是否在30秒内
      const timeSinceLastPing = Date.now() - status.lastPingAt.getTime();
      return timeSinceLastPing < 30000;
    } catch (error) {
      console.error('检测扩展在线状态失败:', error);
      return false;
    }
  }

  /**
   * 获取扩展状态
   * @param userId 用户ID（可选）
   * @returns 扩展状态信息
   */
  async getExtensionStatus(userId?: string) {
    try {
      const extensionId = 'remotion-publisher-extension';

      const status = await prisma.extensionStatus.findFirst({
        where: {
          userId: userId || null,
          extensionId,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      if (!status) {
        return {
          installed: false,
          enabled: false,
          online: false,
          version: null,
        };
      }

      const isOnline = await this.isExtensionOnline(userId);

      return {
        installed: status.isInstalled,
        enabled: status.isEnabled,
        online: isOnline,
        version: status.version,
        lastPingAt: status.lastPingAt,
        browserType: status.browserType,
        connectionType: status.connectionType,
      };
    } catch (error) {
      console.error('获取扩展状态失败:', error);
      throw error;
    }
  }
}
