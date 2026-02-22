import { useNavigate } from 'react-router-dom';
import './TitleListSection.css';

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  category?: { name: string; color?: string };
  publishedAt: string;
}

interface TitleListSectionProps {
  items: ContentItem[];
  config?: {
    showIndex?: boolean;
    showDate?: boolean;
    showCategory?: boolean;
  };
}

export default function TitleListSection({ items, config = {} }: TitleListSectionProps) {
  const navigate = useNavigate();
  const { showIndex = true, showDate = true, showCategory = true } = config;

  if (items.length === 0) return null;

  const handleClick = (slug: string) => {
    navigate(`/read/${slug}`);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <div className="title-list-section">
      {items.map((item, index) => (
        <div key={item.id} className="title-item" onClick={() => handleClick(item.slug)}>
          {showIndex && <span className="item-index">{index + 1}</span>}
          <div className="item-content">
            <span className="item-title">{item.title}</span>
            <div className="item-meta">
              {showCategory && item.category && (
                <span className="category-tag" style={{ color: item.category.color }}>
                  {item.category.name}
                </span>
              )}
              {showDate && <span className="date">{formatDate(item.publishedAt)}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
