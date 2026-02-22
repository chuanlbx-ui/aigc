import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Space, Select, Empty, Spin } from 'antd';
import { SoundOutlined } from '@ant-design/icons';
import { api } from '../../../api/client';

interface Category {
  id: string;
  name: string;
  type: string;
  _count?: { assets: number };
}

interface AudioAsset {
  id: string;
  name: string;
  type: string;
  categoryId: string | null;
}

interface Props {
  selectedAssetId?: string | null;
  onSelect: (assetId: string) => void;
}

export const AssetList: React.FC<Props> = ({ selectedAssetId, onSelect }) => {
  const [audioAssets, setAudioAssets] = useState<AudioAsset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/assets/categories');
      setCategories(
        res.data.filter((c: Category) => c.type === 'all' || c.type === 'audio')
      );
    } catch {
      setCategories([]);
    }
  };

  const fetchAudioAssets = async (categoryId?: string | null) => {
    setLoading(true);
    try {
      const params = categoryId ? `?categoryId=${categoryId}` : '';
      const res = await api.get(`/assets${params}`);
      const audios = res.data.filter((a: AudioAsset) => a.type === 'audio');
      setAudioAssets(audios);
    } catch {
      setAudioAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchAudioAssets();
  }, []);

  const handleCategoryFilter = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    fetchAudioAssets(categoryId);
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <span>筛选分类：</span>
        <Select
          style={{ width: 150 }}
          placeholder="全部"
          allowClear
          value={selectedCategory}
          onChange={handleCategoryFilter}
          options={[
            { label: '全部音频', value: null },
            ...categories.map((c) => ({ label: c.name, value: c.id })),
          ]}
        />
      </Space>

      <Spin spinning={loading}>
        {audioAssets.length === 0 ? (
          <Empty description="暂无音频素材" />
        ) : (
          <Row gutter={[12, 12]}>
            {audioAssets.map((audio) => (
              <Col key={audio.id} span={12}>
                <Card
                  hoverable
                  onClick={() => onSelect(audio.id)}
                  style={{
                    border:
                      selectedAssetId === audio.id
                        ? '2px solid #1890ff'
                        : '1px solid #f0f0f0',
                  }}
                  bodyStyle={{ padding: 12 }}
                >
                  <Space>
                    <SoundOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 200,
                        display: 'inline-block',
                      }}
                    >
                      {audio.name}
                    </span>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>
    </div>
  );
};

export default AssetList;
