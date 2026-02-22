// 前端弹窗预览渲染组件
import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import type { Popup } from './types';
import { positionStyleMap } from './types';

interface PopupPreviewRendererProps {
  popups: Popup[];
}

export const PopupPreviewRenderer: React.FC<PopupPreviewRendererProps> = ({ popups }) => {
  return (
    <>
      {popups.map((popup) => (
        <SinglePopupPreview key={popup.id} popup={popup} />
      ))}
    </>
  );
};

const SinglePopupPreview: React.FC<{ popup: Popup }> = ({ popup }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const startFrame = Math.floor(popup.startTime * fps);
  const durationFrames = Math.floor(popup.duration * fps);
  const endFrame = startFrame + durationFrames;

  const isVisible = frame >= startFrame && frame < endFrame;
  if (!isVisible) return null;

  const localFrame = frame - startFrame;
  const animDuration = popup.animationDuration || 15;

  // 入场动画
  const enterProgress = spring({
    frame: localFrame,
    fps,
    config: { damping: 12 },
    durationInFrames: animDuration,
  });

  // 出场动画
  const exitStartFrame = durationFrames - animDuration;
  const exitProgress = localFrame >= exitStartFrame
    ? interpolate(localFrame - exitStartFrame, [0, animDuration], [1, 0], { extrapolateRight: 'clamp' })
    : 1;

  const opacity = Math.min(enterProgress, exitProgress);

  // 位置样式
  const positionStyle = popup.position === 'custom'
    ? { top: `${popup.customY || 50}%`, left: `${popup.customX || 50}%`, transform: 'translate(-50%, -50%)' }
    : positionStyleMap[popup.position];

  // 计算位置偏移
  const offsetX = popup.offsetX || 0;
  const offsetY = popup.offsetY || 0;
  const baseTransform = positionStyle.transform || '';
  const offsetTransform = (offsetX !== 0 || offsetY !== 0)
    ? `translate(${offsetX}px, ${offsetY}px)`
    : '';
  const finalTransform = [baseTransform, offsetTransform].filter(Boolean).join(' ');

  return (
    <div
      style={{
        position: 'absolute',
        ...positionStyle,
        transform: finalTransform,
        width: popup.width,
        height: popup.height,
        backgroundColor: popup.backgroundColor || 'rgba(0, 0, 0, 0.8)',
        borderRadius: popup.borderRadius || 12,
        borderWidth: popup.borderWidth || 0,
        borderColor: popup.borderColor || 'transparent',
        borderStyle: 'solid',
        boxShadow: popup.boxShadow || '0 10px 30px rgba(0,0,0,0.3)',
        opacity,
        zIndex: popup.zIndex || 100,
        overflow: 'hidden',
      }}
    >
      <PopupContent popup={popup} />
    </div>
  );
};

const PopupContent: React.FC<{ popup: Popup }> = ({ popup }) => {
  if (popup.contentType === 'text') {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: popup.textAlign === 'left' ? 'flex-start' : popup.textAlign === 'right' ? 'flex-end' : 'center',
        padding: popup.padding || 16,
        boxSizing: 'border-box',
      }}>
        <p style={{
          margin: 0,
          fontSize: popup.fontSize || 24,
          color: popup.textColor || '#ffffff',
          textAlign: popup.textAlign || 'center',
          lineHeight: 1.5,
          wordBreak: 'break-word',
          fontFamily: popup.fontFamily || 'sans-serif',
          fontWeight: popup.fontWeight || 'normal',
          fontStyle: popup.fontStyle || 'normal',
        }}>
          {popup.textContent || ''}
        </p>
      </div>
    );
  }

  if (popup.contentType === 'image' && popup.mediaUrl) {
    return (
      <img
        src={popup.mediaUrl}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: popup.mediaFit || 'cover' }}
      />
    );
  }

  if (popup.contentType === 'video' && popup.mediaUrl) {
    return (
      <video
        src={popup.mediaUrl}
        style={{ width: '100%', height: '100%', objectFit: popup.mediaFit || 'cover' }}
        muted={popup.videoMuted !== false}
        autoPlay
        loop
      />
    );
  }

  return null;
};

export default PopupPreviewRenderer;
