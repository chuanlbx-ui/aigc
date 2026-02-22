import { useNavigate } from 'react-router-dom';
import './WaterfallSection.css';

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

interface WaterfallSectionProps {
  items: ContentItem[];
  config: {
    columns?: number;
    gutter?: number;
    showCover?: boolean;
    showSummary?: boolean;
  };
}

export default function WaterfallSection({ items, config }: WaterfallSectionProps) {
  const navigate = useNavigate();
  const { columns = 2, showCover = true, showSummary = true } = config;

  const handleClick = (slug: string) => {
    navigate(`/read/${slug}`);
  };

  if (items.length === 0) {
    return <div className="waterfall-empty">暂无内容</div>;
  }

  return (
    <div className={`waterfall-section columns-${columns}`}>
      {items.map((item) => (
        <div key={item.id} className="waterfall-item" onClick={() => handleClick(item.slug)}>
          {showCover && item.coverImage && (
            <div className="waterfall-cover">
              <img src={item.coverImage} alt={item.title} />
            </div>
          )}
          <div className="waterfall-content">
            <h4 className="waterfall-title">{item.title}</h4>
            {showSummary && item.summary && (
              <p className="waterfall-summary">{item.summary}</p>
            )}
            <div className="waterfall-meta">
              {item.category && (
                <span className="waterfall-category" style={{ color: item.category.color }}>
                  {item.category.name}
                </span>
              )}
              <span className="waterfall-date">
                {new Date(item.publishedAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
