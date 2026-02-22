import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, OffthreadVideo, Img, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { BackgroundRenderer } from '../../backgrounds/BackgroundRenderer';
import { PopupPreviewRenderer, type Popup } from '../../popups';
import type { FilterConfig } from '../../stores/editor';

interface Asset {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
  duration: number;
}

export interface PreviewProps {
  text: string;
  subtitleText?: string;  // 格式化后的字幕文本
  assets: Asset[];
  orientation: 'landscape' | 'portrait';
  bgmUrl: string | null;
  bgmVolume: number;
  backgroundStyleId?: string;
  popups?: Popup[];
  filters?: FilterConfig[];
}

// 将文字按句子分段
function splitTextToSentences(text: string): string[] {
  if (!text) return [];
  // 按中文标点和换行分割
  const sentences = text
    .split(/[。！？\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  return sentences.length > 0 ? sentences : [text];
}

// 滤镜转换为 CSS filter 字符串
function getFilterStyle(filters?: FilterConfig[]): string {
  if (!filters || filters.length === 0) return '';

  return filters.map(f => {
    const intensity = f.intensity ?? 1;
    switch (f.type) {
      case 'warm': return `sepia(${0.3 * intensity}) saturate(${1 + 0.2 * intensity})`;
      case 'cool': return `saturate(${1 - 0.1 * intensity}) hue-rotate(${10 * intensity}deg)`;
      case 'vintage': return `sepia(${0.4 * intensity}) contrast(${1 + 0.1 * intensity})`;
      case 'sharpen': return `contrast(${1 + 0.2 * intensity}) brightness(${1 + 0.05 * intensity})`;
      case 'grayscale': return `grayscale(${intensity})`;
      case 'sepia': return `sepia(${0.8 * intensity})`;
      case 'blur': return `blur(${2 * intensity}px)`;
      case 'vignette': return `brightness(${1 - 0.05 * intensity})`;
      default: return '';
    }
  }).filter(Boolean).join(' ');
}

export const PreviewComposition: React.FC<PreviewProps> = ({
  text,
  subtitleText,
  assets,
  orientation,
  bgmUrl,
  bgmVolume,
  backgroundStyleId,
  popups,
  filters,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  // 文字分段：字幕显示优先使用 subtitleText，TTS 使用 text
  const sentences = useMemo(() => splitTextToSentences(subtitleText || text), [subtitleText, text]);

  // 每句话显示的帧数（约3秒一句）
  const framesPerSentence = sentences.length > 0
    ? Math.floor(durationInFrames / sentences.length)
    : durationInFrames;

  // 当前显示的句子索引
  const currentSentenceIndex = Math.min(
    Math.floor(frame / framesPerSentence),
    sentences.length - 1
  );
  const currentSentence = sentences[currentSentenceIndex] || '请输入口播文字...';

  // 句子内的局部帧
  const localFrame = frame - currentSentenceIndex * framesPerSentence;

  // 文字淡入淡出动画
  const textOpacity = interpolate(
    localFrame,
    [0, 10, framesPerSentence - 10, framesPerSentence],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // 素材显示：根据每个素材的 duration 计算当前显示哪个
  const currentAsset = useMemo(() => {
    if (assets.length === 0) return null;

    const currentSecond = frame / fps;
    let accumulatedTime = 0;

    for (const asset of assets) {
      const assetDuration = asset.duration || 3;
      if (currentSecond < accumulatedTime + assetDuration) {
        return asset;
      }
      accumulatedTime += assetDuration;
    }

    // 循环播放：超出总时长后从头开始
    const totalAssetDuration = assets.reduce((sum, a) => sum + (a.duration || 3), 0);
    const loopedSecond = currentSecond % totalAssetDuration;
    accumulatedTime = 0;

    for (const asset of assets) {
      const assetDuration = asset.duration || 3;
      if (loopedSecond < accumulatedTime + assetDuration) {
        return asset;
      }
      accumulatedTime += assetDuration;
    }

    return assets[0];
  }, [assets, frame, fps]);

  // 计算滤镜样式
  const filterStyle = useMemo(() => getFilterStyle(filters), [filters]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a2e', fontFamily: 'sans-serif' }}>
      {/* 滤镜包裹层 */}
      <AbsoluteFill style={{ filter: filterStyle || undefined }}>
        {/* 背景渲染 */}
        <BackgroundRenderer styleId={backgroundStyleId || 'gradient-dark-blue'} />

        {/* 素材展示 */}
        {currentAsset && (
          <AbsoluteFill style={{ opacity: 0.7 }}>
            {currentAsset.type === 'video' ? (
              <OffthreadVideo
                src={currentAsset.url}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                muted
              />
            ) : (
              <Img
                src={currentAsset.url}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
          </AbsoluteFill>
        )}

        {/* 文字预览 */}
        <AbsoluteFill
          style={{
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingBottom: orientation === 'portrait' ? 200 : 120,
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              padding: '16px 32px',
              borderRadius: 12,
              maxWidth: '80%',
              opacity: textOpacity,
            }}
          >
            <p
              style={{
                color: '#fff',
                fontSize: orientation === 'portrait' ? 32 : 42,
                fontWeight: 600,
                textAlign: 'center',
                margin: 0,
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
              }}
            >
              {currentSentence}
            </p>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* 背景音乐 */}
      {bgmUrl && <Audio src={bgmUrl} volume={bgmVolume} />}

      {/* 弹窗层 */}
      {popups && popups.length > 0 && <PopupPreviewRenderer popups={popups} />}

      {/* 进度条 */}
      <ProgressBar frame={frame} total={durationInFrames} />
    </AbsoluteFill>
  );
};

const ProgressBar: React.FC<{ frame: number; total: number }> = ({ frame, total }) => {
  const progress = (frame / total) * 100;
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6 }}>
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          backgroundColor: '#ffcf00',
        }}
      />
    </div>
  );
};
