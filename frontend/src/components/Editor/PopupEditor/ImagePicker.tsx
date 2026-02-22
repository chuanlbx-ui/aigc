import { useState, useEffect } from 'react';
import {
  Modal,
  Tabs,
  Input,
  Spin,
  Empty,
  message,
  Select,
  Tag,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { EMOJI_CATEGORIES } from './emojiData';
import { searchImages, type ImageInfo } from './templateApi';

interface ImagePickerProps {
  open: boolean;
  keyword?: string;
  onSelect: (image: SelectedImage) => void;
  onCancel: () => void;
}

export interface SelectedImage {
  type: 'pexels' | 'unsplash' | 'pixabay' | 'emoji';
  url?: string;
  thumbUrl?: string;
  emoji?: string;
  id?: string;
}

export default function ImagePicker({
  open,
  keyword = '',
  onSelect,
  onCancel,
}: ImagePickerProps) {
  const [activeTab, setActiveTab] = useState<string>('images');
  const [searchQuery, setSearchQuery] = useState(keyword);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [imageSource, setImageSource] = useState<'all' | 'pexels' | 'unsplash' | 'pixabay'>('all');

  // 当关键词变化时更新搜索词
  useEffect(() => {
    if (open && keyword) {
      setSearchQuery(keyword);
      handleSearch(keyword);
    }
  }, [open, keyword]);

  // 搜索图片（支持多图片源）
  const handleSearch = async (query: string, source?: typeof imageSource) => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const result = await searchImages(query, 18, source || imageSource);
      setImages(result.images);
    } catch {
      message.error('搜索图片失败');
    } finally {
      setLoading(false);
    }
  };

  // 选择图片
  const handleSelectImage = (image: ImageInfo) => {
    onSelect({
      type: image.source,
      url: image.url,
      thumbUrl: image.thumbUrl,
      id: image.id,
    });
  };

  // 选择表情
  const handleSelectEmoji = (emoji: string) => {
    onSelect({
      type: 'emoji',
      emoji,
    });
  };

  return (
    <Modal
      title="选择图片"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={650}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'images',
            label: '图片搜索',
            children: (
              <ImageSearchTab
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                loading={loading}
                images={images}
                imageSource={imageSource}
                setImageSource={setImageSource}
                onSearch={handleSearch}
                onSelect={handleSelectImage}
              />
            ),
          },
          {
            key: 'emoji',
            label: '表情图标',
            children: (
              <EmojiTab onSelect={handleSelectEmoji} />
            ),
          },
        ]}
      />
    </Modal>
  );
}

// 图片来源颜色映射
const sourceColors: Record<string, string> = {
  pexels: '#05a081',
  unsplash: '#000000',
  pixabay: '#00ab6c',
};

// 图片搜索标签页
function ImageSearchTab({
  searchQuery,
  setSearchQuery,
  loading,
  images,
  imageSource,
  setImageSource,
  onSearch,
  onSelect,
}: {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  loading: boolean;
  images: ImageInfo[];
  imageSource: 'all' | 'pexels' | 'unsplash' | 'pixabay';
  setImageSource: (s: 'all' | 'pexels' | 'unsplash' | 'pixabay') => void;
  onSearch: (q: string, source?: 'all' | 'pexels' | 'unsplash' | 'pixabay') => void;
  onSelect: (img: ImageInfo) => void;
}) {
  const handleSourceChange = (value: typeof imageSource) => {
    setImageSource(value);
    if (searchQuery.trim()) {
      onSearch(searchQuery, value);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Input.Search
          placeholder="输入关键词搜索图片"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onSearch={() => onSearch(searchQuery)}
          enterButton={<SearchOutlined />}
          style={{ flex: 1 }}
        />
        <Select
          value={imageSource}
          onChange={handleSourceChange}
          style={{ width: 120 }}
          options={[
            { label: '全部来源', value: 'all' },
            { label: 'Pexels', value: 'pexels' },
            { label: 'Unsplash', value: 'unsplash' },
            { label: 'Pixabay', value: 'pixabay' },
          ]}
        />
      </div>
      <Spin spinning={loading}>
        {images.length === 0 ? (
          <Empty description="输入关键词搜索高质量图片" />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
            maxHeight: 350,
            overflowY: 'auto',
          }}>
            {images.map(img => (
              <div
                key={img.id}
                onClick={() => onSelect(img)}
                style={{
                  cursor: 'pointer',
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: '2px solid transparent',
                  transition: 'border-color 0.2s',
                  position: 'relative',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#1890ff')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
              >
                <img
                  src={img.thumbUrl}
                  alt=""
                  style={{
                    width: '100%',
                    height: 100,
                    objectFit: 'cover',
                  }}
                />
                <Tag
                  color={sourceColors[img.source] || '#666'}
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    right: 4,
                    fontSize: 10,
                    margin: 0,
                    padding: '0 4px',
                  }}
                >
                  {img.source}
                </Tag>
              </div>
            ))}
          </div>
        )}
      </Spin>
    </div>
  );
}

// 表情图标标签页
function EmojiTab({
  onSelect,
}: {
  onSelect: (emoji: string) => void;
}) {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <div>
      {/* 分类标签 */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 12,
        flexWrap: 'wrap',
      }}>
        {EMOJI_CATEGORIES.map((cat, idx) => (
          <div
            key={cat.name}
            onClick={() => setActiveCategory(idx)}
            style={{
              padding: '4px 12px',
              borderRadius: 16,
              cursor: 'pointer',
              background: activeCategory === idx ? '#1890ff' : '#f0f0f0',
              color: activeCategory === idx ? '#fff' : '#333',
              fontSize: 13,
              transition: 'all 0.2s',
            }}
          >
            {cat.name}
          </div>
        ))}
      </div>

      {/* 表情网格 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: 4,
        maxHeight: 280,
        overflowY: 'auto',
      }}>
        {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, idx) => (
          <div
            key={`${emoji}-${idx}`}
            onClick={() => onSelect(emoji)}
            style={{
              fontSize: 28,
              padding: 8,
              textAlign: 'center',
              cursor: 'pointer',
              borderRadius: 8,
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f0f0f0')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {emoji}
          </div>
        ))}
      </div>
    </div>
  );
}
