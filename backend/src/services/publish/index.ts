import { PrismaClient } from '@prisma/client';
import { PublisherService, PlatformType, PlatformConfig } from './types';
import { WechatPublisher } from './wechat';

const prisma = new PrismaClient();

// 发布服务注册表
const publishers: Partial<Record<PlatformType, PublisherService>> = {
  wechat: new WechatPublisher(),
  // TODO: 后续添加其他平台
  // xiaohongshu: new XiaohongshuPublisher(),
  // toutiao: new ToutiaoPublisher(),
  // zhihu: new ZhihuPublisher(),
};

// 获取发布服务
export function getPublisher(platform: PlatformType): PublisherService {
  const publisher = publishers[platform];
  if (!publisher) {
    throw new Error(`不支持的发布平台: ${platform}`);
  }
  return publisher;
}

// 获取所有支持的平台
export function getSupportedPlatforms() {
  return Object.values(publishers).map(p => ({
    name: p!.platformName,
    displayName: p!.displayName,
    supportedContentTypes: p!.supportedContentTypes,
  }));
}

// 获取平台配置
export async function getPlatformConfig(platformId: string): Promise<PlatformConfig | null> {
  const platform = await prisma.publishPlatform.findUnique({
    where: { id: platformId },
  });

  if (!platform) return null;

  return {
    id: platform.id,
    name: platform.name as PlatformType,
    displayName: platform.displayName,
    appId: platform.appId || undefined,
    appSecret: platform.appSecret || undefined,
    accessToken: platform.accessToken || undefined,
    refreshToken: platform.refreshToken || undefined,
    tokenExpireAt: platform.tokenExpireAt || undefined,
    accountId: platform.accountId || undefined,
    accountName: platform.accountName || undefined,
    config: JSON.parse(platform.config),
  };
}

// 更新平台配置
export async function updatePlatformToken(
  platformId: string,
  tokenData: { accessToken?: string; refreshToken?: string; tokenExpireAt?: Date }
): Promise<void> {
  await prisma.publishPlatform.update({
    where: { id: platformId },
    data: tokenData,
  });
}

export * from './types';
