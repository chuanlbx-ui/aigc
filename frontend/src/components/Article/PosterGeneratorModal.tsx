import { useState, useEffect } from 'react';
import {
  Modal, Button, Input, Select, Space, Typography, message, Spin, Image, Row, Col,
} from 'antd';
import {
  DownloadOutlined, LeftOutlined, RightOutlined,
  EditOutlined, BulbOutlined, PictureOutlined,
} from '@ant-design/icons';
import { api } from '../../api/client';

const { TextArea } = Input;
const { Text } = Typography;

// 主题选项
const THEME_OPTIONS = [
  { value: 'light', label: '浅色经典' },
  { value: 'dark', label: '深色经典' },
  { value: 'elegant', label: '典雅金棕' },
  { value: 'tech', label: '科技霓虹' },
  { value: 'nature', label: '自然清新' },
  { value: 'warm', label: '温暖橙黄' },
  { value: 'minimal', label: '极简黑白' },
];

interface PosterGeneratorModalProps {
  open: boolean;
  onClose: () => void;
  articleTitle: string;
  articleContent: string;
  articleSlug: string;
}

export default function PosterGeneratorModal({
  open,
  onClose,
  articleTitle,
  articleContent,
  articleSlug,
}: PosterGeneratorModalProps) {
  // 精句相关
  const [quotes, setQuotes] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editedQuote, setEditedQuote] = useState('');
  const [maxQuotes, setMaxQuotes] = useState(5);

  // 海报配置
  const [theme, setTheme] = useState('light');
  const [brandText, setBrandText] = useState('');

  // 状态
  const [extracting, setExtracting] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [creatingQuote, setCreatingQuote] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [posterData, setPosterData] = useState('');

  // 重置状态
  useEffect(() => {
    if (open) {
      setQuotes([]);
      setCurrentIndex(0);
      setEditedQuote('');
      setPosterData('');
    }
  }, [open]);

  // 生成二维码链接
  const getQrUrl = () => {
    return `${window.location.origin}/read/${articleSlug}`;
  };

  // 提取精句
  const handleExtractQuotes = async () => {
    if (!articleContent.trim()) {
      message.warning('文章内容为空');
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
      setPosterData('');
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
      setPosterData('');
    }
  };

  const handleNextQuote = () => {
    if (currentIndex < quotes.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setEditedQuote(quotes[newIndex]);
      setPosterData('');
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
      setPosterData('');
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
      message.warning('文章内容为空');
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
      setPosterData('');
      message.success('生成了新精句');
    } catch (error: any) {
      message.error(error.response?.data?.error || '生成失败');
    } finally {
      setCreatingQuote(false);
    }
  };

  // 生成海报
  const handleGeneratePoster = async () => {
    if (!editedQuote.trim()) {
      message.warning('请先输入或选择精句');
      return;
    }

    setGenerating(true);
    try {
      const res = await api.post('/posters/public/generate', {
        quote: editedQuote,
        theme,
        brandText: brandText || undefined,
        qrUrl: getQrUrl(),
        title: articleTitle,
      });
      setPosterData(res.data.imageData);
      message.success('海报生成成功');
    } catch (error: any) {
      message.error(error.response?.data?.error || '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  // 下载海报
  const handleDownload = () => {
    if (!posterData) return;
    const link = document.createElement('a');
    link.href = posterData;
    link.download = `${articleTitle}-海报.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal
      title="生成文章海报"
      open={open}
      onCancel={onClose}
      width={900}
      footer={null}
      destroyOnClose
    >
      <Row gutter={24}>
        {/* 左侧：金句编辑区 */}
        <Col span={12}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {/* 提取精句 */}
            <Space>
              <Button
                type="primary"
                icon={<BulbOutlined />}
                onClick={handleExtractQuotes}
                loading={extracting}
              >
                AI提取金句
              </Button>
              <Select
                value={maxQuotes}
                onChange={setMaxQuotes}
                style={{ width: 80 }}
                options={[
                  { value: 3, label: '3条' },
                  { value: 5, label: '5条' },
                  { value: 8, label: '8条' },
                  { value: 10, label: '10条' },
                ]}
              />
            </Space>

            {/* 精句切换 */}
            {quotes.length > 0 && (
              <Space>
                <Button
                  icon={<LeftOutlined />}
                  onClick={handlePrevQuote}
                  disabled={currentIndex === 0}
                />
                <Text>{currentIndex + 1} / {quotes.length}</Text>
                <Button
                  icon={<RightOutlined />}
                  onClick={handleNextQuote}
                  disabled={currentIndex === quotes.length - 1}
                />
              </Space>
            )}

            {/* 精句编辑 */}
            <TextArea
              value={editedQuote}
              onChange={(e) => {
                setEditedQuote(e.target.value);
                setPosterData('');
              }}
              placeholder="输入或选择金句内容（建议15-50字）"
              rows={4}
              maxLength={60}
              showCount
            />

            {/* AI 操作按钮 */}
            <Space>
              <Button
                icon={<EditOutlined />}
                onClick={handlePolishQuote}
                loading={polishing}
                disabled={!editedQuote.trim()}
              >
                AI润色
              </Button>
              <Button
                icon={<BulbOutlined />}
                onClick={handleGenerateQuote}
                loading={creatingQuote}
              >
                AI原创
              </Button>
            </Space>

            {/* 海报配置 */}
            <div>
              <Text type="secondary">海报主题</Text>
              <Select
                value={theme}
                onChange={(v) => {
                  setTheme(v);
                  setPosterData('');
                }}
                style={{ width: '100%', marginTop: 4 }}
                options={THEME_OPTIONS}
              />
            </div>

            <div>
              <Text type="secondary">品牌署名（可选）</Text>
              <Input
                value={brandText}
                onChange={(e) => {
                  setBrandText(e.target.value);
                  setPosterData('');
                }}
                placeholder="如：内容创作平台"
                style={{ marginTop: 4 }}
              />
            </div>

            {/* 生成按钮 */}
            <Space>
              <Button
                type="primary"
                icon={<PictureOutlined />}
                onClick={handleGeneratePoster}
                loading={generating}
                disabled={!editedQuote.trim()}
              >
                生成海报
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownload}
                disabled={!posterData}
              >
                下载海报
              </Button>
            </Space>
          </Space>
        </Col>

        {/* 右侧：海报预览区 */}
        <Col span={12}>
          <div style={{
            background: '#f5f5f5',
            borderRadius: 8,
            padding: 16,
            minHeight: 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {generating ? (
              <Spin tip="生成中..." />
            ) : posterData ? (
              <Image
                src={posterData}
                alt="海报预览"
                style={{ maxWidth: '100%', maxHeight: 500 }}
              />
            ) : (
              <Text type="secondary">
                选择金句并点击"生成海报"预览效果
              </Text>
            )}
          </div>
        </Col>
      </Row>
    </Modal>
  );
}
