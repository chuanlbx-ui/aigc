import { useState } from 'react';
import { Input, Button, Card, Space, message, Alert } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { api } from '../../api/client';

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface WebSearchPanelProps {
  serviceId?: string;
  onResultsChange: (results: WebSearchResult[], content: string) => void;
}

export default function WebSearchPanel({
  serviceId,
  onResultsChange,
}: WebSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) {
      message.warning('请输入搜索关键词');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.post('/articles/ai/web-search', {
        query,
        serviceId,
      });
      setContent(res.data.content || '');
      onResultsChange(res.data.searchResults || [], res.data.content || '');
      message.success('搜索完成');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || '搜索失败';
      setError(errMsg);
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Input.Search
        placeholder="输入搜索关键词，AI 将联网搜索最新信息"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onSearch={handleSearch}
        enterButton={
          <Button icon={<GlobalOutlined />} loading={loading}>
            联网搜索
          </Button>
        }
        loading={loading}
      />

      {error && (
        <Alert
          type="warning"
          message={error}
          description="请确保选择了支持联网搜索的 AI 模型（如 Kimi、通义千问、智谱、Gemini）"
          showIcon
        />
      )}

      {content && (
        <Card size="small" title="搜索结果" style={{ background: '#e6f7ff' }}>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0, maxHeight: 300, overflow: 'auto' }}>
            {content}
          </pre>
        </Card>
      )}
    </Space>
  );
}
