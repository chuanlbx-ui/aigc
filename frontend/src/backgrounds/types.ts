// 背景类型
export type BackgroundType = 'solid' | 'gradient' | 'animated' | 'tech' | 'pattern';

// 纯色背景配置
export interface SolidBackgroundConfig {
  type: 'solid';
  color: string;
}

// 渐变背景配置
export interface GradientBackgroundConfig {
  type: 'gradient';
  angle: number;
  colors: { color: string; position: number }[];
}

// 动态渐变背景配置
export interface AnimatedBackgroundConfig {
  type: 'animated';
  baseAngle: number;
  angleSpeed: number;
  colors: { color: string; position: number }[];
}

// 科技感背景配置
export interface TechBackgroundConfig {
  type: 'tech';
  baseColor: string;
  gridColor: string;
  glowOrbs: { x: string; y: string; color: string; size: number }[];
  showScanLine: boolean;
  showGrid: boolean;
}

// 图案背景配置
export interface PatternBackgroundConfig {
  type: 'pattern';
  patternType: 'dots' | 'lines' | 'particles';
  baseColor: string;
  patternColor: string;
  opacity: number;
  scale: number;
}

// 背景配置联合类型
export type BackgroundConfig =
  | SolidBackgroundConfig
  | GradientBackgroundConfig
  | AnimatedBackgroundConfig
  | TechBackgroundConfig
  | PatternBackgroundConfig;

// 背景预设
export interface BackgroundPreset {
  id: string;
  name: string;
  type: BackgroundType;
  category: string;
  config: BackgroundConfig;
}
