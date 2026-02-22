import { useState, useEffect, useCallback } from 'react';
import {
  Modal, Input, Select, Tabs, Row, Col, Button, Spin,
  Empty, Pagination, message, Space, Checkbox,
} from 'antd';
import { SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import SearchResultCard, { SearchResultItem } from './SearchResultCard';
import { api } from '../../api/client';

interface SearcherInfo {
  id: string;
  name: string;
  types: Array<'image' | 'video' | 'audio'>;
  configured: boolean;
}

interface AssetCategory {
  id: string;
  name: string;
  type: string;
}

interface AssetSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  categories: AssetCategory[];
}

export default function AssetSearchModal({
  open,
  onClose,
  onSuccess,
  categories,
}: AssetSearchModalProps) {
  // 搜索器列表
  const [searchers, setSearchers] = useState<SearcherInfo[]>([]);
  const [activeSearcher, setActiveSearcher] = useState<string>('');

  // 搜索状态
  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio'>('image');
  const [searching, setSearching] = useState(false);

  // 搜索结果
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const perPage = 20;

  // 选中状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [downloading, setDownloading] = useState(false);

  // 加载搜索器列表
  useEffect(() => {
    if (open) {
      loadSearchers();
    }
  }, [open]);

  const loadSearchers = async () => {
    try {
      const res = await api.get('/assets/searchers');
      const list = res.data.searchers || [];
      setSearchers(list);
      // 默认选择第一个已配置的搜索器
      const configured = list.find((s: SearcherInfo) => s.configured);
      if (configured) {
        setActiveSearcher(configured.id);
      }
    } catch {
      message.error('加载搜索器失败');
    }
  };

  // 执行搜索
  const handleSearch = useCallback(async (newPage = 1) => {
    if (!query.trim()) {
      message.warning('请输入搜索关键词');
      return;
    }
    if (!activeSearcher) {
      message.warning('请选择搜索源');
      return;
    }

    setSearching(true);
    setPage(newPage);

    try {
      const res = await api.post('/assets/search', {
        searcher: activeSearcher,
        query: query.trim(),
        type: mediaType,
        page: newPage,
        perPage,
      });
      setResults(res.data.results || []);
      setTotal(res.data.total || 0);
      setSelectedIds(new Set());
    } catch (err: any) {
      message.error(err.response?.data?.error || '搜索失败');
    } finally {
      setSearching(false);
    }
  }, [query, activeSearcher, mediaType]);

  // 切换选中
  const toggleSelect = (id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map(r => r.id)));
    }
  };

  // 批量下载
  const handleBatchDownload = async () => {
    if (selectedIds.size === 0) {
      message.warning('请选择要下载的素材');
      return;
    }

    const items = results
      .filter(r => selectedIds.has(r.id))
      .map(r => ({
        source: r.source,
        downloadUrl: r.downloadUrl,
        type: r.type,
        title: r.title,
        width: r.width,
        height: r.height,
        duration: r.duration,
      }));

    setDownloading(true);
    try {
      const res = await api.post('/assets/batch-download', {
        items,
        categoryId,
      });
      message.success(`成功下载 ${res.data.success} 个素材`);
      if (res.data.failed > 0) {
        message.warning(`${res.data.failed} 个素材下载失败`);
      }
      setSelectedIds(new Set());
      onSuccess?.();
    } catch (err: any) {
      message.error(err.response?.data?.error || '下载失败');
    } finally {
      setDownloading(false);
    }
  };

  // 获取当前搜索器支持的类型
  const currentSearcher = searchers.find(s => s.id === activeSearcher);
  const supportedTypes = currentSearcher?.types || ['image'];

  return (
    <Modal
      title="搜索素材"
      open={open}
      onCancel={onClose}
      width={900}
      footer={null}
      destroyOnClose
    >
      {/* 搜索器选择 */}
      <Tabs
        activeKey={activeSearcher}
        onChange={(key) => {
          setActiveSearcher(key);
          setResults([]);
          setTotal(0);
        }}
        items={searchers.map(s => ({
          key: s.id,
          label: (
            <span style={{ color: s.configured ? undefined : '#999' }}>
              {s.name} {!s.configured && '(未配置)'}
            </span>
          ),
          disabled: !s.configured,
        }))}
      />

      {/* 搜索栏 */}
      <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
        <Select
          value={mediaType}
          onChange={setMediaType}
          style={{ width: 100 }}
          options={[
            { value: 'image', label: '图片', disabled: !supportedTypes.includes('image') },
            { value: 'video', label: '视频', disabled: !supportedTypes.includes('video') },
            { value: 'audio', label: '音频', disabled: !supportedTypes.includes('audio') },
          ]}
        />
        <Input
          placeholder="输入关键词搜索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onPressEnter={() => handleSearch(1)}
          style={{ flex: 1 }}
        />
        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={() => handleSearch(1)}
          loading={searching}
        >
          搜索
        </Button>
      </Space.Compact>

      {/* 搜索结果 */}
      <Spin spinning={searching}>
        {results.length > 0 ? (
          <>
            {/* 操作栏 */}
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
              <Space>
                <Checkbox
                  checked={selectedIds.size === results.length && results.length > 0}
                  indeterminate={selectedIds.size > 0 && selectedIds.size < results.length}
                  onChange={toggleSelectAll}
                >
                  全选 ({selectedIds.size}/{results.length})
                </Checkbox>
              </Space>
              <Space>
                <Select
                  placeholder="选择分类"
                  allowClear
                  style={{ width: 150 }}
                  value={categoryId}
                  onChange={setCategoryId}
                  options={categories.map(c => ({ value: c.id, label: c.name }))}
                />
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={handleBatchDownload}
                  loading={downloading}
                  disabled={selectedIds.size === 0}
                >
                  下载选中 ({selectedIds.size})
                </Button>
              </Space>
            </div>

            {/* 结果网格 */}
            <Row gutter={[12, 12]} style={{ maxHeight: 400, overflowY: 'auto' }}>
              {results.map(item => (
                <Col key={item.id} xs={12} sm={8} md={6}>
                  <SearchResultCard
                    item={item}
                    selected={selectedIds.has(item.id)}
                    onSelect={(selected) => toggleSelect(item.id, selected)}
                  />
                </Col>
              ))}
            </Row>

            {/* 分页 */}
            {total > perPage && (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Pagination
                  current={page}
                  total={total}
                  pageSize={perPage}
                  onChange={(p) => handleSearch(p)}
                  showSizeChanger={false}
                />
              </div>
            )}
          </>
        ) : (
          <Empty description={query ? '未找到结果' : '输入关键词开始搜索'} />
        )}
      </Spin>
    </Modal>
  );
}
