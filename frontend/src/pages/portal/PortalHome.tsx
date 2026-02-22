import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPages, TopicPage } from '../../api/portal';
import './PortalHome.css';

export default function PortalHome() {
  const navigate = useNavigate();
  const [pages, setPages] = useState<TopicPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      const data = await getPages();
      setPages(data);
    } catch (error) {
      console.error('加载页面失败:', error);
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

  return (
    <div className="portal-home">
      <header className="portal-header">
        <h1>内容中心</h1>
      </header>
      <main className="portal-main">
        {pages.length === 0 ? (
          <div className="empty-state">
            <p>暂无内容</p>
          </div>
        ) : (
          <div className="page-list">
            {pages.map((page) => (
              <div
                key={page.id}
                className="page-card"
                onClick={() => navigate(`/p/${page.slug}`)}
              >
                {page.coverImage ? (
                  <img src={page.coverImage} alt={page.title} className="page-cover" />
                ) : (
                  <div className="page-cover-placeholder" />
                )}
                <div className="page-info">
                  <h3>{page.title}</h3>
                  {page.description && <p>{page.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
