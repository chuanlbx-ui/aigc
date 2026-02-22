import { useState } from 'react';
import { Card, Checkbox, Tag, Tooltip } from 'antd';
import { PlayCircleOutlined, SoundOutlined } from '@ant-design/icons';

export interface SearchResultItem {
  id: string;
  source: string;
  type: 'image' | 'video' | 'audio';
  title: string;
  thumbnailUrl: string;
  previewUrl: string;
  downloadUrl: string;
  width?: number;
  height?: number;
  duration?: number;
  author?: string;
  license?: string;
}

interface SearchResultCardProps {
  item: SearchResultItem;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onPreview?: () => void;
}

// 来源颜色映射
const SOURCE_COLORS: Record<string, string> = {
  pexels: 'green',
  pixabay: 'blue',
  unsplash: 'purple',
  freesound: 'orange',
};

export default function SearchResultCard({
  item,
  selected,
  onSelect,
  onPreview,
}: SearchResultCardProps) {
  const [isHovering, setIsHovering] = useState(false);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card
      hoverable
      size="small"
      style={{
        border: selected ? '2px solid #1890ff' : '1px solid #f0f0f0',
        borderRadius: 8,
      }}
      cover={
        <div
          style={{
            position: 'relative',
            height: 120,
            background: '#f5f5f5',
            overflow: 'hidden',
            cursor: 'pointer',
          }}
          onClick={onPreview}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {item.type === 'audio' ? (
            <div style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}>
              <SoundOutlined style={{ fontSize: 48, color: '#fff' }} />
            </div>
          ) : item.type === 'video' && isHovering ? (
            <video
              src={item.previewUrl}
              autoPlay
              muted
              loop
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          )}
          {/* 视频/音频时长标签 */}
          {item.duration && (
            <Tag style={{
              position: 'absolute',
              bottom: 4,
              right: 4,
              margin: 0,
            }}>
              {formatDuration(item.duration)}
            </Tag>
          )}
          {/* 视频播放图标 */}
          {item.type === 'video' && (
            <PlayCircleOutlined style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 32,
              color: '#fff',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }} />
          )}
          {/* 选择复选框 */}
          <Checkbox
            checked={selected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect(e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: 4,
              left: 4,
            }}
          />
        </div>
      }
    >
      <Tooltip title={item.title}>
        <div style={{
          fontSize: 12,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: 4,
        }}>
          {item.title}
        </div>
      </Tooltip>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Tag color={SOURCE_COLORS[item.source] || 'default'} style={{ margin: 0 }}>
          {item.source}
        </Tag>
        {item.author && (
          <span style={{ fontSize: 10, color: '#999' }}>
            {item.author}
          </span>
        )}
      </div>
    </Card>
  );
}
