/**
 * 模板市场页面
 */

import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Input,
  Select,
  Tag,
  Rate,
  Button,
  Empty,
  Spin,
  message,
} from 'antd';
import {
  DownloadOutlined,
  StarOutlined,
} from '@ant-design/icons';

const { Search } = Input;

interface MarketplaceItem {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  category?: string;
  tags: string[];
  publisherName?: string;
  downloads: number;
  rating: number;
  ratingCount: number;
  price: number;
}

export default function TemplateMarketplace() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>();

  useEffect(() => {
    fetchItems();
  }, [search, category]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);

      const res = await fetch(`/api/marketplace?${params}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      await fetch(`/api/marketplace/${id}/download`, { method: 'POST' });
      message.success('下载成功');
      fetchItems();
    } catch (error) {
      message.error('下载失败');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>模板市场</h2>

      {/* 搜索栏 */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
        <Search
          placeholder="搜索模板"
          allowClear
          onSearch={setSearch}
          style={{ width: 300 }}
        />
        <Select
          placeholder="选择分类"
          allowClear
          style={{ width: 150 }}
          onChange={setCategory}
          options={[
            { label: '弹窗模板', value: 'popup' },
            { label: '工作流模板', value: 'workflow' },
            { label: '通用模板', value: 'general' },
          ]}
        />
      </div>

      {/* 模板列表 */}
      <Spin spinning={loading}>
        {items.length === 0 ? (
          <Empty description="暂无模板" />
        ) : (
          <Row gutter={[16, 16]}>
            {items.map((item) => (
              <Col key={item.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  cover={
                    item.thumbnail ? (
                      <img alt={item.title} src={item.thumbnail} style={{ height: 120, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: 120, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        暂无预览
                      </div>
                    )
                  }
                >
                  <Card.Meta
                    title={item.title}
                    description={item.description || '暂无描述'}
                  />
                  <div style={{ marginTop: 12 }}>
                    <Rate disabled value={item.rating} style={{ fontSize: 12 }} />
                    <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>
                      ({item.ratingCount})
                    </span>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#999', fontSize: 12 }}>
                      <DownloadOutlined /> {item.downloads}
                    </span>
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => handleDownload(item.id)}
                    >
                      {item.price > 0 ? `¥${item.price / 100}` : '免费下载'}
                    </Button>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>
    </div>
  );
}
