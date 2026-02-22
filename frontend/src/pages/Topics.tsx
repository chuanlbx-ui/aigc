import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Spin, Tag, Space, Carousel, Input, Empty, Button
} from 'antd';
import {
  CalendarOutlined, ClockCircleOutlined, EyeOutlined,
  HomeOutlined
} from '@ant-design/icons';
import { api } from '../api/client';
import { PLATFORM_NAMES } from '../stores/article';

const { Title, Text, Paragraph } = Typography;

interface ArticleItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  coverImage: string | null;
  platform: string;
  column: string;
  tags: string;
  wordCount: number;
  readTime: number;
  viewCount: number;
  publishedAt: string;
  category?: { id: string; name: string; color: string };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  _count: { articles: number };
}

// 默认封面图
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80';

export default function Topics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [featuredArticles, setFeaturedArticles] = useState<ArticleItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);

  const pageSize = 12;

  // 初始加载
  useEffect(() => {
    loadInitialData();
  }, []);

  // 分类或搜索变化时重新加载文章
  useEffect(() => {
    loadArticles(1);
  }, [selectedCategory]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [featuredRes, categoriesRes, articlesRes] = await Promise.all([
        api.get('/articles/public/featured', { params: { limit: 5 } }),
        api.get('/articles/public/categories'),
        api.get('/articles/public/list', { params: { page: 1, pageSize } }),
      ]);
      setFeaturedArticles(featuredRes.data.articles || []);
      setCategories(categoriesRes.data.categories || []);
      setArticles(articlesRes.data.articles || []);
      setTotal(articlesRes.data.total || 0);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadArticles = async (pageNum: number) => {
    try {
      const params: any = { page: pageNum, pageSize };
      if (selectedCategory) params.categoryId = selectedCategory;
      if (searchText) params.search = searchText;

      const res = await api.get('/articles/public/list', { params });
      setArticles(res.data.articles || []);
      setTotal(res.data.total || 0);
      setPage(pageNum);
    } catch (error) {
      console.error('加载文章失败:', error);
    }
  };

  const handleSearch = async () => {
    setSearching(true);
    await loadArticles(1);
    setSearching(false);
  };

  const handleCategoryChange = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setSearchText('');
    setPage(1);
  };

  const goToArticle = (slug: string) => {
    navigate(`/read/${slug}`);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* 顶部导航栏 */}
      <header style={{
        background: '#fff',
        padding: '16px 24px',
        borderBottom: '1px solid #eee',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <HomeOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <Title level={4} style={{ margin: 0 }}>文章专题</Title>
          </div>
          <Input.Search
            placeholder="搜索文章..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={handleSearch}
            loading={searching}
            style={{ width: 240 }}
            allowClear
          />
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        {/* 轮播推荐区 */}
        {featuredArticles.length > 0 && (
          <FeaturedCarousel articles={featuredArticles} onArticleClick={goToArticle} />
        )}

        {/* 分类标签导航 */}
        <CategoryTabs
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
        />

        {/* 文章列表 */}
        {articles.length === 0 ? (
          <Empty description="暂无文章" style={{ marginTop: 48 }} />
        ) : (
          <ArticleGrid
            articles={articles}
            onArticleClick={goToArticle}
            formatDate={formatDate}
          />
        )}

        {/* 加载更多 */}
        {articles.length < total && (
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Button
              type="primary"
              size="large"
              onClick={() => loadArticles(page + 1)}
            >
              加载更多
            </Button>
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              已显示 {articles.length} / {total} 篇
            </Text>
          </div>
        )}
      </div>

      {/* 页脚 */}
      <footer style={{ background: '#fff', padding: '24px', textAlign: 'center', marginTop: 48 }}>
        <Text type="secondary">© 2024 文章专题 · 内容创作平台</Text>
      </footer>
    </div>
  );
}

// 轮播推荐区组件
function FeaturedCarousel({
  articles,
  onArticleClick,
}: {
  articles: ArticleItem[];
  onArticleClick: (slug: string) => void;
}) {
  return (
    <div style={{ marginBottom: 32 }}>
      <Carousel autoplay dotPosition="bottom" effect="fade">
        {articles.map((article) => (
          <div key={article.id}>
            <div
              onClick={() => onArticleClick(article.slug)}
              style={{
                position: 'relative',
                height: 360,
                borderRadius: 12,
                overflow: 'hidden',
                cursor: 'pointer',
              }}
            >
              <img
                src={article.coverImage || DEFAULT_COVER}
                alt={article.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '48px 24px 24px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                color: '#fff',
              }}>
                <Title level={3} style={{ color: '#fff', margin: 0 }}>
                  {article.title}
                </Title>
                <Paragraph
                  ellipsis={{ rows: 2 }}
                  style={{ color: 'rgba(255,255,255,0.85)', margin: '8px 0 0' }}
                >
                  {article.summary || '点击阅读全文...'}
                </Paragraph>
              </div>
            </div>
          </div>
        ))}
      </Carousel>
    </div>
  );
}

// 分类标签导航组件
function CategoryTabs({
  categories,
  selectedCategory,
  onCategoryChange,
}: {
  categories: Category[];
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
}) {
  return (
    <div style={{
      background: '#fff',
      padding: '12px 16px',
      borderRadius: 8,
      marginBottom: 24,
      overflowX: 'auto',
      whiteSpace: 'nowrap',
    }}>
      <Space size={8}>
        <Tag
          color={selectedCategory === null ? '#1890ff' : undefined}
          onClick={() => onCategoryChange(null)}
          style={{ cursor: 'pointer', padding: '4px 12px', fontSize: 14 }}
        >
          全部
        </Tag>
        {categories.map((cat) => (
          <Tag
            key={cat.id}
            color={selectedCategory === cat.id ? (cat.color || '#1890ff') : undefined}
            onClick={() => onCategoryChange(cat.id)}
            style={{ cursor: 'pointer', padding: '4px 12px', fontSize: 14 }}
          >
            {cat.name} ({cat._count.articles})
          </Tag>
        ))}
      </Space>
    </div>
  );
}

// 文章网格组件
function ArticleGrid({
  articles,
  onArticleClick,
  formatDate,
}: {
  articles: ArticleItem[];
  onArticleClick: (slug: string) => void;
  formatDate: (date: string) => string;
}) {
  if (articles.length === 0) return null;

  const firstArticle = articles[0];
  const restArticles = articles.slice(1);

  return (
    <div>
      {/* 第一篇大卡片 */}
      <LargeArticleCard
        article={firstArticle}
        onClick={() => onArticleClick(firstArticle.slug)}
        formatDate={formatDate}
      />

      {/* 其余小卡片网格 */}
      {restArticles.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
          marginTop: 16,
        }}>
          {restArticles.map((article) => (
            <SmallArticleCard
              key={article.id}
              article={article}
              onClick={() => onArticleClick(article.slug)}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 大卡片组件
function LargeArticleCard({
  article,
  onClick,
  formatDate,
}: {
  article: ArticleItem;
  onClick: () => void;
  formatDate: (date: string) => string;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        background: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow 0.3s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
      onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ width: '45%', minHeight: 240 }}>
        <img
          src={article.coverImage || DEFAULT_COVER}
          alt={article.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column' }}>
        <Space size={8} style={{ marginBottom: 12 }}>
          <Tag color="blue">{PLATFORM_NAMES[article.platform] || article.platform}</Tag>
          <Tag>{article.column}</Tag>
          {article.category && <Tag color={article.category.color}>{article.category.name}</Tag>}
        </Space>
        <Title level={4} style={{ margin: 0, flex: 1 }}>{article.title}</Title>
        <Paragraph ellipsis={{ rows: 2 }} style={{ color: '#666', margin: '12px 0' }}>
          {article.summary || '点击阅读全文...'}
        </Paragraph>
        <Space split={<span style={{ color: '#ddd' }}>·</span>} style={{ color: '#999', fontSize: 13 }}>
          <span><CalendarOutlined /> {formatDate(article.publishedAt)}</span>
          <span><ClockCircleOutlined /> {article.readTime} 分钟</span>
          <span><EyeOutlined /> {article.viewCount}</span>
        </Space>
      </div>
    </div>
  );
}

// 小卡片组件
function SmallArticleCard({
  article,
  onClick,
  formatDate,
}: {
  article: ArticleItem;
  onClick: () => void;
  formatDate: (date: string) => string;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow 0.3s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
      onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ height: 160 }}>
        <img
          src={article.coverImage || DEFAULT_COVER}
          alt={article.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      <div style={{ padding: 16 }}>
        <Space size={4} style={{ marginBottom: 8 }}>
          {article.category && (
            <Tag color={article.category.color} style={{ fontSize: 12 }}>
              {article.category.name}
            </Tag>
          )}
        </Space>
        <Title level={5} ellipsis={{ rows: 2 }} style={{ margin: 0, minHeight: 44 }}>
          {article.title}
        </Title>
        <Space style={{ color: '#999', fontSize: 12, marginTop: 12 }}>
          <span><CalendarOutlined /> {formatDate(article.publishedAt)}</span>
          <span><ClockCircleOutlined /> {article.readTime}分钟</span>
        </Space>
      </div>
    </div>
  );
}
