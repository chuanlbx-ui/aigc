import BannerSection from './BannerSection';
import CardListSection from './CardListSection';
import TitleListSection from './TitleListSection';
import VideoListSection from './VideoListSection';
import WaterfallSection from './WaterfallSection';
import NavBarSection from './NavBarSection';
import CustomHtmlSection from './CustomHtmlSection';
import PageLinksSection from './PageLinksSection';
import DividerSection from './DividerSection';
import './SectionRenderer.css';

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  coverImage?: string;
  category?: { name: string; color?: string };
  readTime?: number;
  duration?: number;
  publishedAt: string;
}

interface Section {
  id: string;
  type: string;
  title?: string;
  showTitle: boolean;
  layoutConfig: string | object;
  contents?: ContentItem[];
  items?: ContentItem[];
}

interface PageInfo {
  id: string;
  title: string;
  slug: string;
  description?: string;
  coverImage?: string;
}

interface SectionRendererProps {
  section: Section;
  pages?: PageInfo[];
}

export default function SectionRenderer({ section, pages = [] }: SectionRendererProps) {
  // 兼容 layoutConfig 是字符串或对象
  const config = typeof section.layoutConfig === 'string'
    ? JSON.parse(section.layoutConfig || '{}')
    : (section.layoutConfig || {});

  // 兼容 contents 或 items
  const items = section.contents || section.items || [];

  const renderContent = () => {
    switch (section.type) {
      case 'banner':
        return <BannerSection items={items} config={config} />;
      case 'card_list':
        return <CardListSection items={items} config={config} />;
      case 'title_list':
        return <TitleListSection items={items} config={config} />;
      case 'video_list':
        return <VideoListSection items={items} config={config} />;
      case 'waterfall':
        return <WaterfallSection items={items} config={config} />;
      case 'nav_bar':
        return <NavBarSection config={config} pages={pages} />;
      case 'custom_html':
        return <CustomHtmlSection config={config} />;
      case 'page_links':
        return <PageLinksSection config={config} pages={pages} />;
      case 'divider':
        return <DividerSection config={config} />;
      default:
        return null;
    }
  };

  return (
    <div className="section-wrapper">
      {section.showTitle && section.title && (
        <h3 className="section-title">{section.title}</h3>
      )}
      {renderContent()}
    </div>
  );
}
