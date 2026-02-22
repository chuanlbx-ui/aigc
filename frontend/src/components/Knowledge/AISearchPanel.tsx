import { useState } from 'react';
import { Modal, Tabs, Input, Button, Select, Space, Spin, message, Card } from 'antd';
import { SearchOutlined, LinkOutlined } from '@ant-design/icons';
import { useKnowledgeStore } from '../../stores/knowledge';
import { useNavigate } from 'react-router-dom';
import AIModelSelector from '../common/AIModelSelector';

interface AISearchPanelProps {
  open: boolean;
  onCancel: () => void;
}

export default function AISearchPanel({ open, onCancel }: AISearchPanelProps) {
  const navigate = useNavigate();
  const { categories, fetchDocs } = useKnowledgeStore();
  const [activeTab, setActiveTab] = useState('search');
  const [loading, setLoading] = useState(false);

  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategoryId, setSearchCategoryId] = useState<string | null>(null);
  const [searchTags, setSearchTags] = useState<string[]>([]);

  // URL 抓取状态
  const [fetchUrl, setFetchUrl] = useState('');
  const [fetchCategoryId, setFetchCategoryId] = useState<string | null>(null);
  const [fetchTags, setFetchTags] = useState<string[]>([]);

  // AI 模型选择
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      message.warning('请输入搜索关键词');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/knowledge/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          categoryId: searchCategoryId,
          tags: searchTags,
          serviceId: selectedServiceId,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        message.success('搜索整理完成');
        fetchDocs();
        onCancel();
        navigate(`/knowledge/${data.doc.id}`);
      } else {
        message.error(data.error || '搜索失败');
      }
    } catch (error) {
      message.error('搜索请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchUrl = async () => {
    if (!fetchUrl.trim()) {
      message.warning('请输入 URL');
      return;
    }

    try {
      new URL(fetchUrl);
    } catch {
      message.warning('请输入有效的 URL');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/knowledge/ai/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: fetchUrl,
          categoryId: fetchCategoryId,
          tags: fetchTags,
          serviceId: selectedServiceId,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        message.success('URL 抓取整理完成');
        fetchDocs();
        onCancel();
        navigate(`/knowledge/${data.doc.id}`);
      } else {
        message.error(data.error || '抓取失败');
      }
    } catch (error) {
      message.error('抓取请求失败');
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = [
    { label: '不指定分类', value: '' },
    ...categories.map(c => ({ label: c.name, value: c.id })),
  ];

  return (
    <Modal
      title="AI 智能搜索"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Spin spinning={loading} tip="正在处理，请稍候...">
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          {
            key: 'search',
            label: <span><SearchOutlined /> 关键词搜索</span>,
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Card size="small" title="搜索设置">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <AIModelSelector
                      value={selectedServiceId}
                      onChange={setSelectedServiceId}
                      showWebSearchTag={true}
                      filterWebSearch={true}
                      size="small"
                      placeholder="选择 AI 模型（支持联网搜索）"
                    />
                    <Input
                      placeholder="输入搜索关键词，AI 将搜索并整理相关内容"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onPressEnter={handleSearch}
                      size="large"
                    />
                    <Select
                      style={{ width: '100%' }}
                      placeholder="选择分类（可选）"
                      allowClear
                      value={searchCategoryId}
                      onChange={setSearchCategoryId}
                      options={categoryOptions}
                    />
                    <Select
                      mode="tags"
                      style={{ width: '100%' }}
                      placeholder="添加标签（可选）"
                      value={searchTags}
                      onChange={setSearchTags}
                    />
                  </Space>
                </Card>
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={handleSearch}
                  block
                  size="large"
                >
                  开始搜索
                </Button>
                <div style={{ color: '#666', fontSize: 12 }}>
                  AI 将搜索网络内容，整理成结构化的 Markdown 文档保存到知识库
                </div>
              </Space>
            ),
          },
          {
            key: 'url',
            label: <span><LinkOutlined /> URL 抓取</span>,
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Card size="small" title="抓取设置">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <AIModelSelector
                      value={selectedServiceId}
                      onChange={setSelectedServiceId}
                      showWebSearchTag={false}
                      size="small"
                      placeholder="选择 AI 模型"
                    />
                    <Input
                      placeholder="输入网页 URL，AI 将抓取并整理内容"
                      value={fetchUrl}
                      onChange={e => setFetchUrl(e.target.value)}
                      onPressEnter={handleFetchUrl}
                      size="large"
                    />
                    <Select
                      style={{ width: '100%' }}
                      placeholder="选择分类（可选）"
                      allowClear
                      value={fetchCategoryId}
                      onChange={setFetchCategoryId}
                      options={categoryOptions}
                    />
                    <Select
                      mode="tags"
                      style={{ width: '100%' }}
                      placeholder="添加标签（可选）"
                      value={fetchTags}
                      onChange={setFetchTags}
                    />
                  </Space>
                </Card>
                <Button
                  type="primary"
                  icon={<LinkOutlined />}
                  onClick={handleFetchUrl}
                  block
                  size="large"
                >
                  开始抓取
                </Button>
                <div style={{ color: '#666', fontSize: 12 }}>
                  AI 将抓取网页内容，提取核心信息并整理成 Markdown 文档
                </div>
              </Space>
            ),
          },
        ]} />
      </Spin>
    </Modal>
  );
}
