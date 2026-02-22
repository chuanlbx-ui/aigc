import { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Select, Slider, message, Tooltip, Segmented } from 'antd';
import {
  SoundOutlined, PlayCircleOutlined, PauseCircleOutlined,
  StepBackwardOutlined, StepForwardOutlined, LoadingOutlined,
  FontSizeOutlined, BgColorsOutlined
} from '@ant-design/icons';
import { api } from '../../api/client';

// 字体大小选项
export type FontSizeType = 'small' | 'medium' | 'large' | 'xlarge';
export const FONT_SIZE_OPTIONS: { value: FontSizeType; label: string }[] = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
  { value: 'xlarge', label: '特大' },
];

// 背景主题选项
export type ThemeType = 'light' | 'dark';
export const THEME_OPTIONS: { value: ThemeType; label: string }[] = [
  { value: 'light', label: '白天' },
  { value: 'dark', label: '夜间' },
];

// 段落信息（index=0 为标题，index>=1 为正文段落）
interface SegmentInfo {
  index: number;
  text: string;
  matchText?: string;    // 用于前端匹配高亮的文本片段
  audioUrl?: string;
  duration?: number;
  loading?: boolean;
  isTitle?: boolean;
}

interface ArticleReaderProps {
  articleId: string;
  title: string;
  content: string;
  onHighlight: (index: number, matchText?: string) => void;
  // 字体大小和主题控制
  fontSize: FontSizeType;
  theme: ThemeType;
  onFontSizeChange: (size: FontSizeType) => void;
  onThemeChange: (theme: ThemeType) => void;
}

// 语音选项
const VOICE_OPTIONS = [
  { value: 'zh-CN-XiaoxiaoNeural', label: '晓晓 (女声)' },
  { value: 'zh-CN-XiaoyiNeural', label: '晓伊 (女声)' },
  { value: 'zh-CN-YunxiNeural', label: '云希 (男声)' },
  { value: 'zh-CN-YunjianNeural', label: '云健 (男声)' },
  { value: 'zh-CN-YunyangNeural', label: '云扬 (男声)' },
];

export default function ArticleReader({
  articleId: _articleId,
  title,
  content,
  onHighlight,
  fontSize,
  theme,
  onFontSizeChange,
  onThemeChange,
}: ArticleReaderProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [segments, setSegments] = useState<SegmentInfo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [voice, setVoice] = useState('zh-CN-XiaoxiaoNeural');
  const [rate, setRate] = useState(1.3);  // 默认 1.3 倍语速
  const [initializing, setInitializing] = useState(false);

  // 初始化：获取段落列表（标题作为第一段）
  const initSegments = useCallback(async () => {
    setInitializing(true);
    try {
      const res = await api.post('/tts/article-segments', { content });
      // 标题作为 index=0，正文段落从 index=1 开始
      const titleSegment: SegmentInfo = {
        index: 0,
        text: title,
        matchText: title.substring(0, 30),  // 标题的匹配文本
        isTitle: true,
        loading: false,
      };
      const contentSegments = res.data.segments.map((s: any) => ({
        index: s.index + 1,  // 正文段落索引 +1
        text: s.text,
        matchText: s.matchText,  // 后端返回的匹配文本
        isTitle: false,
        loading: false,
      }));
      setSegments([titleSegment, ...contentSegments]);
    } catch (error: any) {
      message.error('初始化失败');
    } finally {
      setInitializing(false);
    }
  }, [content, title]);

  // 生成单个段落音频
  const generateSegmentAudio = useCallback(async (index: number): Promise<string | null> => {
    const seg = segments[index];
    if (!seg) return null;
    if (seg.audioUrl) return seg.audioUrl;

    // 标记为加载中
    setSegments(prev => prev.map((s, i) =>
      i === index ? { ...s, loading: true } : s
    ));

    try {
      const res = await api.post('/tts/segment-audio', {
        text: seg.text,
        index,
        voice,
        rate,
      });

      const audioUrl = res.data.audioUrl;
      const duration = res.data.duration;

      setSegments(prev => prev.map((s, i) =>
        i === index ? { ...s, audioUrl, duration, loading: false } : s
      ));

      return audioUrl;
    } catch (error) {
      setSegments(prev => prev.map((s, i) =>
        i === index ? { ...s, loading: false } : s
      ));
      return null;
    }
  }, [segments, voice, rate]);

  // 预加载下一段
  const preloadNext = useCallback((currentIdx: number) => {
    const nextIdx = currentIdx + 1;
    if (nextIdx < segments.length && !segments[nextIdx]?.audioUrl && !segments[nextIdx]?.loading) {
      generateSegmentAudio(nextIdx);
    }
  }, [segments, generateSegmentAudio]);

  // 播放指定段落
  const playSegment = useCallback(async (index: number) => {
    if (index < 0 || index >= segments.length) {
      setPlaying(false);
      setCurrentIndex(-1);
      onHighlight(-1);
      return;
    }

    setCurrentIndex(index);
    // 传递 matchText 用于前端匹配高亮
    onHighlight(index, segments[index]?.matchText);

    let audioUrl: string | null | undefined = segments[index]?.audioUrl;
    if (!audioUrl) {
      audioUrl = await generateSegmentAudio(index);
    }

    if (!audioUrl) {
      message.error('音频生成失败，跳到下一段');
      // 生成失败时自动跳到下一段
      const nextIdx = index + 1;
      if (nextIdx < segments.length) {
        setTimeout(() => playSegment(nextIdx), 500);
      } else {
        setPlaying(false);
        setCurrentIndex(-1);
        onHighlight(-1);
      }
      return;
    }

    // 预加载下一段
    preloadNext(index);

    if (audioRef.current) {
      // 添加时间戳避免浏览器缓存问题
      const urlWithTimestamp = audioUrl.includes('?')
        ? `${audioUrl}&_t=${Date.now()}`
        : `${audioUrl}?_t=${Date.now()}`;
      audioRef.current.src = urlWithTimestamp;

      try {
        await audioRef.current.play();
        setPlaying(true);
      } catch (err: any) {
        console.error('播放失败:', err);
        // play() 失败不需要额外处理，error 事件会触发 playNextOrEnd
      }
    }
  }, [segments, generateSegmentAudio, preloadNext, onHighlight]);

  // 开始播放
  const handlePlay = async () => {
    if (segments.length === 0) {
      await initSegments();
      return;
    }

    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
    } else {
      const startIdx = currentIndex >= 0 ? currentIndex : 0;
      await playSegment(startIdx);
    }
  };

  // 播放下一段或结束
  const playNextOrEnd = useCallback(() => {
    const nextIdx = currentIndex + 1;
    if (nextIdx < segments.length) {
      playSegment(nextIdx);
    } else {
      setPlaying(false);
      setCurrentIndex(-1);
      onHighlight(-1);
    }
  }, [currentIndex, segments.length, playSegment, onHighlight]);

  // 音频播放结束或出错，自动播放下一段
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      playNextOrEnd();
    };

    // 处理音频加载/播放错误（404、416 等）
    const handleError = (e: Event) => {
      const audioEl = e.target as HTMLAudioElement;
      const error = audioEl.error;
      // 只有在真正的错误时才处理（排除 MEDIA_ERR_ABORTED，这通常是切换音频源导致的）
      if (error && error.code !== MediaError.MEDIA_ERR_ABORTED) {
        console.error('音频播放错误:', error?.code, error?.message);
        message.error('播放失败，跳到下一段');
        // 出错时自动跳到下一段
        playNextOrEnd();
      }
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [playNextOrEnd]);

  // 上一段/下一段
  const jumpToPrev = () => {
    if (currentIndex > 0) {
      playSegment(currentIndex - 1);
    }
  };

  const jumpToNext = () => {
    if (currentIndex < segments.length - 1) {
      playSegment(currentIndex + 1);
    }
  };

  // 语音/语速变化时重置
  const handleVoiceChange = (v: string) => {
    setVoice(v);
    resetState();
  };

  const handleRateChange = (r: number) => {
    setRate(r);
    resetState();
  };

  const resetState = () => {
    audioRef.current?.pause();
    setPlaying(false);
    setCurrentIndex(-1);
    setSegments([]);
    onHighlight(-1);
  };

  // 初始化后自动开始播放第一段
  useEffect(() => {
    if (segments.length > 0 && currentIndex === -1 && !playing) {
      playSegment(0);
    }
  }, [segments.length]);

  const isLoading = initializing || (currentIndex >= 0 && segments[currentIndex]?.loading);

  // 显示当前段落信息（标题或正文第几段）
  const getProgressText = () => {
    if (segments.length === 0) return '';
    if (currentIndex < 0) return `共 ${segments.length} 段`;
    const seg = segments[currentIndex];
    if (seg?.isTitle) return `标题 / ${segments.length} 段`;
    return `${currentIndex} / ${segments.length - 1} 段`;
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 0',
      borderBottom: '1px solid #f0f0f0',
      marginBottom: 16,
      flexWrap: 'wrap',  // 允许换行
      overflowX: 'auto',
    }}>
      <SoundOutlined style={{ fontSize: 16, color: '#1890ff', flexShrink: 0 }} />

      {/* 播放控制 */}
      <Button
        icon={<StepBackwardOutlined />}
        size="small"
        disabled={currentIndex <= 0}
        onClick={jumpToPrev}
      />
      <Button
        type="primary"
        shape="circle"
        icon={isLoading ? <LoadingOutlined /> : (playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />)}
        onClick={handlePlay}
        disabled={isLoading}
      />
      <Button
        icon={<StepForwardOutlined />}
        size="small"
        disabled={currentIndex < 0 || currentIndex >= segments.length - 1}
        onClick={jumpToNext}
      />

      {/* 段落进度 */}
      <span style={{ fontSize: 12, color: '#666', minWidth: 60, flexShrink: 0 }}>
        {getProgressText()}
      </span>

      {/* 语音选择 */}
      <Select
        value={voice}
        onChange={handleVoiceChange}
        style={{ width: 100, flexShrink: 0 }}
        size="small"
        options={VOICE_OPTIONS}
        disabled={playing}
      />

      {/* 语速控制 */}
      <Tooltip title={`语速 ${rate}x`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: '#666' }}>{rate}x</span>
          <Slider
            min={0.5}
            max={2.0}
            step={0.1}
            value={rate}
            onChange={handleRateChange}
            style={{ width: 50, margin: 0 }}
            tooltip={{ open: false }}
            disabled={playing}
          />
        </div>
      </Tooltip>

      {/* 分隔线 */}
      <div style={{ width: 1, height: 20, background: '#e8e8e8', flexShrink: 0 }} />

      {/* 字体大小 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <FontSizeOutlined style={{ fontSize: 14, color: '#666' }} />
        <Segmented
          size="small"
          value={fontSize}
          onChange={(v) => onFontSizeChange(v as FontSizeType)}
          options={FONT_SIZE_OPTIONS}
        />
      </div>

      {/* 背景主题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <BgColorsOutlined style={{ fontSize: 14, color: '#666' }} />
        <Segmented
          size="small"
          value={theme}
          onChange={(v) => onThemeChange(v as ThemeType)}
          options={THEME_OPTIONS}
        />
      </div>

      {/* 隐藏的 audio 元素 */}
      <audio ref={audioRef} preload="auto" style={{ display: 'none' }} />
    </div>
  );
};
