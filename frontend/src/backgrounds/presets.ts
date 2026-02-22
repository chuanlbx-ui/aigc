import type { BackgroundPreset } from './types';

// 20个预设背景样式
export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  // ========== 纯色系列（4个）==========
  {
    id: 'solid-black',
    name: '纯黑',
    type: 'solid',
    category: '纯色',
    config: { type: 'solid', color: '#000000' },
  },
  {
    id: 'solid-dark-gray',
    name: '深灰',
    type: 'solid',
    category: '纯色',
    config: { type: 'solid', color: '#1a1a1a' },
  },
  {
    id: 'solid-navy',
    name: '深蓝',
    type: 'solid',
    category: '纯色',
    config: { type: 'solid', color: '#1a1a2e' },
  },
  {
    id: 'solid-dark-purple',
    name: '深紫',
    type: 'solid',
    category: '纯色',
    config: { type: 'solid', color: '#2d1b4e' },
  },

  // ========== 渐变系列（6个）==========
  {
    id: 'gradient-dark-blue',
    name: '深蓝渐变',
    type: 'gradient',
    category: '渐变',
    config: {
      type: 'gradient',
      angle: 135,
      colors: [
        { color: '#1a1a2e', position: 0 },
        { color: '#16213e', position: 50 },
        { color: '#0f3460', position: 100 },
      ],
    },
  },
  {
    id: 'gradient-purple-pink',
    name: '紫粉渐变',
    type: 'gradient',
    category: '渐变',
    config: {
      type: 'gradient',
      angle: 135,
      colors: [
        { color: '#667eea', position: 0 },
        { color: '#764ba2', position: 50 },
        { color: '#f093fb', position: 100 },
      ],
    },
  },
  {
    id: 'gradient-ocean',
    name: '海洋渐变',
    type: 'gradient',
    category: '渐变',
    config: {
      type: 'gradient',
      angle: 180,
      colors: [
        { color: '#0f2027', position: 0 },
        { color: '#203a43', position: 50 },
        { color: '#2c5364', position: 100 },
      ],
    },
  },
  {
    id: 'gradient-sunset',
    name: '日落渐变',
    type: 'gradient',
    category: '渐变',
    config: {
      type: 'gradient',
      angle: 135,
      colors: [
        { color: '#1a1a2e', position: 0 },
        { color: '#4a1942', position: 50 },
        { color: '#803d3b', position: 100 },
      ],
    },
  },
  {
    id: 'gradient-forest',
    name: '森林渐变',
    type: 'gradient',
    category: '渐变',
    config: {
      type: 'gradient',
      angle: 135,
      colors: [
        { color: '#0d1b0d', position: 0 },
        { color: '#1a3a1a', position: 50 },
        { color: '#2d5a2d', position: 100 },
      ],
    },
  },
  {
    id: 'gradient-midnight',
    name: '午夜渐变',
    type: 'gradient',
    category: '渐变',
    config: {
      type: 'gradient',
      angle: 180,
      colors: [
        { color: '#020024', position: 0 },
        { color: '#090979', position: 50 },
        { color: '#00d4ff', position: 100 },
      ],
    },
  },

  // ========== 动态渐变系列（4个）==========
  {
    id: 'animated-aurora',
    name: '极光动态',
    type: 'animated',
    category: '动态',
    config: {
      type: 'animated',
      baseAngle: 135,
      angleSpeed: 0.3,
      colors: [
        { color: '#00d4ff', position: 0 },
        { color: '#7b2ff7', position: 50 },
        { color: '#00ff88', position: 100 },
      ],
    },
  },
  {
    id: 'animated-fire',
    name: '火焰动态',
    type: 'animated',
    category: '动态',
    config: {
      type: 'animated',
      baseAngle: 180,
      angleSpeed: 0.5,
      colors: [
        { color: '#1a0a00', position: 0 },
        { color: '#ff4500', position: 50 },
        { color: '#ffd700', position: 100 },
      ],
    },
  },
  {
    id: 'animated-wave',
    name: '波浪动态',
    type: 'animated',
    category: '动态',
    config: {
      type: 'animated',
      baseAngle: 90,
      angleSpeed: 0.2,
      colors: [
        { color: '#0f2027', position: 0 },
        { color: '#2c5364', position: 50 },
        { color: '#00d4ff', position: 100 },
      ],
    },
  },
  {
    id: 'animated-neon',
    name: '霓虹动态',
    type: 'animated',
    category: '动态',
    config: {
      type: 'animated',
      baseAngle: 45,
      angleSpeed: 0.4,
      colors: [
        { color: '#ff00ff', position: 0 },
        { color: '#00ffff', position: 50 },
        { color: '#ff00ff', position: 100 },
      ],
    },
  },

  // ========== 科技感系列（3个）==========
  {
    id: 'tech-cyber',
    name: '赛博科技',
    type: 'tech',
    category: '科技',
    config: {
      type: 'tech',
      baseColor: '#0a0a1a',
      gridColor: '#00ffff',
      glowOrbs: [
        { x: '20%', y: '30%', color: '#00ffff', size: 300 },
        { x: '80%', y: '60%', color: '#ff00ff', size: 250 },
        { x: '50%', y: '80%', color: '#00ff88', size: 200 },
      ],
      showScanLine: true,
      showGrid: true,
    },
  },
  {
    id: 'tech-matrix',
    name: '矩阵科技',
    type: 'tech',
    category: '科技',
    config: {
      type: 'tech',
      baseColor: '#0a0f0a',
      gridColor: '#00ff00',
      glowOrbs: [
        { x: '30%', y: '40%', color: '#00ff00', size: 280 },
        { x: '70%', y: '70%', color: '#00ff88', size: 220 },
      ],
      showScanLine: false,
      showGrid: true,
    },
  },
  {
    id: 'tech-neon',
    name: '霓虹科技',
    type: 'tech',
    category: '科技',
    config: {
      type: 'tech',
      baseColor: '#1a0a1a',
      gridColor: '#ff00ff',
      glowOrbs: [
        { x: '25%', y: '35%', color: '#ff00ff', size: 260 },
        { x: '75%', y: '55%', color: '#00ffff', size: 240 },
        { x: '50%', y: '75%', color: '#ff00ff', size: 200 },
      ],
      showScanLine: true,
      showGrid: true,
    },
  },

  // ========== 图案系列（3个）==========
  {
    id: 'pattern-dots',
    name: '点阵图案',
    type: 'pattern',
    category: '图案',
    config: {
      type: 'pattern',
      patternType: 'dots',
      baseColor: '#1a1a2e',
      patternColor: '#ffffff',
      opacity: 0.1,
      scale: 1,
    },
  },
  {
    id: 'pattern-lines',
    name: '线条图案',
    type: 'pattern',
    category: '图案',
    config: {
      type: 'pattern',
      patternType: 'lines',
      baseColor: '#1a1a2e',
      patternColor: '#ffffff',
      opacity: 0.08,
      scale: 1,
    },
  },
  {
    id: 'pattern-particles',
    name: '粒子图案',
    type: 'pattern',
    category: '图案',
    config: {
      type: 'pattern',
      patternType: 'particles',
      baseColor: '#0a0a1a',
      patternColor: '#00ffff',
      opacity: 0.6,
      scale: 1,
    },
  },
];

// 获取预设
export const getPresetById = (id: string): BackgroundPreset | undefined => {
  return BACKGROUND_PRESETS.find(p => p.id === id);
};

// 获取分类列表
export const getCategories = (): string[] => {
  return [...new Set(BACKGROUND_PRESETS.map(p => p.category))];
};

// 按分类获取预设
export const getPresetsByCategory = (category: string): BackgroundPreset[] => {
  return BACKGROUND_PRESETS.filter(p => p.category === category);
};
