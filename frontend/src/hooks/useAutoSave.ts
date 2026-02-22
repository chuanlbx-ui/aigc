import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAutoSaveOptions {
  /** 自动保存间隔（秒），默认 60 */
  interval?: number;
  /** 保存函数 */
  onSave: () => Promise<void>;
  /** 是否启用自动保存，默认 true */
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  /** 倒计时秒数 */
  countdown: number;
  /** 是否正在保存 */
  saving: boolean;
  /** 手动触发保存（会重置倒计时） */
  save: () => Promise<void>;
  /** 重置倒计时 */
  resetCountdown: () => void;
  /** 获取保存按钮显示文本 */
  getSaveButtonText: () => string;
}

/**
 * 自动保存 Hook
 * 提供倒计时自动保存功能，倒计时显示在保存按钮上
 */
export function useAutoSave({
  interval = 60,
  onSave,
  enabled = true,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [countdown, setCountdown] = useState(interval);
  const [saving, setSaving] = useState(false);
  const countdownRef = useRef(interval);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 执行保存
  const save = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
      // 保存后重置倒计时
      countdownRef.current = interval;
      setCountdown(interval);
    }
  }, [onSave, saving, interval]);

  // 重置倒计时
  const resetCountdown = useCallback(() => {
    countdownRef.current = interval;
    setCountdown(interval);
  }, [interval]);

  // 倒计时逻辑
  useEffect(() => {
    if (!enabled) return;

    timerRef.current = setInterval(() => {
      countdownRef.current -= 1;
      setCountdown(countdownRef.current);

      if (countdownRef.current <= 0) {
        // 触发自动保存
        save();
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [enabled, save]);

  // 获取保存按钮文本
  const getSaveButtonText = useCallback(() => {
    if (saving) return '保存中...';
    if (!enabled) return '保存';
    return `保存 (${countdown}s)`;
  }, [saving, enabled, countdown]);

  return {
    countdown,
    saving,
    save,
    resetCountdown,
    getSaveButtonText,
  };
}

export default useAutoSave;
