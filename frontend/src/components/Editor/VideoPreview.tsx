import React, { useMemo } from 'react';
import { Player } from '@remotion/player';
import { PreviewComposition, type PreviewProps } from './PreviewComposition';
import type { Popup } from '../../popups';
import type { FilterConfig } from '../../stores/editor';
import { getPresetById } from '../../bgm/presets';

interface BGMConfig {
  type: 'preset' | 'asset' | 'none';
  presetId?: string;
  assetId: string | null;
  volume: number;
}

interface VideoPreviewProps {
  text: string;
  subtitleText?: string;
  assets: { id: string; name: string; url: string; type: 'image' | 'video'; duration: number }[];
  orientation: 'landscape' | 'portrait';
  bgm: BGMConfig;
  estimatedDurationMs?: number;
  backgroundStyleId?: string;
  popups?: Popup[];
  filters?: FilterConfig[];
}

// 将文字按句子分段（与 PreviewComposition 保持一致）
function countSentences(text: string): number {
  if (!text) return 1;
  const sentences = text
    .split(/[。！？\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  return Math.max(sentences.length, 1);
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  text,
  subtitleText,
  assets,
  orientation,
  bgm,
  estimatedDurationMs = 0,
  backgroundStyleId,
  popups,
  filters,
}) => {
  const isPortrait = orientation === 'portrait';
  const width = isPortrait ? 1080 : 1920;
  const height = isPortrait ? 1920 : 1080;

  const fps = 30;

  // 优先使用预估时长，否则按句子数量估算（每句3秒）
  const durationInFrames = useMemo(() => {
    if (estimatedDurationMs > 0) {
      return Math.ceil((estimatedDurationMs / 1000) * fps) + 30; // 加1秒缓冲
    }
    const sentenceCount = countSentences(text);
    return sentenceCount * 3 * fps;
  }, [estimatedDurationMs, text, fps]);

  // 背景音乐 URL
  const bgmUrl = useMemo(() => {
    if (bgm.type === 'preset' && bgm.presetId) {
      const preset = getPresetById(bgm.presetId);
      return preset ? `/bgm/presets/${preset.filename}` : null;
    }
    if (bgm.type === 'asset' && bgm.assetId) {
      return `/api/assets/file/${bgm.assetId}`;
    }
    return null;
  }, [bgm.type, bgm.presetId, bgm.assetId]);

  const inputProps: PreviewProps = useMemo(() => ({
    text,
    subtitleText,
    assets,
    orientation,
    bgmUrl,
    bgmVolume: bgm.volume,
    backgroundStyleId,
    popups,
    filters,
  }), [text, subtitleText, assets, orientation, bgmUrl, bgm.volume, backgroundStyleId, popups, filters]);

  return (
    <Player
      component={PreviewComposition as unknown as React.ComponentType<Record<string, unknown>>}
      inputProps={inputProps}
      durationInFrames={durationInFrames}
      fps={fps}
      compositionWidth={width}
      compositionHeight={height}
      style={{
        width: '100%',
        aspectRatio: isPortrait ? '9/16' : '16/9',
      }}
      controls
      loop
      autoPlay={false}
    />
  );
};

export default VideoPreview;
