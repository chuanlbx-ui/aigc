import React from 'react';
import type { BackgroundPreset } from '../../../backgrounds/types';

interface Props {
  preset: BackgroundPreset;
  selected?: boolean;
  onClick?: () => void;
}

// CSS 动画预览组件 - 模拟 Remotion 背景效果
export const BackgroundPreview: React.FC<Props> = ({ preset, selected, onClick }) => {
  const { config } = preset;

  const getBackgroundStyle = (): React.CSSProperties => {
    switch (config.type) {
      case 'solid':
        return { backgroundColor: config.color };

      case 'gradient': {
        const stops = config.colors.map(c => `${c.color} ${c.position}%`).join(', ');
        return { background: `linear-gradient(${config.angle}deg, ${stops})` };
      }

      case 'animated': {
        const stops = config.colors.map(c => `${c.color} ${c.position}%`).join(', ');
        return {
          background: `linear-gradient(${config.baseAngle}deg, ${stops})`,
          animation: 'rotateGradient 3s linear infinite',
        };
      }

      case 'tech':
        return { backgroundColor: config.baseColor };

      case 'pattern':
        return { backgroundColor: config.baseColor };

      default:
        return { backgroundColor: '#1a1a2e' };
    }
  };

  const renderOverlay = () => {
    if (config.type === 'tech' && config.showGrid) {
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.15,
            backgroundImage: `
              linear-gradient(${config.gridColor} 1px, transparent 1px),
              linear-gradient(90deg, ${config.gridColor} 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />
      );
    }

    if (config.type === 'pattern') {
      if (config.patternType === 'dots') {
        return (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: config.opacity,
              backgroundImage: `radial-gradient(${config.patternColor} 1px, transparent 1px)`,
              backgroundSize: '8px 8px',
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
                transparent 4px,
                ${config.patternColor} 4px,
                ${config.patternColor} 5px
              )`,
            }}
          />
        );
      }
    }

    return null;
  };

  return (
    <div
      onClick={onClick}
      style={{
        width: '100%',
        aspectRatio: '16/9',
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        border: selected ? '3px solid #1890ff' : '2px solid transparent',
        boxShadow: selected ? '0 0 0 2px rgba(24, 144, 255, 0.2)' : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          ...getBackgroundStyle(),
        }}
      />
      {renderOverlay()}

      {/* 名称标签 */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '4px 8px',
          background: 'rgba(0,0,0,0.6)',
          color: '#fff',
          fontSize: 12,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {preset.name}
      </div>

      {/* CSS 动画样式 */}
      <style>{`
        @keyframes rotateGradient {
          from { filter: hue-rotate(0deg); }
          to { filter: hue-rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default BackgroundPreview;
