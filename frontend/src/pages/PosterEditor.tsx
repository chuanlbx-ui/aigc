import { useState, useEffect } from 'react';
import {
  Card, Row, Col, Button, Input, Select, Space, Typography, message, Spin, Image,
  Grid,
} from 'antd';
import {
  ArrowLeftOutlined, DownloadOutlined, LeftOutlined, RightOutlined,
  EditOutlined, PlusOutlined, PictureOutlined, ReloadOutlined, BulbOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { usePosterStore, THEME_OPTIONS } from '../stores/poster';

const { TextArea } = Input;
const { Text } = Typography;
const { useBreakpoint } = Grid;

interface Article {
  id: string;
  title: string;
  slug: string;
}

export default function PosterEditor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { currentPoster, fetchPoster, createPoster, updatePoster, clearCurrentPoster } = usePosterStore();
  const isEditMode = !!id;
  const screens = useBreakpoint();
  const isMobile = !screens.md; // md 断点以下为手机端

  // 文章相关
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string | undefined>();
  const [articleContent, setArticleContent] = useState('');
  const [articleTitle, setArticleTitle] = useState('');

  // 精句相关
  const [quotes, setQuotes] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editedQuote, setEditedQuote] = useState('');
  const [maxQuotes, setMaxQuotes] = useState(5);

  // 海报配置
  const [posterName, setPosterName] = useState('');
  const [theme, setTheme] = useState('light');
  const [brandText, setBrandText] = useState('');
  const [customQrUrl, setCustomQrUrl] = useState('');

  // 状态
  const [extracting, setExtracting] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [creatingQuote, setCreatingQuote] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [posterUrl, setPosterUrl] = useState('');

  // 初始化
  useEffect(() => {
    fetchArticles();
    if (isEditMode && id) {
      fetchPoster(id);
    }
    return () => clearCurrentPoster();
  }, [id]);

  const fetchArticles = async () => {
    try {
      const res = await api.get('/articles');
      setArticles(res.data.articles || []);
    } catch (error) {
      console.error('获取文章失败:', error);
    }
  };

  // 编辑模式下加载海报数据
  useEffect(() => {
    if (currentPoster) {
      setPosterName(currentPoster.name);
      setEditedQuote(currentPoster.quote);
      setTheme(currentPoster.theme);
      setBrandText(currentPoster.brandText || '');
      setCustomQrUrl(currentPoster.qrUrl || '');
      setSelectedArticleId(currentPoster.articleId);
      const filename = currentPoster.filePath.split(/[/\\]/).pop() || '';
      setPosterUrl(`/api/posters/image/${filename}`);
    }
  }, [currentPoster]);

  // 选择文章时加载内容
  const handleArticleChange = async (articleId: string | undefined) => {
    setSelectedArticleId(articleId);
    setQuotes([]);
    setCurrentIndex(0);
    setEditedQuote('');
    setPosterUrl('');

    if (articleId) {
      try {
        const [articleRes, contentRes] = await Promise.all([
          api.get(`/articles/${articleId}`),
          api.get(`/articles/${articleId}/content`),
        ]);
        setArticleTitle(articleRes.data.title || '');
        setArticleContent(contentRes.data.content || '');
        if (!posterName) {
          setPosterName(`${articleRes.data.title}-海报`);
        }
      } catch (error) {
        console.error('获取文章内容失败:', error);
      }
    } else {
      setArticleTitle('');
      setArticleContent('');
    }
  };

  // 提取精句
  const handleExtractQuotes = async () => {
    if (!articleContent.trim()) {
      message.warning('请先选择文章');
      return;
    }

    setExtracting(true);
    try {
      const res = await api.post('/posters/ai/extract-quotes', {
        content: articleContent,
        title: articleTitle,
        maxQuotes,
      });
      const extractedQuotes = res.data.quotes || [];
      setQuotes(extractedQuotes);
      setCurrentIndex(0);
      setEditedQuote(extractedQuotes[0] || '');
      setPosterUrl('');
      message.success(`提取了 ${extractedQuotes.length} 条精句`);
    } catch (error: any) {
      message.error(error.response?.data?.error || '提取失败');
    } finally {
      setExtracting(false);
    }
  };

  // 切换精句
  const handlePrevQuote = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setEditedQuote(quotes[newIndex]);
      setPosterUrl('');
    }
  };

  const handleNextQuote = () => {
    if (currentIndex < quotes.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setEditedQuote(quotes[newIndex]);
      setPosterUrl('');
    }
  };

  // AI 润色精句
  const handlePolishQuote = async () => {
    if (!editedQuote.trim()) {
      message.warning('请先输入或选择精句');
      return;
    }

    setPolishing(true);
    try {
      const res = await api.post('/posters/ai/polish-quote', {
        quote: editedQuote,
        title: articleTitle,
        content: articleContent,
      });
      setEditedQuote(res.data.polishedQuote);
      setPosterUrl('');
      message.success('润色完成');
    } catch (error: any) {
      message.error(error.response?.data?.error || '润色失败');
    } finally {
      setPolishing(false);
    }
  };

  // AI 生成原创精句
  const handleGenerateQuote = async () => {
    if (!articleContent.trim()) {
      message.warning('请先选择文章');
      return;
    }

    setCreatingQuote(true);
    try {
      const res = await api.post('/posters/ai/generate-quote', {
        title: articleTitle,
        content: articleContent,
        existingQuotes: quotes,
      });
      const newQuote = res.data.quote;
      setQuotes([...quotes, newQuote]);
      setCurrentIndex(quotes.length);
      setEditedQuote(newQuote);
      setPosterUrl('');
      message.success('生成新精句成功');
    } catch (error: any) {
      message.error(error.response?.data?.error || '生成失败');
    } finally {
      setCreatingQuote(false);
    }
  };

  // 生成海报预览
  const handleGenerate = async () => {
    if (!editedQuote.trim()) {
      message.warning('请先输入精句');
      return;
    }
    if (!posterName.trim()) {
      message.warning('请输入海报名称');
      return;
    }

    setGenerating(true);
    try {
      const res = await api.post('/posters', {
        name: posterName,
        quote: editedQuote.trim(),
        theme,
        brandText: brandText.trim() || undefined,
        qrUrl: customQrUrl.trim() || undefined,
        articleId: selectedArticleId || undefined,
      });
      setPosterUrl(res.data.imageUrl);
      message.success('海报生成成功');
      // 新建模式下跳转到编辑页
      if (!isEditMode) {
        navigate(`/posters/${res.data.id}/edit`, { replace: true });
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (posterUrl) {
      window.open(posterUrl, '_blank');
    }
  };

  return (
    <div style={{ padding: isMobile ? 12 : 24 }}>
      {/* 顶部标题栏 */}
      <div style={{
        marginBottom: 16,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/posters')}
          size={isMobile ? 'middle' : 'middle'}
        >
          {isMobile ? '返回' : '返回列表'}
        </Button>
        <h2 style={{ margin: 0, fontSize: isMobile ? 16 : 20 }}>
          {isEditMode ? '编辑海报' : '新建海报'}
        </h2>
        {!isMobile && <div style={{ width: 100 }} />}
      </div>

      <Row gutter={[16, 16]}>
        {/* 配置区域 */}
        <Col xs={24} md={10}>
          <Card title="海报配置" size="small">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {/* 海报名称 */}
              <div>
                <Text strong>海报名称</Text>
                <Input
                  style={{ marginTop: 8 }}
                  placeholder="输入海报名称"
                  value={posterName}
                  onChange={(e) => setPosterName(e.target.value)}
                />
              </div>

              {/* 关联文章 */}
              <div>
                <Text strong>关联文章（可选）</Text>
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  placeholder="选择文章以提取精句"
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  value={selectedArticleId}
                  onChange={handleArticleChange}
                  options={articles.map(a => ({ label: a.title, value: a.id }))}
                />
              </div>

              {/* 精句提取 */}
              {selectedArticleId && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Text strong>提取精句</Text>
                    <Select
                      size="small"
                      value={maxQuotes}
                      onChange={setMaxQuotes}
                      style={{ width: 70 }}
                      options={[
                        { value: 1, label: '1条' },
                        { value: 3, label: '3条' },
                        { value: 5, label: '5条' },
                        { value: 10, label: '10条' },
                      ]}
                    />
                    <Button
                      size="small"
                      type="primary"
                      icon={<BulbOutlined />}
                      onClick={handleExtractQuotes}
                      loading={extracting}
                    >
                      提取
                    </Button>
                  </div>
                </div>
              )}

              {/* 精句切换和编辑 */}
              {quotes.length > 0 && (
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                    gap: 8,
                  }}>
                    <Button
                      size={isMobile ? 'middle' : 'small'}
                      icon={<LeftOutlined />}
                      onClick={handlePrevQuote}
                      disabled={currentIndex === 0}
                    >
                      {isMobile ? '' : '上一条'}
                    </Button>
                    <Text type="secondary">{currentIndex + 1} / {quotes.length}</Text>
                    <Button
                      size={isMobile ? 'middle' : 'small'}
                      icon={<RightOutlined />}
                      onClick={handleNextQuote}
                      disabled={currentIndex === quotes.length - 1}
                    >
                      {isMobile ? '' : '下一条'}
                    </Button>
                  </div>
                </div>
              )}

              {/* 精句编辑 */}
              <div>
                <Text strong>精句内容</Text>
                <TextArea
                  value={editedQuote}
                  onChange={(e) => { setEditedQuote(e.target.value); setPosterUrl(''); }}
                  placeholder="输入或编辑精句内容..."
                  rows={isMobile ? 4 : 3}
                  maxLength={60}
                  showCount
                  style={{ marginTop: 8, fontSize: isMobile ? 16 : 14 }}
                />
                {selectedArticleId && (
                  <Space style={{ marginTop: 8 }} wrap>
                    <Button
                      size={isMobile ? 'middle' : 'small'}
                      icon={<EditOutlined />}
                      onClick={handlePolishQuote}
                      loading={polishing}
                      disabled={!editedQuote.trim()}
                    >
                      AI润色
                    </Button>
                    <Button
                      size={isMobile ? 'middle' : 'small'}
                      icon={<PlusOutlined />}
                      onClick={handleGenerateQuote}
                      loading={creatingQuote}
                    >
                      AI原创
                    </Button>
                  </Space>
                )}
              </div>

              {/* 海报风格 */}
              <div>
                <Text strong>海报风格</Text>
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  value={theme}
                  onChange={(v) => { setTheme(v); setPosterUrl(''); }}
                  options={THEME_OPTIONS}
                />
              </div>

              {/* 品牌署名 */}
              <div>
                <Text strong>品牌署名（可选）</Text>
                <Input
                  style={{ marginTop: 8 }}
                  value={brandText}
                  onChange={(e) => { setBrandText(e.target.value); setPosterUrl(''); }}
                  placeholder="如：@你的账号名"
                  maxLength={20}
                />
              </div>

              {/* 二维码链接 */}
              <div>
                <Text strong>二维码链接（可选）</Text>
                <Input
                  style={{ marginTop: 8 }}
                  value={customQrUrl}
                  onChange={(e) => { setCustomQrUrl(e.target.value); setPosterUrl(''); }}
                  placeholder="留空则使用文章链接或默认链接"
                />
              </div>

              <Button
                type="primary"
                block
                icon={posterUrl ? <ReloadOutlined /> : <PictureOutlined />}
                onClick={handleGenerate}
                loading={generating}
              >
                {posterUrl ? '重新生成' : '生成海报'}
              </Button>
            </Space>
          </Card>
        </Col>

        {/* 预览区域 */}
        <Col xs={24} md={14}>
          <Card
            title="海报预览"
            size="small"
            extra={posterUrl && (
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownload}
                size={isMobile ? 'small' : 'middle'}
              >
                {isMobile ? '下载' : '下载海报'}
              </Button>
            )}
          >
            <div style={{
              minHeight: isMobile ? 300 : 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f5f5f5',
              borderRadius: 8,
            }}>
              {generating ? (
                <Spin tip="生成中..." />
              ) : posterUrl ? (
                <Image
                  src={posterUrl}
                  alt="海报预览"
                  style={{ maxWidth: '100%', maxHeight: isMobile ? 400 : 600 }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>
                  <PictureOutlined style={{ fontSize: isMobile ? 36 : 48, marginBottom: 16 }} />
                  <div>{isMobile ? '点击上方生成海报' : '配置完成后点击生成海报'}</div>
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
