import { useState, useEffect, useMemo } from 'react';
import { Modal, Input, Select, Row, Col, Card, Empty, Spin, Popover, Tag, Space } from 'antd';
import { SearchOutlined, PlayCircleOutlined, FolderOutlined } from '@ant-design/icons';
import { api } from '../../api/client';

interface Category {
  id: string;
  name: string;
  type: string;
  _count?: { assets: number };
}

interface Asset {
  id: string;
  name: string;
  path: string;
  type: string;
  categoryId: string | null;
  category: Category | null;
}

interface AssetSelectorModalProps {
  open: boolean;
  onCancel: () => void;
  onSelect: (asset: Asset) => void;
  filterType?: 'image' | 'video' | 'audio' | 'all';
  title?: string;
}

export default function AssetSelectorModal({
  open,
  onCancel,
  onSelect,
  filterType = 'all',
  title = '选择素材',
}: AssetSelectorModalProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // 加载数据
  useEffect(() => {
    if (open) {
      setLoading(true);
      Promise.all([
        api.get('/assets'),
        api.get('/assets/categories'),
      ])
        .then(([assetsRes, categoriesRes]) => {
          setAssets(assetsRes.data || []);
          setCategories(categoriesRes.data || []);
        })
        .catch(() => {
          setAssets([]);
          setCategories([]);
        })
        .finally(() => setLoading(false));
    }
  }, [open]);

  // 筛选素材
  const filteredAssets = useMemo(() => {
    let result = assets;

    // 按类型筛选
    if (filterType !== 'all') {
      result = result.filter(a => a.type === filterType);
    }

    // 按分类筛选
    if (selectedCategory === 'uncategorized') {
      result = result.filter(a => !a.categoryId);
    } else if (selectedCategory) {
      result = result.filter(a => a.categoryId === selectedCategory);
    }

    // 按关键词搜索
    if (searchText.trim()) {
      const keyword = searchText.toLowerCase();
      result = result.filter(a => a.name.toLowerCase().includes(keyword));
    }

    return result;
  }, [assets, filterType, selectedCategory, searchText]);

  // 渲染预览内容
  const renderPreview = (asset: Asset) => {
    if (asset.type === 'video') {
      return (
        <video
          src={`/api/assets/file/${asset.id}`}
          style={{ maxWidth: 300, maxHeight: 200 }}
          controls
          muted
        />
      );
    }
    if (asset.type === 'image') {
      return (
        <img
          src={`/api/assets/file/${asset.id}`}
          alt={asset.name}
          style={{ maxWidth: 300, maxHeight: 200 }}
        />
      );
    }
    return null;
  };

  // 渲染素材卡片
  const renderAssetCard = (asset: Asset) => (
    <Col span={6} key={asset.id}>
      <Popover
        content={renderPreview(asset)}
        title={asset.name}
        placement="right"
        mouseEnterDelay={0.3}
      >
        <Card
          hoverable
          size="small"
          onClick={() => onSelect(asset)}
          cover={
            asset.type === 'video' ? (
              <div style={{ height: 100, position: 'relative', background: '#000' }}>
                <video
                  src={`/api/assets/file/${asset.id}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  muted
                />
                <PlayCircleOutlined
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: 28,
                    color: '#fff',
                    opacity: 0.8,
                  }}
                />
              </div>
            ) : (
              <div style={{ height: 100, overflow: 'hidden' }}>
                <img
                  src={`/api/assets/file/${asset.id}`}
                  alt={asset.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )
          }
          bodyStyle={{ padding: 8 }}
        >
          <div
            style={{
              fontSize: 12,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={asset.name}
          >
            {asset.name}
          </div>
          {asset.category && (
            <Tag color="blue" style={{ fontSize: 10, marginTop: 4 }}>
              {asset.category.name}
            </Tag>
          )}
        </Card>
      </Popover>
    </Col>
  );

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={800}
      destroyOnClose
    >
      {/* 搜索和筛选栏 */}
      <Space style={{ marginBottom: 16, width: '100%' }} wrap>
        <Input
          placeholder="搜索素材名称..."
          prefix={<SearchOutlined />}
          style={{ width: 200 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
        <Select
          style={{ width: 160 }}
          placeholder="选择分类"
          allowClear
          value={selectedCategory}
          onChange={setSelectedCategory}
          options={[
            { label: '全部素材', value: null },
            { label: '未分类', value: 'uncategorized' },
            ...categories.map((c) => ({
              label: (
                <span>
                  <FolderOutlined style={{ marginRight: 4 }} />
                  {c.name} ({c._count?.assets || 0})
                </span>
              ),
              value: c.id,
            })),
          ]}
        />
        <Tag>{filteredAssets.length} 个素材</Tag>
      </Space>

      {/* 素材列表 */}
      <Spin spinning={loading}>
        {filteredAssets.length === 0 ? (
          <Empty description="暂无匹配的素材" style={{ padding: 40 }} />
        ) : (
          <div style={{ maxHeight: 450, overflowY: 'auto' }}>
            <Row gutter={[12, 12]}>
              {filteredAssets.map(renderAssetCard)}
            </Row>
          </div>
        )}
      </Spin>
    </Modal>
  );
}
