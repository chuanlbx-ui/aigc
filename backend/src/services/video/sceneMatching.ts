/**
 * 视频口播场景匹配服务
 * 将口播文案按句/段拆分，为每段生成视觉描述并匹配素材
 */

import { createAIService, getAIConfigOrDefault, AIServiceConfig } from '../ai/index.js';
import { smartImageService } from '../article/smartImage.js';

// 场景片段
export interface SceneSegment {
  index: number;
  text: string;           // 口播文本
  visualPrompt: string;   // AI 生成的视觉描述
  keywords: string[];     // 搜索关键词
  mediaType: 'image' | 'video' | 'ai-generated';
  media?: {
    url: string;
    localPath: string;
    source: string;
    width: number;
    height: number;
  };
}

// 匹配结果
export interface SceneMatchResult {
  segments: SceneSegment[];
  totalSegments: number;
  matchedSegments: number;
}

/**
 * 将口播文案拆分为句段
 */
export function splitScript(script: string): string[] {
  return script
    .split(/[。！？\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);
}

/**
 * AI 批量生成视觉描述（一次调用处理所有段落）
 */
async function generateVisualDescriptions(
  segments: string[],
  config: AIServiceConfig
): Promise<Array<{ visualPrompt: string; keywords: string[]; mediaType: 'image' | 'video' | 'ai-generated' }>> {
  const service = createAIService(config);

  const numberedSegments = segments.map((s, i) => `${i + 1}. ${s}`).join('\n');

  const prompt = `你是一位视频导演。以下是口播文案的各个段落，请为每段描述应该配什么画面素材。

## 口播段落
${numberedSegments}

## 输出要求
为每段输出 JSON 数组，每个元素包含：
- visualPrompt: 英文视觉描述（适合图库搜索，如 "person typing on laptop in modern office"）
- keywords: 3个英文搜索关键词数组
- mediaType: "image" 或 "video"（动态内容用 video，静态概念用 image）

只输出 JSON 数组，不要其他内容。`;

  const result = await service.generateContent(prompt);

  try {
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('解析视觉描述失败:', e);
  }

  // 回退：用原文作为关键词
  return segments.map(s => ({
    visualPrompt: s.slice(0, 50),
    keywords: [s.slice(0, 10)],
    mediaType: 'image' as const,
  }));
}

/**
 * 核心：口播文案场景匹配
 */
export async function matchScenes(
  script: string,
  platform: string = 'video',
  serviceId?: string
): Promise<SceneMatchResult> {
  const config = await getAIConfigOrDefault(serviceId);
  if (!config) throw new Error('请先配置 AI 服务');

  // 1. 拆分段落
  const texts = splitScript(script);

  // 2. AI 批量生成视觉描述
  let descriptions: Array<{ visualPrompt: string; keywords: string[]; mediaType: 'image' | 'video' | 'ai-generated' }>;
  try {
    descriptions = await generateVisualDescriptions(texts, config);
  } catch (e) {
    console.error('生成视觉描述失败，使用回退:', e);
    descriptions = texts.map(s => ({ visualPrompt: s.slice(0, 50), keywords: [s.slice(0, 10)], mediaType: 'image' as const }));
  }

  // 3. 为每段匹配素材
  const segments: SceneSegment[] = [];
  let matched = 0;

  for (let i = 0; i < texts.length; i++) {
    const desc = descriptions[i] || { visualPrompt: texts[i], keywords: [], mediaType: 'image' as const };
    const segment: SceneSegment = {
      index: i,
      text: texts[i],
      visualPrompt: desc.visualPrompt || texts[i].slice(0, 50),
      keywords: Array.isArray(desc.keywords) ? desc.keywords : [],
      mediaType: desc.mediaType || 'image',
    };

    // 用视觉描述的关键词搜索素材
    try {
      const searchKeywords = segment.keywords.length > 0 ? segment.keywords : [segment.visualPrompt.slice(0, 30)];
      const image = await smartImageService.fetchSingleImage(
        searchKeywords,
        platform === 'xiaohongshu' ? 'portrait' : 'landscape'
      );

      if (image && image.source !== 'placeholder') {
        segment.media = {
          url: image.url,
          localPath: image.localPath,
          source: image.source,
          width: image.width,
          height: image.height,
        };
        matched++;
      }
    } catch (e) {
      console.warn(`段落 ${i} 素材匹配失败:`, e);
    }

    segments.push(segment);
  }

  return { segments, totalSegments: texts.length, matchedSegments: matched };
}
