import React, { useState, useRef } from 'react';
import { Card, Typography } from 'antd';
import { SoundOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import type { BGMPreset } from '../../../bgm/types';
import { formatDuration } from '../../../bgm/presets';

interface Props {
  preset: BGMPreset;
  selected?: boolean;
  onClick?: () => void;
}

export const BGMPreview: React.FC<Props> = ({ preset, selected, onClick }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayToggle = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!audioRef.current) {
      audioRef.current = new Audio(`/bgm/presets/${preset.filename}`);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <Card
      hoverable
      onClick={onClick}
      style={{
        border: selected ? '2px solid #1890ff' : '1px solid #f0f0f0',
        borderRadius: 8,
      }}
      bodyStyle={{ padding: 12 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <SoundOutlined style={{ fontSize: 18, color: '#fff' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <Typography.Text
            strong
            style={{
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {preset.name}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatDuration(preset.duration)}
          </Typography.Text>
        </div>

        <div
          onClick={handlePlayToggle}
          style={{ cursor: 'pointer', fontSize: 24, color: '#1890ff' }}
        >
          {isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
        </div>
      </div>
    </Card>
  );
};

export default BGMPreview;
