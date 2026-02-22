import { create } from 'zustand';
import { api } from '../api/client';

interface Asset {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
  duration: number; // 展现时长（秒）
}

// 弹窗类型定义
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

// ========== 滤镜配置 ==========
export type FilterType = 'warm' | 'cool' | 'vintage' | 'sharpen' | 'vignette' | 'grayscale' | 'sepia' | 'blur';

export interface FilterConfig {
  type: FilterType;
  intensity?: number; // 0-1
}

// ========== 真人叠加配置 ==========
export type PresenterPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface PresenterConfig {
  enabled: boolean;
  assetId?: string;
  assetUrl?: string;
  position: PresenterPosition;
  scale: number; // 0.1-1
  entranceAnimation: EnterAnimation;
}

// ========== 绿幕配置 ==========
export type ChromaKeyColor = 'green' | 'blue' | 'custom';

export interface GreenScreenConfig {
  enabled: boolean;
  assetId?: string;
  assetUrl?: string;
  chromaColor: ChromaKeyColor;
  customColor?: string; // hex color
  tolerance: number; // 0-1
  position: PresenterPosition;
  scale: number;
}

// ========== 数字人配置 ==========
export type AvatarStyle = 'normal' | 'circle' | 'closeUp';
export type DigitalHumanBackground = 'transparent' | 'color';

export interface DigitalHumanConfig {
  enabled: boolean;
  avatarId?: string;
  avatarStyle?: AvatarStyle;
  voiceId?: string;
  voiceSpeed?: number; // 0.5-1.5
  backgroundType?: DigitalHumanBackground;
  backgroundColor?: string; // hex color
}

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

interface VideoConfig {
  text: string;
  subtitleText?: string;  // 格式化后的字幕文本（用于显示）
  tts: {
    provider: 'edge' | 'openai' | 'azure';
    voice: string;
    rate: number;
  };
  assets: Asset[];
  popups: Popup[];
  bgm: {
    type: 'preset' | 'asset' | 'none';
    presetId?: string;
    assetId: string | null;
    volume: number;
  };
  background: {
    styleId: string;
  };
  orientation: 'landscape' | 'portrait';
  resolution: '1080p' | '720p';
  // 新增：增强功能配置
  filters?: FilterConfig[];
  presenter?: PresenterConfig;
  greenScreen?: GreenScreenConfig;
  digitalHuman?: DigitalHumanConfig;
}

interface EditorStore {
  projectName: string;
  config: VideoConfig;
  setProjectName: (name: string) => void;
  updateConfig: (partial: Partial<VideoConfig>) => void;
  saveProject: (id?: string) => Promise<string>;
  submitRender: (id?: string) => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  reset: () => void;
}

const defaultConfig: VideoConfig = {
  text: '',
  tts: {
    provider: 'edge',
    voice: 'zh-CN-XiaoxiaoNeural',
    rate: 1.0,
  },
  assets: [],
  popups: [],
  bgm: {
    type: 'none',
    presetId: undefined,
    assetId: null,
    volume: 0.3,
  },
  background: {
    styleId: 'gradient-dark-blue',
  },
  orientation: 'landscape',
  resolution: '1080p',
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  projectName: '',
  config: { ...defaultConfig },

  setProjectName: (name) => {
    set({ projectName: name });
  },

  updateConfig: (partial) => {
    set((state) => ({
      config: { ...state.config, ...partial },
    }));
  },

  saveProject: async (id) => {
    const { config, projectName } = get();
    const name = projectName || `项目-${Date.now()}`;
    if (id) {
      await api.put(`/projects/${id}`, { name, config });
      return id;
    }
    const res = await api.post('/projects', { name, config });
    return res.data.id;
  },

  submitRender: async (id) => {
    if (!id) return;
    await api.post(`/projects/${id}/render`);
  },

  loadProject: async (id) => {
    const res = await api.get(`/projects/${id}`);
    // 合并默认值，确保旧项目兼容新字段
    const loadedConfig = res.data.config || {};

    // BGM 向后兼容：旧配置没有 type 字段
    let bgmConfig = { ...defaultConfig.bgm, ...loadedConfig.bgm };
    if (!loadedConfig.bgm?.type) {
      // 旧配置格式，根据 assetId 推断 type
      if (loadedConfig.bgm?.assetId) {
        bgmConfig.type = 'asset';
      } else {
        bgmConfig.type = 'none';
      }
    }

    set({
      projectName: res.data.name || '',
      config: {
        ...defaultConfig,
        ...loadedConfig,
        tts: { ...defaultConfig.tts, ...loadedConfig.tts },
        bgm: bgmConfig,
        background: { ...defaultConfig.background, ...loadedConfig.background },
      }
    });
  },

  reset: () => {
    set({ projectName: '', config: { ...defaultConfig } });
  },
}));
