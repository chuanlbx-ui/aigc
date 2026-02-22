import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './BannerSection.css';

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  coverImage?: string;
  publishedAt: string;
}

interface BannerSectionProps {
  items: ContentItem[];
  config?: {
    autoPlay?: boolean;
    interval?: number;
    height?: number | string;
  };
}

export default function BannerSection({ items, config = {} }: BannerSectionProps) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const { autoPlay = true, interval = 5000, height = 200 } = config;

  useEffect(() => {
    if (!autoPlay || items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, interval);
    return () => clearInterval(timer);
  }, [autoPlay, interval, items.length]);

  if (items.length === 0) return null;

  const handleClick = (slug: string) => {
    navigate(`/read/${slug}`);
  };

  return (
    <div className="banner-section" style={{ height }}>
      <div className="banner-container">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`banner-item ${index === currentIndex ? 'active' : ''}`}
            onClick={() => handleClick(item.slug)}
          >
            {item.coverImage ? (
              <img src={item.coverImage} alt={item.title} className="banner-image" />
            ) : (
              <div className="banner-placeholder" />
            )}
            <div className="banner-overlay">
              <h3 className="banner-title">{item.title}</h3>
              {item.summary && <p className="banner-summary">{item.summary}</p>}
            </div>
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <div className="banner-dots">
          {items.map((_, index) => (
            <span
              key={index}
              className={`dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
