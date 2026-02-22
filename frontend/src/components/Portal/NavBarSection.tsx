import { useNavigate } from 'react-router-dom';
import './NavBarSection.css';

interface NavItem {
  icon?: string;
  label: string;
  link: string;
}

interface NavBarSectionProps {
  config: {
    style?: 'icon' | 'text' | 'both';
    items?: NavItem[];
    pageIds?: string[];
  };
  pages?: { id: string; title: string; slug: string }[];
}

export default function NavBarSection({ config, pages = [] }: NavBarSectionProps) {
  const navigate = useNavigate();
  const { style = 'both', items = [], pageIds = [] } = config;

  // 如果配置了 pageIds，从 pages 生成导航项
  const navItems: NavItem[] = items.length > 0 ? items : pageIds.map(id => {
    const page = pages.find(p => p.id === id);
    return page ? { label: page.title, link: `/p/${page.slug}` } : null;
  }).filter(Boolean) as NavItem[];

  if (navItems.length === 0) {
    return <div className="nav-bar-empty">请配置导航项</div>;
  }

  const handleClick = (link: string) => {
    if (link.startsWith('http')) {
      window.open(link, '_blank');
    } else {
      navigate(link);
    }
  };

  return (
    <div className={`nav-bar-section style-${style}`}>
      {navItems.map((item, index) => (
        <div key={index} className="nav-item" onClick={() => handleClick(item.link)}>
          {(style === 'icon' || style === 'both') && item.icon && (
            <span className="nav-icon">{item.icon}</span>
          )}
          {(style === 'text' || style === 'both') && (
            <span className="nav-label">{item.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}
