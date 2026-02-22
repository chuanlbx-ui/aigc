/**
 * 媒体生成器统一导出和工厂方法
 */

export * from './base.js';
export { DalleGenerator } from './dalle.js';
export { FreeLibraryGenerator } from './free.js';
export { StabilityGenerator } from './stability.js';
export { TongyiGenerator } from './tongyi.js';
export { YigeGenerator } from './yige.js';
export { KlingGenerator } from './kling.js';
export { RunwayGenerator } from './runway.js';
export { PikaGenerator } from './pika.js';

import { MediaGenerator, ProviderInfo } from './base.js';
import { DalleGenerator } from './dalle.js';
import { FreeLibraryGenerator } from './free.js';
import { StabilityGenerator } from './stability.js';
import { TongyiGenerator } from './tongyi.js';
import { YigeGenerator } from './yige.js';
import { KlingGenerator } from './kling.js';
import { RunwayGenerator } from './runway.js';
import { PikaGenerator } from './pika.js';

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
