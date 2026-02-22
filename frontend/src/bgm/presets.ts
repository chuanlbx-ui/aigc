import type { BGMPreset, BGMCategory } from './types';

// 30首预设背景音乐
export const BGM_PRESETS: BGMPreset[] = [
  // ========== 轻松愉快（6首）==========
  {
    id: 'happy-01',
    name: '阳光早晨',
    category: '轻松愉快',
    filename: 'happy-01.mp3',
    duration: 120,
    tags: ['欢快', '明亮'],
  },
  {
    id: 'happy-02',
    name: '快乐时光',
    category: '轻松愉快',
    filename: 'happy-02.mp3',
    duration: 90,
    tags: ['愉悦', '轻松'],
  },
  {
    id: 'happy-03',
    name: '悠闲午后',
    category: '轻松愉快',
    filename: 'happy-03.mp3',
    duration: 105,
    tags: ['休闲', '舒适'],
  },
  {
    id: 'happy-04',
    name: '甜蜜心情',
    category: '轻松愉快',
    filename: 'happy-04.mp3',
    duration: 95,
    tags: ['甜美', '温馨'],
  },
  {
    id: 'happy-05',
    name: '轻快节拍',
    category: '轻松愉快',
    filename: 'happy-05.mp3',
    duration: 110,
    tags: ['活泼', '俏皮'],
  },
  {
    id: 'happy-06',
    name: '美好一天',
    category: '轻松愉快',
    filename: 'happy-06.mp3',
    duration: 100,
    tags: ['积极', '向上'],
  },

  // ========== 科技感（6首）==========
  {
    id: 'tech-01',
    name: '数字未来',
    category: '科技感',
    filename: 'tech-01.mp3',
    duration: 120,
    tags: ['科技', '现代'],
  },
  {
    id: 'tech-02',
    name: '智能时代',
    category: '科技感',
    filename: 'tech-02.mp3',
    duration: 100,
    tags: ['AI', '创新'],
  },
  {
    id: 'tech-03',
    name: '电子脉冲',
    category: '科技感',
    filename: 'tech-03.mp3',
    duration: 115,
    tags: ['电子', '节奏'],
  },
  {
    id: 'tech-04',
    name: '赛博空间',
    category: '科技感',
    filename: 'tech-04.mp3',
    duration: 130,
    tags: ['赛博', '未来'],
  },
  {
    id: 'tech-05',
    name: '科技企业',
    category: '科技感',
    filename: 'tech-05.mp3',
    duration: 95,
    tags: ['商务', '专业'],
  },
  {
    id: 'tech-06',
    name: '创新驱动',
    category: '科技感',
    filename: 'tech-06.mp3',
    duration: 110,
    tags: ['进步', '发展'],
  },

  // ========== 励志激昂（5首）==========
  {
    id: 'inspiring-01',
    name: '梦想起航',
    category: '励志激昂',
    filename: 'inspiring-01.mp3',
    duration: 140,
    tags: ['励志', '奋斗'],
  },
  {
    id: 'inspiring-02',
    name: '巅峰时刻',
    category: '励志激昂',
    filename: 'inspiring-02.mp3',
    duration: 125,
    tags: ['史诗', '震撼'],
  },
  {
    id: 'inspiring-03',
    name: '勇往直前',
    category: '励志激昂',
    filename: 'inspiring-03.mp3',
    duration: 135,
    tags: ['勇气', '力量'],
  },
  {
    id: 'inspiring-04',
    name: '荣耀之路',
    category: '励志激昂',
    filename: 'inspiring-04.mp3',
    duration: 150,
    tags: ['胜利', '荣耀'],
  },
  {
    id: 'inspiring-05',
    name: '超越自我',
    category: '励志激昂',
    filename: 'inspiring-05.mp3',
    duration: 120,
    tags: ['突破', '成长'],
  },

  // ========== 舒缓放松（5首）==========
  {
    id: 'calm-01',
    name: '宁静时光',
    category: '舒缓放松',
    filename: 'calm-01.mp3',
    duration: 180,
    tags: ['平静', '安宁'],
  },
  {
    id: 'calm-02',
    name: '轻柔旋律',
    category: '舒缓放松',
    filename: 'calm-02.mp3',
    duration: 160,
    tags: ['柔和', '舒适'],
  },
  {
    id: 'calm-03',
    name: '冥想之音',
    category: '舒缓放松',
    filename: 'calm-03.mp3',
    duration: 200,
    tags: ['冥想', '放松'],
  },
  {
    id: 'calm-04',
    name: '钢琴轻语',
    category: '舒缓放松',
    filename: 'calm-04.mp3',
    duration: 150,
    tags: ['钢琴', '优雅'],
  },
  {
    id: 'calm-05',
    name: '自然之声',
    category: '舒缓放松',
    filename: 'calm-05.mp3',
    duration: 170,
    tags: ['自然', '治愈'],
  },

  // ========== 神秘悬疑（5首）==========
  {
    id: 'mystery-01',
    name: '迷雾重重',
    category: '神秘悬疑',
    filename: 'mystery-01.mp3',
    duration: 130,
    tags: ['神秘', '悬疑'],
  },
  {
    id: 'mystery-02',
    name: '暗夜追踪',
    category: '神秘悬疑',
    filename: 'mystery-02.mp3',
    duration: 140,
    tags: ['紧张', '刺激'],
  },
  {
    id: 'mystery-03',
    name: '未知领域',
    category: '神秘悬疑',
    filename: 'mystery-03.mp3',
    duration: 125,
    tags: ['探索', '好奇'],
  },
  {
    id: 'mystery-04',
    name: '深渊凝视',
    category: '神秘悬疑',
    filename: 'mystery-04.mp3',
    duration: 145,
    tags: ['深邃', '氛围'],
  },
  {
    id: 'mystery-05',
    name: '谜题揭晓',
    category: '神秘悬疑',
    filename: 'mystery-05.mp3',
    duration: 135,
    tags: ['揭秘', '真相'],
  },

  // ========== 活力动感（5首）==========
  {
    id: 'energetic-01',
    name: '活力四射',
    category: '活力动感',
    filename: 'energetic-01.mp3',
    duration: 100,
    tags: ['活力', '动感'],
  },
  {
    id: 'energetic-02',
    name: '运动节拍',
    category: '活力动感',
    filename: 'energetic-02.mp3',
    duration: 95,
    tags: ['运动', '健身'],
  },
  {
    id: 'energetic-03',
    name: '极速狂飙',
    category: '活力动感',
    filename: 'energetic-03.mp3',
    duration: 90,
    tags: ['速度', '激情'],
  },
  {
    id: 'energetic-04',
    name: '电音派对',
    category: '活力动感',
    filename: 'energetic-04.mp3',
    duration: 110,
    tags: ['电音', '派对'],
  },
  {
    id: 'energetic-05',
    name: '劲爆节奏',
    category: '活力动感',
    filename: 'energetic-05.mp3',
    duration: 105,
    tags: ['劲爆', '热血'],
  },
];

// 获取预设
export const getPresetById = (id: string): BGMPreset | undefined => {
  return BGM_PRESETS.find((p) => p.id === id);
};

// 获取分类列表
export const getCategories = (): BGMCategory[] => {
  return [...new Set(BGM_PRESETS.map((p) => p.category))] as BGMCategory[];
};

// 按分类获取预设
export const getPresetsByCategory = (category: BGMCategory): BGMPreset[] => {
  return BGM_PRESETS.filter((p) => p.category === category);
};

// 格式化时长显示
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
