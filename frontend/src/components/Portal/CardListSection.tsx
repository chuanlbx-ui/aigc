import { useNavigate } from 'react-router-dom';
import './CardListSection.css';

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  coverImage?: string;
  category?: { name: string; color?: string };
  readTime?: number;
  publishedAt: string;
}

interface CardListSectionProps {
  items: ContentItem[];
  config?: {
    columns?: 1 | 2 | 3;
    cardStyle?: 'default' | 'compact' | 'large' | 'horizontal';
    showCover?: boolean;
    showSummary?: boolean;
    showMeta?: boolean;
  };
}

export default function CardListSection({ items, config = {} }: CardListSectionProps) {
  const navigate = useNavigate();
  const {
    columns = 2,
    cardStyle = 'default',
    showCover = true,
    showSummary = true,
    showMeta = true,
  } = config;

  if (items.length === 0) return null;

  const handleClick = (slug: string) => {
    navigate(`/read/${slug}`);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <div className={`card-list-section columns-${columns} style-${cardStyle}`}>
      {items.map((item) => (
        <div key={item.id} className="card-item" onClick={() => handleClick(item.slug)}>
          {showCover && (
            <div className="card-cover">
              {item.coverImage ? (
                <img src={item.coverImage} alt={item.title} />
              ) : (
                <div className="cover-placeholder" />
              )}
            </div>
          )}
          <div className="card-content">
            <h4 className="card-title">{item.title}</h4>
            {showSummary && item.summary && (
              <p className="card-summary">{item.summary}</p>
            )}
            {showMeta && (
              <div className="card-meta">
                {item.category && (
                  <span className="category-tag" style={{ color: item.category.color }}>
                    {item.category.name}
                  </span>
                )}
                <span className="date">{formatDate(item.publishedAt)}</span>
                {item.readTime && <span className="read-time">{item.readTime}分钟</span>}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
