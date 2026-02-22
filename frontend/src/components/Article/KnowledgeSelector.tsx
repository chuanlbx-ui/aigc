import { useState } from 'react';
import {
  Card, Input, List, Checkbox, Tag, Space, Button, Empty, Spin
} from 'antd';
import { SearchOutlined, FileTextOutlined } from '@ant-design/icons';
import { api } from '../../api/client';

interface KnowledgeItem {
  id: string;
  title: string;
  summary?: string;
  excerpt?: string;
  tags?: string;
}

interface KnowledgeSelectorProps {
  selectedIds: string[];
  onSelect: (ids: string[], items: KnowledgeItem[]) => void;
}

export default function KnowledgeSelector({
  selectedIds,
  onSelect
}: KnowledgeSelectorProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<KnowledgeItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<KnowledgeItem[]>([]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/articles/ai/search-knowledge', {
        query,
        limit: 20,
      });
      setResults(res.data.results || []);
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (item: KnowledgeItem) => {
    const isSelected = selectedIds.includes(item.id);
    let newIds: string[];
    let newItems: KnowledgeItem[];

    if (isSelected) {
      newIds = selectedIds.filter(id => id !== item.id);
      newItems = selectedItems.filter(i => i.id !== item.id);
    } else {
      newIds = [...selectedIds, item.id];
      newItems = [...selectedItems, item];
    }

    setSelectedItems(newItems);
    onSelect(newIds, newItems);
  };

  return (
    <Card title="知识库素材" size="small">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Input.Search
          placeholder="搜索知识库..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onSearch={handleSearch}
          enterButton={<SearchOutlined />}
          loading={loading}
        />

        {selectedIds.length > 0 && (
          <div>
            <Tag color="blue">{selectedIds.length} 项已选</Tag>
            <Button
              type="link"
              size="small"
              onClick={() => {
                setSelectedItems([]);
                onSelect([], []);
              }}
            >
              清空
            </Button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spin />
          </div>
        ) : results.length === 0 ? (
          <Empty
            description="输入关键词搜索素材"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            size="small"
            dataSource={results}
            style={{ maxHeight: 400, overflow: 'auto' }}
            renderItem={item => (
              <List.Item
                style={{
                  cursor: 'pointer',
                  background: selectedIds.includes(item.id)
                    ? '#e6f7ff'
                    : 'transparent',
                  padding: '8px 12px',
                }}
                onClick={() => handleToggle(item)}
              >
                <Space align="start">
                  <Checkbox checked={selectedIds.includes(item.id)} />
                  <div>
                    <div>
                      <FileTextOutlined style={{ marginRight: 4 }} />
                      {item.title}
                    </div>
                    {item.excerpt && (
                      <div style={{
                        fontSize: 12,
                        color: '#666',
                        marginTop: 4,
                        maxHeight: 40,
                        overflow: 'hidden'
                      }}>
                        {item.excerpt.substring(0, 100)}...
                      </div>
                    )}
                  </div>
                </Space>
              </List.Item>
            )}
          />
        )}
      </Space>
    </Card>
  );
}
