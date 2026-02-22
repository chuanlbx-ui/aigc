/**
 * 内置表情图标数据
 * 用于图片弹窗的表情选择
 */

export interface EmojiCategory {
  name: string;
  emojis: string[];
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: '表情',
    emojis: [
      '😀', '😃', '😄', '😁', '😂', '🤣', '😊', '😇',
      '🙂', '😉', '😍', '🥰', '😘', '😎', '🤩', '🥳',
      '😏', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😬',
      '😱', '😨', '😰', '😥', '😢', '😭', '🥺', '😤',
      '😡', '🤬', '😈', '👿', '💀', '☠️', '🤡', '👻',
    ],
  },
  {
    name: '手势',
    emojis: [
      '👍', '👎', '👊', '✊', '🤛', '🤜', '🤝', '👏',
      '🙌', '👐', '🤲', '🙏', '✌️', '🤞', '🤟', '🤘',
      '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️',
      '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🦾',
    ],
  },
  {
    name: '符号',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
      '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
      '🔥', '⭐', '🌟', '✨', '💫', '⚡', '💥', '💢',
      '💯', '✅', '❌', '⭕', '❗', '❓', '⚠️', '🚫',
      '💡', '🎯', '🚀', '💰', '💎', '🏆', '🎉', '🎊',
    ],
  },
  {
    name: '物品',
    emojis: [
      '📱', '💻', '🖥️', '🖨️', '⌨️', '🖱️', '💾', '💿',
      '🎮', '🕹️', '📷', '📸', '📹', '🎬', '📺', '📻',
      '🎵', '🎶', '🎤', '🎧', '🎼', '🎹', '🥁', '🎸',
      '📚', '📖', '📝', '✏️', '🖊️', '📌', '📎', '🔧',
      '💼', '📦', '🛒', '🎁', '🎀', '🏷️', '💳', '🧾',
    ],
  },
  {
    name: '自然',
    emojis: [
      '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️',
      '🌈', '🌊', '💧', '❄️', '🌸', '🌺', '🌻', '🌹',
      '🌴', '🌲', '🌳', '🍀', '🍁', '🍂', '🍃', '🌿',
    ],
  },
  {
    name: '动物',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
      '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
      '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺',
      '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞',
    ],
  },
];

// 获取所有表情的扁平列表
export function getAllEmojis(): string[] {
  return EMOJI_CATEGORIES.flatMap(cat => cat.emojis);
}

// 搜索表情（简单匹配分类名）
export function searchEmojis(query: string): string[] {
  if (!query) return getAllEmojis();
  const lowerQuery = query.toLowerCase();
  const matchedCategories = EMOJI_CATEGORIES.filter(cat =>
    cat.name.toLowerCase().includes(lowerQuery)
  );
  if (matchedCategories.length > 0) {
    return matchedCategories.flatMap(cat => cat.emojis);
  }
  return getAllEmojis();
}
