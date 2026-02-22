import { PrismaClient } from '@prisma/client';
import { ExtensionBridge } from '../extension/bridge';

const prisma = new PrismaClient();

/**
 * 智能发布决策器
 * 根据平台配置和扩展状态自动选择最佳发布方式
 */
export class SmartPublisher {
  private extensionBridge: ExtensionBridge;

  constructor() {
    this.extensionBridge = ExtensionBridge.getInstance();
  }

  /**
   * 决定发布方式
   */
  async determinePublishMethod(
    platformId: string,
    preferExtension: boolean = false,
    userId?: string
  ): Promise<{
    method: 'api' | 'extension';
    reason: string;
    canFallback: boolean;
  }> {
    // 获取平台配置
    const platform = await prisma.publishPlatform.findUnique({
      where: { id: platformId },
    });

    if (!platform) {
      throw new Error('平台不存在');
    }

    // 检查扩展是否在线
    const extensionOnline = await this.extensionBridge.isExtensionOnline(userId);

    // 场景1: 平台强制要求扩展
    if (platform.extensionRequired) {
      if (!extensionOnline) {
        throw new Error(`${platform.displayName} 需要安装浏览器扩展才能发布`);
      }
      return {
        method: 'extension',
        reason: '平台要求',
        canFallback: false,
      };
    }

    // 场景2: 用户明确偏好扩展
    if (preferExtension) {
      if (!extensionOnline) {
        if (platform.apiAvailable) {
          return {
            method: 'api',
            reason: '扩展离线，降级到 API',
            canFallback: true,
          };
        }
        throw new Error('扩展未安装且该平台不支持 API 发布');
      }
      return {
        method: 'extension',
        reason: '用户偏好',
        canFallback: platform.apiAvailable,
      };
    }

    // 场景3: 自动选择（默认优先 API）
    if (platform.apiAvailable) {
      return {
        method: 'api',
        reason: 'API 更稳定快速',
        canFallback: extensionOnline,
      };
    }

    if (extensionOnline) {
      return {
        method: 'extension',
        reason: 'API 不可用',
        canFallback: false,
      };
    }

    throw new Error('无可用的发布方式');
  }
}
