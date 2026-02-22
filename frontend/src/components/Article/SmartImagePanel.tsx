import { useState } from 'react';
import {
  Card, Button, Space, List, Image, Tag, Progress,
  Tooltip, message, Empty, Spin, Alert, Modal
} from 'antd';
import {
  PictureOutlined, ReloadOutlined, SwapOutlined,
  CheckOutlined, CrownOutlined, SafetyCertificateOutlined, StarOutlined, StarFilled
} from '@ant-design/icons';
import { api } from '../../api/client';
import AIModelSelector from '../common/AIModelSelector';
import ImageServiceSelector from '../common/ImageServiceSelector';

// 图片来源版权信息
const SOURCE_LICENSE: Record<string, { label: string; color: string; tip: string; safe: boolean }> = {
  unsplash: {
    label: 'Unsplash',
    color: 'green',
    tip: '免费商用，需署名（推荐）',
    safe: true,
  },
  pexels: {
    label: 'Pexels',
    color: 'green',
    tip: '免费商用，无需署名',
    safe: true,
  },
  pixabay: {
    label: 'Pixabay',
    color: 'green',
    tip: '免费商用，无需署名',
    safe: true,
  },
  'ai-generated': {
    label: 'AI生成',
    color: 'purple',
    tip: 'AI 生成图片，可商用',
    safe: true,
  },
  placeholder: {
    label: '占位图',
    color: 'orange',
    tip: '仅供预览，请替换后再发布',
    safe: false,
  },
};

// 配图位置信息
interface ImagePosition {
  id: string;
  lineNumber: number;
  afterText: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  suggestedKeywords: string[];
}

// 生成的图片信息
interface GeneratedImage {
  positionId: string;
  url: string;
  source: string;
  keywords: string[];
  alt: string;
  width: number;
  height: number;
}

interface SmartImagePanelProps {
  articleId: string;
  content: string;
  platform: string;
  column: string;
  coverImage?: string;
  onContentChange: (content: string) => void;
  onCoverChange: (coverUrl: string) => void;
  onSaveWithNote?: (content: string, changeNote: string) => Promise<void>;
}

export default function SmartImagePanel({
  articleId,
  content,
  platform,
  column,
  coverImage,
  onContentChange,
  onCoverChange,
  onSaveWithNote,
}: SmartImagePanelProps) {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [positions, setPositions] = useState<ImagePosition[]>([]);
  const [images, setImages] = useState<Map<string, GeneratedImage>>(new Map());
  const [progress, setProgress] = useState(0);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>();
  const [selectedImageServices, setSelectedImageServices] = useState<string[]>([]);

  // 分析配图位置
  const handleAnalyze = async () => {
    if (!content.trim()) {
      message.warning('请先编写文章内容');
      return;
    }

    setAnalyzing(true);
    try {
      const res = await api.post('/articles/ai/analyze-image-positions', {
        content,
        platform,
        column,
        maxImages: 5,
        serviceId: selectedServiceId,
      });
      setPositions(res.data.positions);
      setImages(new Map());
      message.success(`找到 ${res.data.positions.length} 个推荐配图位置`);
    } catch (error: any) {
      message.error(error.response?.data?.error || '分析失败');
    } finally {
      setAnalyzing(false);
    }
  };

  // 一键智能配图
  const handleSmartImage = async () => {
    if (positions.length === 0) {
      message.warning('请先分析配图位置');
      return;
    }

    setLoading(true);
    setProgress(10);

    try {
      const res = await api.post('/articles/ai/smart-image', {
        articleId,
        content,
        platform,
        column,
        positions,
        serviceId: selectedServiceId,
        imageServiceIds: selectedImageServices,
      });

      setProgress(80);

      const newImages = new Map<string, GeneratedImage>();
      res.data.images.forEach((img: GeneratedImage) => {
        newImages.set(img.positionId, img);
      });
      setImages(newImages);
      setProgress(100);
      message.success(`成功获取 ${res.data.images.length} 张配图`);
    } catch (error: any) {
      message.error(error.response?.data?.error || '配图失败');
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  // 插入所有图片到文章
  const handleInsertAll = async () => {
    if (images.size === 0) {
      message.warning('请先获取配图');
      return;
    }

    // 检查是否有占位图
    const hasPlaceholder = Array.from(images.values()).some(img => img.source === 'placeholder');

    // 显示版权确认弹窗
    Modal.confirm({
      title: '插入配图确认',
      icon: <SafetyCertificateOutlined style={{ color: hasPlaceholder ? '#faad14' : '#52c41a' }} />,
      content: (
        <div>
          {hasPlaceholder && (
            <Alert
              type="warning"
              message="存在占位图"
              description="部分图片为占位图，建议替换后再发布文章"
              style={{ marginBottom: 12 }}
              showIcon
            />
          )}
          <div style={{ marginBottom: 8 }}>即将插入 {images.size} 张配图：</div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#666' }}>
            {Array.from(images.values()).map(img => {
              const license = SOURCE_LICENSE[img.source] || { label: img.source, color: 'default', tip: '未知来源' };
              return (
                <li key={img.positionId}>
                  <Tag color={license.color} style={{ fontSize: 11 }}>{license.label}</Tag>
                  <span>{license.tip}</span>
                </li>
              );
            })}
          </ul>
          <div style={{ marginTop: 12, fontSize: 12, color: '#999' }}>
            Pexels/Pixabay 图片均为免费商用授权，可安全用于文章发布。
          </div>
        </div>
      ),
      okText: '确认插入',
      cancelText: '取消',
      onOk: async () => {
        try {
          // 将已获取的图片数据传递给后端，避免重新搜索
          const existingImages = Array.from(images.values());
          const res = await api.post('/articles/ai/smart-image', {
            articleId,
            content,
            platform,
            column,
            positions,
            autoInsert: true,
            existingImages, // 传递已获取的图片
          });
          if (res.data.updatedContent) {
            onContentChange(res.data.updatedContent);

            // 立即保存并创建版本
            if (onSaveWithNote) {
              await onSaveWithNote(res.data.updatedContent, '智能配图插入');
            }

            message.success('配图已插入文章');
          }
        } catch (error: any) {
          message.error('插入失败');
        }
      },
    });
  };

  // 重新获取单张图片
  const handleRefreshImage = async (position: ImagePosition) => {
    setRefreshingId(position.id);
    try {
      const res = await api.post('/articles/ai/fetch-single-image', {
        keywords: position.suggestedKeywords,
        orientation: platform === 'xiaohongshu' ? 'portrait' : 'landscape',
      });

      setImages(prev => {
        const newMap = new Map(prev);
        newMap.set(position.id, {
          positionId: position.id,
          url: res.data.url,
          source: res.data.source,
          keywords: position.suggestedKeywords,
          alt: position.suggestedKeywords.slice(0, 3).join(' - '),
          width: res.data.width,
          height: res.data.height,
        });
        return newMap;
      });
      message.success('图片已更新');
    } catch (error) {
      message.error('获取图片失败');
    } finally {
      setRefreshingId(null);
    }
  };

  // 设为封面
  const handleSetCover = async (imageUrl: string) => {
    try {
      await api.put(`/articles/${articleId}`, {
        coverImage: imageUrl,
      });
      onCoverChange(imageUrl);
      message.success('已设为文章封面');
    } catch (error) {
      message.error('设置封面失败');
    }
  };

  // 收藏到素材库
  const handleSaveToAssets = async (img: GeneratedImage) => {
    try {
      await api.post('/articles/ai/save-to-assets', {
        imageUrl: img.url,
        name: img.alt,
        source: img.source,
        keywords: img.keywords,
      });
      setSavedIds(prev => new Set(prev).add(img.positionId));
      message.success('已收藏到素材库');
    } catch (error: any) {
      message.error(error.response?.data?.error || '收藏失败');
    }
  };

  const priorityColors = {
    high: 'red',
    medium: 'orange',
    low: 'blue',
  };

  const priorityLabels = {
    high: '推荐',
    medium: '建议',
    low: '可选',
  };

  return (
    <Card
      title={<span><PictureOutlined /> 智能配图</span>}
      size="small"
      extra={
        <Space wrap size="small">
          <Tooltip title="选择 AI 模型用于分析配图位置">
            <AIModelSelector
              value={selectedServiceId}
              onChange={setSelectedServiceId}
              size="small"
            />
          </Tooltip>
          <ImageServiceSelector
            value={selectedImageServices}
            onChange={setSelectedImageServices}
            size="small"
          />
          <Button
            size="small"
            onClick={handleAnalyze}
            loading={analyzing}
            icon={<ReloadOutlined />}
          >
            分析位置
          </Button>
          <Button
            type="primary"
            size="small"
            onClick={handleSmartImage}
            loading={loading}
            disabled={positions.length === 0}
          >
            一键配图
          </Button>
        </Space>
      }
    >
      {loading && progress > 0 && (
        <Progress
          percent={progress}
          size="small"
          style={{ marginBottom: 12 }}
        />
      )}

      {analyzing ? (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Spin tip="正在分析文章内容..." />
        </div>
      ) : positions.length === 0 ? (
        <Empty
          description="点击「分析位置」开始"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <List
          size="small"
          dataSource={positions}
          renderItem={pos => {
            const img = images.get(pos.id);
            const isCover = img && coverImage === img.url;

            return (
              <List.Item style={{ display: 'block' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {/* 位置信息 */}
                  <Space>
                    <Tag color={priorityColors[pos.priority]}>
                      {priorityLabels[pos.priority]}
                    </Tag>
                    <span style={{ fontSize: 12, color: '#666' }}>
                      第 {pos.lineNumber} 行
                    </span>
                  </Space>

                  {/* 原因说明 */}
                  <div style={{ fontSize: 12, color: '#999' }}>
                    {pos.reason}
                  </div>

                  {/* 关键词标签 */}
                  <Space wrap size={4}>
                    {pos.suggestedKeywords.map(kw => (
                      <Tag key={kw} style={{ fontSize: 11 }}>{kw}</Tag>
                    ))}
                  </Space>

                  {/* 图片预览和操作 */}
                  {img && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                      <Image
                        src={img.url}
                        width={100}
                        height={70}
                        style={{ objectFit: 'cover', borderRadius: 4 }}
                      />
                      <Space direction="vertical" size={4}>
                        <Tooltip title={SOURCE_LICENSE[img.source]?.tip || '未知来源'}>
                          <Tag color={SOURCE_LICENSE[img.source]?.color || 'default'}>
                            {SOURCE_LICENSE[img.source]?.label || img.source}
                          </Tag>
                        </Tooltip>
                        <Space size={4}>
                          <Tooltip title="换一张">
                            <Button
                              size="small"
                              icon={<SwapOutlined />}
                              loading={refreshingId === pos.id}
                              onClick={() => handleRefreshImage(pos)}
                            />
                          </Tooltip>
                          <Tooltip title={isCover ? '当前封面' : '设为封面'}>
                            <Button
                              size="small"
                              type={isCover ? 'primary' : 'default'}
                              icon={<CrownOutlined />}
                              onClick={() => handleSetCover(img.url)}
                              disabled={isCover}
                            />
                          </Tooltip>
                          <Tooltip title={savedIds.has(pos.id) ? '已收藏' : '收藏到素材库'}>
                            <Button
                              size="small"
                              type={savedIds.has(pos.id) ? 'primary' : 'default'}
                              icon={savedIds.has(pos.id) ? <StarFilled /> : <StarOutlined />}
                              onClick={() => handleSaveToAssets(img)}
                              disabled={savedIds.has(pos.id) || img.source === 'placeholder'}
                            />
                          </Tooltip>
                        </Space>
                        {isCover && (
                          <Tag color="gold">当前封面</Tag>
                        )}
                      </Space>
                    </div>
                  )}
                </Space>
              </List.Item>
            );
          }}
        />
      )}

      {/* 插入按钮 */}
      {images.size > 0 && (
        <Button
          type="primary"
          block
          icon={<CheckOutlined />}
          onClick={handleInsertAll}
          style={{ marginTop: 12 }}
        >
          插入所有配图到文章
        </Button>
      )}
    </Card>
  );
}
