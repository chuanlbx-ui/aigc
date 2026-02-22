import { useNavigate } from 'react-router-dom';
import './VideoListSection.css';

interface VideoItem {
  id: string;
  title: string;
  slug: string;
  coverImage?: string;
  duration?: number;
  publishedAt: string;
}

interface VideoListSectionProps {
  items: VideoItem[];
  config?: {
    columns?: 1 | 2;
    showDuration?: boolean;
    aspectRatio?: '16:9' | '4:3' | '1:1';
  };
}

export default function VideoListSection({ items, config = {} }: VideoListSectionProps) {
  const navigate = useNavigate();
  const { columns = 2, showDuration = true, aspectRatio = '16:9' } = config;

  if (items.length === 0) return null;

  const handleClick = (slug: string) => {
    navigate(`/read/${slug}`);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`video-list-section columns-${columns}`}>
      {items.map((item) => (
        <div key={item.id} className="video-item" onClick={() => handleClick(item.slug)}>
          <div className={`video-cover ratio-${aspectRatio.replace(':', '-')}`}>
            {item.coverImage ? (
              <img src={item.coverImage} alt={item.title} />
            ) : (
              <div className="cover-placeholder">
                <span className="play-icon">▶</span>
              </div>
            )}
            {showDuration && item.duration && (
              <span className="duration">{formatDuration(item.duration)}</span>
            )}
          </div>
          <h4 className="video-title">{item.title}</h4>
        </div>
      ))}
    </div>
  );
}
