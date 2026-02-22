/**
 * 媒体生成器统一导出和工厂方法
 */

export * from './base';
export { DalleGenerator } from './dalle';
export { FreeLibraryGenerator } from './free';
export { StabilityGenerator } from './stability';
export { TongyiGenerator } from './tongyi';
export { YigeGenerator } from './yige';
export { KlingGenerator } from './kling';
export { RunwayGenerator } from './runway';
export { PikaGenerator } from './pika';

import { MediaGenerator, ProviderInfo } from './base';
import { DalleGenerator } from './dalle';
import { FreeLibraryGenerator } from './free';
import { StabilityGenerator } from './stability';
import { TongyiGenerator } from './tongyi';
import { YigeGenerator } from './yige';
import { KlingGenerator } from './kling';
import { RunwayGenerator } from './runway';
import { PikaGenerator } from './pika';

// 所有可用的生成器
const generators: Record<string, MediaGenerator> = {
  dalle: new DalleGenerator(),
  free: new FreeLibraryGenerator(),
  stability: new StabilityGenerator(),
  tongyi: new TongyiGenerator(),
  yige: new YigeGenerator(),
  kling: new KlingGenerator(),
  runway: new RunwayGenerator(),
  pika: new PikaGenerator(),
};

/**
 * 获取指定的生成器
 */
export function getGenerator(providerId: string): MediaGenerator | null {
  return generators[providerId] || null;
}

/**
 * 获取所有可用的生成器信息
 */
export function getAllProviders(): ProviderInfo[] {
  return Object.values(generators).map(g => g.info);
}

/**
 * 获取支持指定类型的生成器
 */
export function getProvidersByType(type: 'image' | 'video'): ProviderInfo[] {
  return Object.values(generators)
    .filter(g => g.info.supportedTypes.includes(type))
    .map(g => g.info);
}

/**
 * 获取已配置 API Key 的生成器
 */
export function getAvailableProviders(): ProviderInfo[] {
  return Object.values(generators)
    .filter(g => g.checkApiKey())
    .map(g => g.info);
}
