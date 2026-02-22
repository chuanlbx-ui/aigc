import { useNavigate } from 'react-router-dom';
import './PageLinksSection.css';

interface PageInfo {
  id: string;
  title: string;
  slug: string;
  description?: string;
  coverImage?: string;
}

interface PageLinksSectionProps {
  config: {
    pageIds?: string[];
    style?: 'card' | 'list';
  };
  pages?: PageInfo[];
}

export default function PageLinksSection({ config, pages = [] }: PageLinksSectionProps) {
  const navigate = useNavigate();
  const { pageIds = [], style = 'card' } = config;

  const linkedPages = pageIds
    .map(id => pages.find(p => p.id === id))
    .filter(Boolean) as PageInfo[];

  if (linkedPages.length === 0) {
    return <div className="page-links-empty">请选择要链接的页面</div>;
  }

  const handleClick = (slug: string) => {
    navigate(`/p/${slug}`);
  };

  if (style === 'list') {
    return (
      <div className="page-links-list">
        {linkedPages.map(page => (
          <div key={page.id} className="page-link-item" onClick={() => handleClick(page.slug)}>
            <span className="page-link-title">{page.title}</span>
            <span className="page-link-arrow">›</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="page-links-cards">
      {linkedPages.map(page => (
        <div key={page.id} className="page-link-card" onClick={() => handleClick(page.slug)}>
          {page.coverImage && (
            <div className="page-link-cover">
              <img src={page.coverImage} alt={page.title} />
            </div>
          )}
          <div className="page-link-info">
            <h4>{page.title}</h4>
            {page.description && <p>{page.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
