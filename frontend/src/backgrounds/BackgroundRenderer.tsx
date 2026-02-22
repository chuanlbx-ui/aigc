import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { getPresetById } from './presets';
import type {
  SolidBackgroundConfig,
  GradientBackgroundConfig,
  AnimatedBackgroundConfig,
  TechBackgroundConfig,
  PatternBackgroundConfig,
} from './types';

interface Props {
  styleId: string;
}

// 默认背景
const DefaultBackground: React.FC = () => (
  <AbsoluteFill
    style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    }}
  />
);

// 纯色背景
const SolidBackground: React.FC<{ config: SolidBackgroundConfig }> = ({ config }) => (
  <AbsoluteFill style={{ backgroundColor: config.color }} />
);

// 渐变背景
const GradientBackground: React.FC<{ config: GradientBackgroundConfig }> = ({ config }) => {
  const gradientStops = config.colors.map(c => `${c.color} ${c.position}%`).join(', ');
  return (
    <AbsoluteFill style={{ background: `linear-gradient(${config.angle}deg, ${gradientStops})` }} />
  );
};

// 动态渐变背景
const AnimatedBackground: React.FC<{ config: AnimatedBackgroundConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const angle = config.baseAngle + frame * config.angleSpeed;
  const gradientStops = config.colors.map(c => `${c.color} ${c.position}%`).join(', ');
  return (
    <AbsoluteFill style={{ background: `linear-gradient(${angle}deg, ${gradientStops})` }} />
  );
};

// 科技感背景
const TechBackground: React.FC<{ config: TechBackgroundConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();

  const gridOpacity = interpolate(frame, [0, 30], [0, 0.15], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: config.baseColor }}>
      {config.showGrid && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: gridOpacity,
            backgroundImage: `
              linear-gradient(${config.gridColor} 1px, transparent 1px),
              linear-gradient(90deg, ${config.gridColor} 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      )}
      {config.glowOrbs.map((orb, i) => {
        const pulse = Math.sin(frame * 0.05 + i) * 0.3 + 0.7;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: orb.x,
              top: orb.y,
              width: orb.size,
              height: orb.size,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${orb.color}40 0%, transparent 70%)`,
              transform: `translate(-50%, -50%) scale(${pulse})`,
              filter: 'blur(40px)',
            }}
          />
        );
      })}
      {config.showScanLine && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: (frame * 3) % (height + 100),
            width: '100%',
            height: 2,
            background: `linear-gradient(90deg, transparent, ${config.gridColor}, transparent)`,
            opacity: 0.6,
            boxShadow: `0 0 20px ${config.gridColor}`,
          }}
        />
      )}
    </AbsoluteFill>
  );
};

// 图案背景
const PatternBackground: React.FC<{ config: PatternBackgroundConfig }> = ({ config }) => {
  const renderPattern = () => {
    if (config.patternType === 'dots') {
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: config.opacity,
            backgroundImage: `radial-gradient(${config.patternColor} 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
        />
      );
    }
    if (config.patternType === 'lines') {
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: config.opacity,
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              ${config.patternColor} 10px,
              ${config.patternColor} 11px
            )`,
          }}
        />
      );
    }
    return null;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: config.baseColor }}>
      {renderPattern()}
    </AbsoluteFill>
  );
};

// 主渲染组件
export const BackgroundRenderer: React.FC<Props> = ({ styleId }) => {
  const preset = getPresetById(styleId);

  if (!preset) {
    return <DefaultBackground />;
  }

  switch (preset.config.type) {
    case 'solid':
      return <SolidBackground config={preset.config as SolidBackgroundConfig} />;
    case 'gradient':
      return <GradientBackground config={preset.config as GradientBackgroundConfig} />;
    case 'animated':
      return <AnimatedBackground config={preset.config as AnimatedBackgroundConfig} />;
    case 'tech':
      return <TechBackground config={preset.config as TechBackgroundConfig} />;
    case 'pattern':
      return <PatternBackground config={preset.config as PatternBackgroundConfig} />;
    default:
      return <DefaultBackground />;
  }
};
