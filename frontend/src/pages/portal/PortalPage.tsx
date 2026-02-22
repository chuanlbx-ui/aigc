import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPageBySlug, TopicPage } from '../../api/portal';
import SectionRenderer from '../../components/Portal/SectionRenderer';
import './PortalPage.css';

export default function PortalPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<TopicPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      loadPage(slug);
    }
  }, [slug]);

  const loadPage = async (pageSlug: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPageBySlug(pageSlug);
      setPage(data);
    } catch (err: any) {
      setError(err.response?.data?.error || '页面加载失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="portal-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="portal-error">
        <p>{error || '页面不存在'}</p>
        <button onClick={() => navigate('/p')}>返回首页</button>
      </div>
    );
  }

  return (
    <div className={`portal-page template-${page.template}`}>
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>{page.title}</h1>
      </header>
      <main className="page-content">
        {page.sections.map((section) => (
          <SectionRenderer key={section.id} section={section} />
        ))}
      </main>
    </div>
  );
}
