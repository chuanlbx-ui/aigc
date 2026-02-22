// 前端弹窗类型定义（与 Remotion 共享）
export type PopupPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | 'custom';

export type EnterAnimation =
  | 'none' | 'fade' | 'slideLeft' | 'slideRight'
  | 'slideUp' | 'slideDown' | 'scale' | 'bounce';

export type ExitAnimation =
  | 'none' | 'fade' | 'slideLeft' | 'slideRight'
  | 'slideUp' | 'slideDown' | 'scale';

export interface Popup {
  id: string;
  contentType: 'text' | 'image' | 'video';
  textContent?: string;
  mediaUrl?: string;
  mediaAssetId?: string;  // 素材库资源ID
  mediaFit?: 'cover' | 'contain' | 'fill';
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: number;
  textColor?: string;
  fontFamily?: string;    // 字体
  fontWeight?: 'normal' | 'bold';  // 加粗
  fontStyle?: 'normal' | 'italic'; // 斜体
  width: number;
  height: number;
  position: PopupPosition;
  customX?: number;
  customY?: number;
  offsetX?: number;  // X轴偏移微调
  offsetY?: number;  // Y轴偏移微调
  startTime: number;
  duration: number;
  enterAnimation: EnterAnimation;
  exitAnimation: ExitAnimation;
  animationDuration?: number;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  boxShadow?: string;
  padding?: number;
  zIndex?: number;
  videoMuted?: boolean;
}

// 位置样式映射
export const positionStyleMap: Record<PopupPosition, React.CSSProperties> = {
  'top-left': { top: '5%', left: '5%' },
  'top-center': { top: '5%', left: '50%', transform: 'translateX(-50%)' },
  'top-right': { top: '5%', right: '5%' },
  'center-left': { top: '50%', left: '5%', transform: 'translateY(-50%)' },
  'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
  'center-right': { top: '50%', right: '5%', transform: 'translateY(-50%)' },
  'bottom-left': { bottom: '15%', left: '5%' },
  'bottom-center': { bottom: '15%', left: '50%', transform: 'translateX(-50%)' },
  'bottom-right': { bottom: '15%', right: '5%' },
  'custom': {},
};
