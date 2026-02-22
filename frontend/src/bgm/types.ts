// 背景音乐情绪分类
export type BGMCategory =
  | '轻松愉快'
  | '科技感'
  | '励志激昂'
  | '舒缓放松'
  | '神秘悬疑'
  | '活力动感';

// 背景音乐预设
export interface BGMPreset {
  id: string;
  name: string;
  category: BGMCategory;
  filename: string;
  duration: number; // 时长（秒）
  tags?: string[];
}

// 背景音乐配置（支持预设和素材库两种来源）
export interface BGMConfig {
  type: 'preset' | 'asset' | 'none';
  presetId?: string;
  assetId: string | null;
  volume: number;
}
