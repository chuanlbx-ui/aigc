import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, List, Empty, Modal, Tabs, Card, Row, Col, Select, Space, Image, Tag, Checkbox, InputNumber, message, Alert, Popover, Input, Spin, Pagination } from 'antd';
import { PlusOutlined, DeleteOutlined, FolderOutlined, PlayCircleOutlined, HolderOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '../../api/client';
import AssetGenerator from './AssetGenerator';

interface Category {
  id: string;
  name: string;
  type: string;
  _count?: { assets: number };
}

interface LibraryAsset {
  id: string;
  name: string;
  path: string;
  type: string;
  categoryId: string | null;
}

interface Asset {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
  duration: number;
}

// 搜索相关接口
interface SearcherInfo {
  id: string;
  name: string;
  types: Array<'image' | 'video' | 'audio'>;
  configured: boolean;
}

interface SearchResult {
  id: string;
  source: string;
  type: 'image' | 'video' | 'audio';
  title: string;
  thumbnailUrl: string;
  previewUrl: string;
  downloadUrl: string;
  width?: number;
  height?: number;
  duration?: number;
  author?: string;
}

interface AssetPickerProps {
  assets: Asset[];
  onChange: (assets: Asset[]) => void;
  estimatedDurationMs?: number;
  text?: string;
  projectName?: string;
  orientation?: 'landscape' | 'portrait';
}

// 可拖拽的素材项组件
function SortableAssetItem({
  asset,
  index,
  onRemove,
  onDurationChange
}: {
  asset: Asset;
  index: number;
  onRemove: () => void;
  onDurationChange: (duration: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: asset.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // 预览内容
  const previewContent = (
    <div style={{ width: 200 }}>
      {asset.type === 'video' ? (
        <video
          src={asset.url}
          style={{ width: '100%', maxHeight: 150, objectFit: 'contain' }}
          controls
          muted
        />
      ) : (
        <Image
          src={asset.url}
          alt={asset.name}
          style={{ width: '100%', maxHeight: 150, objectFit: 'contain' }}
          preview={false}
        />
      )}
      <div style={{ marginTop: 8, fontSize: 12, color: '#666', wordBreak: 'break-all' }}>
        {asset.name}
      </div>
    </div>
  );

  return (
    <div ref={setNodeRef} style={style}>
      <List.Item
        actions={[
          <InputNumber
            key="duration"
            size="small"
            min={1}
            max={60}
            value={asset.duration}
            onChange={(v) => onDurationChange(v || 3)}
            addonAfter="秒"
            style={{ width: 100 }}
          />,
          <Button
            key="delete"
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={onRemove}
          />,
        ]}
      >
        <Space>
          <span style={{ width: 24, textAlign: 'center', color: '#999', fontWeight: 500 }}>{index + 1}</span>
          <HolderOutlined {...attributes} {...listeners} style={{ cursor: 'grab', color: '#999' }} />
          {asset.type === 'video' ? <PlayCircleOutlined /> : <span>🖼</span>}
          <Popover content={previewContent} trigger="hover" placement="right">
            <span style={{
              maxWidth: 400,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'inline-block',
              cursor: 'pointer'
            }}>
              {asset.name}
            </span>
          </Popover>
        </Space>
      </List.Item>
    </div>
  );
}

// 搜索结果卡片组件（支持视频悬停预览）
function SearchResultCard({
  item,
  selected,
  onToggle,
}: {
  item: SearchResult;
  selected: boolean;
  onToggle: () => void;
}) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <Card
      hoverable
      size="small"
      onClick={onToggle}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{ border: selected ? '2px solid #1890ff' : '1px solid #f0f0f0' }}
      cover={
        <div style={{ height: 70, background: '#f5f5f5', position: 'relative' }}>
          {item.type === 'video' && isHovering ? (
            <video
              src={item.previewUrl}
              autoPlay
              muted
              loop
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
          {item.type === 'video' && !isHovering && (
            <PlayCircleOutlined
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: 20,
                color: '#fff',
              }}
            />
          )}
          <Checkbox
            checked={selected}
            style={{ position: 'absolute', top: 2, left: 2 }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      }
      bodyStyle={{ padding: 4 }}
    >
      <div style={{ fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.title}
      </div>
    </Card>
  );
}

export default function AssetPicker({
  assets,
  onChange,
  estimatedDurationMs = 0,
  text = '',
  projectName = '',
  orientation = 'landscape',
}: AssetPickerProps) {
  // 获取认证 token
  const getToken = () => {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      try {
        const { state } = JSON.parse(stored);
        return state?.accessToken || '';
      } catch {
        return '';
      }
    }
    return '';
  };

  // 生成带 token 的资源 URL
  const getAssetUrl = (assetId: string) => {
    const token = getToken();
    return `/api/assets/file/${assetId}?token=${encodeURIComponent(token)}`;
  };

  const [showModal, setShowModal] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [libraryAssets, setLibraryAssets] = useState<LibraryAsset[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [batchDuration, setBatchDuration] = useState<number>(3);

  // 联网搜索状态
  const [searchers, setSearchers] = useState<SearcherInfo[]>([]);
  const [activeSearcher, setActiveSearcher] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'image' | 'video'>('image');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchPage, setSearchPage] = useState(1);
  const [searching, setSearching] = useState(false);
  const [selectedSearchIds, setSelectedSearchIds] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // 计算素材总时长
  const totalAssetDuration = useMemo(() => {
    return assets.reduce((sum, a) => sum + a.duration, 0);
  }, [assets]);

  // 时长差异提示
  const durationDiff = useMemo(() => {
    if (estimatedDurationMs === 0 || assets.length === 0) return null;
    const audioDurationSec = Math.ceil(estimatedDurationMs / 1000);
    const diff = totalAssetDuration - audioDurationSec;
    return { audioDurationSec, diff };
  }, [estimatedDurationMs, totalAssetDuration, assets.length]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/assets/categories');
      setCategories(res.data.filter((c: Category) => c.type === 'all' || c.type === 'image' || c.type === 'video'));
    } catch {
      setCategories([]);
    }
  };

  const fetchAssets = async (categoryId?: string | null) => {
    try {
      const params = categoryId ? `?categoryId=${categoryId}` : '';
      const res = await api.get(`/assets${params}`);
      setLibraryAssets(res.data.filter((a: LibraryAsset) => a.type === 'image' || a.type === 'video'));
    } catch {
      setLibraryAssets([]);
    }
  };

  // 加载搜索器列表
  const loadSearchers = async () => {
    try {
      const res = await api.get('/assets/searchers');
      const list = (res.data.searchers || []).filter((s: SearcherInfo) =>
        s.types.includes('image') || s.types.includes('video')
      );
      setSearchers(list);
      const configured = list.find((s: SearcherInfo) => s.configured);
      if (configured) setActiveSearcher(configured.id);
    } catch {
      setSearchers([]);
    }
  };

  // 执行搜索
  const handleSearch = useCallback(async (page = 1) => {
    if (!searchQuery.trim() || !activeSearcher) return;
    setSearching(true);
    setSearchPage(page);
    try {
      const res = await api.post('/assets/search', {
        searcher: activeSearcher,
        query: searchQuery.trim(),
        type: searchType,
        page,
        perPage: 12,
      });
      setSearchResults((res.data.results || []).filter((r: SearchResult) => r.type !== 'audio'));
      setSearchTotal(res.data.total || 0);
      setSelectedSearchIds(new Set());
    } catch (err: any) {
      message.error(err.response?.data?.error || '搜索失败');
    } finally {
      setSearching(false);
    }
  }, [searchQuery, activeSearcher, searchType]);

  // 下载并添加搜索结果
  const handleDownloadAndAdd = async () => {
    if (selectedSearchIds.size === 0) return;
    const items = searchResults
      .filter(r => selectedSearchIds.has(r.id))
      .map(r => ({
        source: r.source,
        downloadUrl: r.downloadUrl,
        type: r.type,
        title: r.title,
      }));
    setDownloading(true);
    try {
      const res = await api.post('/assets/batch-download', { items });
      const newAssets: Asset[] = (res.data.assets || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        url: `${window.location.origin}${getAssetUrl(a.id)}`,
        type: searchType,
        duration: 3,
      }));
      onChange([...assets, ...newAssets]);
      message.success(`成功添加 ${newAssets.length} 个素材`);
      setSelectedSearchIds(new Set());
    } catch (err: any) {
      message.error(err.response?.data?.error || '下载失败');
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    if (showModal) {
      fetchCategories();
      fetchAssets();
      loadSearchers();
    }
  }, [showModal]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = assets.findIndex(a => a.id === active.id);
      const newIndex = assets.findIndex(a => a.id === over.id);
      onChange(arrayMove(assets, oldIndex, newIndex));
    }
  };

  const handleRemove = (id: string) => {
    onChange(assets.filter(a => a.id !== id));
  };

  const handleDurationChange = (id: string, duration: number) => {
    onChange(assets.map(a => a.id === id ? { ...a, duration } : a));
  };

  const handleBatchDuration = () => {
    onChange(assets.map(a => ({ ...a, duration: batchDuration })));
    message.success(`已将所有素材时长设为 ${batchDuration} 秒`);
  };

  const handleCategoryFilter = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    fetchAssets(categoryId);
  };

  const handleSelectCategory = (categoryId: string) => {
    const categoryAssets = libraryAssets.filter(a => a.categoryId === categoryId);
    const newAssets: Asset[] = categoryAssets.map(a => ({
      id: a.id,
      name: a.name,
      url: `${window.location.origin}${getAssetUrl(a.id)}`,
      type: a.type as 'image' | 'video',
      duration: 3,
    }));
    const existingIds = new Set(assets.map(a => a.id));
    const uniqueNewAssets = newAssets.filter(a => !existingIds.has(a.id));
    onChange([...assets, ...uniqueNewAssets]);
    setShowModal(false);
  };

  const handleToggleAsset = (asset: LibraryAsset) => {
    if (selectedAssetIds.includes(asset.id)) {
      setSelectedAssetIds(selectedAssetIds.filter(id => id !== asset.id));
    } else {
      setSelectedAssetIds([...selectedAssetIds, asset.id]);
    }
  };

  const handleConfirmSelection = () => {
    const newAssets: Asset[] = libraryAssets
      .filter(a => selectedAssetIds.includes(a.id))
      .map(a => ({
        id: a.id,
        name: a.name,
        url: `${window.location.origin}${getAssetUrl(a.id)}`,
        type: a.type as 'image' | 'video',
        duration: 3,
      }));
    const existingIds = new Set(assets.map(a => a.id));
    const uniqueNewAssets = newAssets.filter(a => !existingIds.has(a.id));
    onChange([...assets, ...uniqueNewAssets]);
    setSelectedAssetIds([]);
    setShowModal(false);
  };

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
          从素材库选择
        </Button>
        <AssetGenerator
          text={text}
          projectName={projectName}
          orientation={orientation}
          onGenerated={(generatedAssets) => {
            const newAssets: Asset[] = generatedAssets.map(a => ({
              id: a.id,
              name: a.name,
              url: `${window.location.origin}${getAssetUrl(a.id)}`,
              type: a.type as 'image' | 'video',
              duration: 3,
            }));
            onChange([...assets, ...newAssets]);
          }}
        />
        {assets.length > 0 && (
          <Space>
            <InputNumber
              size="small"
              min={1}
              max={60}
              value={batchDuration}
              onChange={(v) => setBatchDuration(v || 3)}
              addonAfter="秒"
              style={{ width: 100 }}
            />
            <Button size="small" onClick={handleBatchDuration}>
              批量设置时长
            </Button>
          </Space>
        )}
      </Space>

      {/* 时长对比提示 */}
      {durationDiff && (
        <Alert
          type={Math.abs(durationDiff.diff) <= 2 ? 'success' : durationDiff.diff > 0 ? 'warning' : 'info'}
          showIcon
          style={{ marginBottom: 12 }}
          message={
            <span>
              素材总时长: <strong>{totalAssetDuration}秒</strong> |
              音频时长: <strong>{durationDiff.audioDurationSec}秒</strong>
              {Math.abs(durationDiff.diff) <= 2 ? (
                <Tag color="green" style={{ marginLeft: 8 }}>时长匹配</Tag>
              ) : durationDiff.diff > 0 ? (
                <Tag color="orange" style={{ marginLeft: 8 }}>素材多 {durationDiff.diff}秒</Tag>
              ) : (
                <Tag color="blue" style={{ marginLeft: 8 }}>素材少 {Math.abs(durationDiff.diff)}秒</Tag>
              )}
            </span>
          }
        />
      )}

      {assets.length === 0 ? (
        <Empty description="暂无素材，拖拽可排序" style={{ marginTop: 16 }} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={assets.map(a => a.id)} strategy={verticalListSortingStrategy}>
            <List
              size="small"
              bordered
              dataSource={assets}
              renderItem={(item, index) => (
                <SortableAssetItem
                  key={item.id}
                  asset={item}
                  index={index}
                  onRemove={() => handleRemove(item.id)}
                  onDurationChange={(d) => handleDurationChange(item.id, d)}
                />
              )}
            />
          </SortableContext>
        </DndContext>
      )}

      <Modal
        title="选择素材"
        open={showModal}
        onCancel={() => { setShowModal(false); setSelectedAssetIds([]); }}
        width={900}
        footer={
          <Space>
            <Button onClick={() => setShowModal(false)}>取消</Button>
            <Button type="primary" disabled={selectedAssetIds.length === 0} onClick={handleConfirmSelection}>
              添加选中的 {selectedAssetIds.length} 个素材
            </Button>
          </Space>
        }
      >
        <Tabs
          items={[
            {
              key: 'category',
              label: '按分类选择',
              children: (
                <div>
                  <p style={{ marginBottom: 16, color: '#666' }}>选择一个分类，将添加该分类下的所有素材</p>
                  {categories.length === 0 ? (
                    <Empty description="暂无分类" />
                  ) : (
                    <Row gutter={[16, 16]}>
                      {categories.map(cat => (
                        <Col key={cat.id} span={8}>
                          <Card hoverable onClick={() => handleSelectCategory(cat.id)} style={{ textAlign: 'center' }}>
                            <FolderOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                            <div style={{ marginTop: 8 }}>{cat.name}</div>
                            <Tag>{cat._count?.assets || 0} 个素材</Tag>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  )}
                </div>
              ),
            },
            {
              key: 'single',
              label: '选择单个素材',
              children: (
                <div>
                  <Space style={{ marginBottom: 16 }}>
                    <span>筛选分类：</span>
                    <Select
                      style={{ width: 150 }}
                      placeholder="全部"
                      allowClear
                      value={selectedCategory}
                      onChange={handleCategoryFilter}
                      options={[{ label: '全部素材', value: null }, ...categories.map(c => ({ label: c.name, value: c.id }))]}
                    />
                  </Space>
                  {libraryAssets.length === 0 ? (
                    <Empty description="暂无素材" />
                  ) : (
                    <Row gutter={[12, 12]}>
                      {libraryAssets.map(asset => (
                        <Col key={asset.id} span={6}>
                          <Card
                            hoverable
                            onClick={() => handleToggleAsset(asset)}
                            style={{ border: selectedAssetIds.includes(asset.id) ? '2px solid #1890ff' : '1px solid #f0f0f0' }}
                            bodyStyle={{ padding: 8 }}
                            cover={
                              asset.type === 'video' ? (
                                <div style={{ height: 80, position: 'relative', background: '#000' }}>
                                  <video src={`/api/assets/file/${asset.id}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                                  <PlayCircleOutlined style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 24, color: '#fff', opacity: 0.8 }} />
                                </div>
                              ) : (
                                <Image src={`/api/assets/file/${asset.id}`} alt={asset.name} style={{ height: 80, objectFit: 'cover' }} preview={false} />
                              )
                            }
                          >
                            <Checkbox checked={selectedAssetIds.includes(asset.id)} style={{ marginRight: 8 }} />
                            <span style={{ fontSize: 12 }}>{asset.name}</span>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  )}
                </div>
              ),
            },
            {
              key: 'search',
              label: <><SearchOutlined /> 联网搜索</>,
              children: (
                <div>
                  {/* 搜索栏 */}
                  <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
                    <Select
                      value={activeSearcher}
                      onChange={setActiveSearcher}
                      style={{ width: 120 }}
                      options={searchers.map(s => ({
                        value: s.id,
                        label: s.name,
                        disabled: !s.configured,
                      }))}
                    />
                    <Select
                      value={searchType}
                      onChange={setSearchType}
                      style={{ width: 80 }}
                      options={[
                        { value: 'image', label: '图片' },
                        { value: 'video', label: '视频' },
                      ]}
                    />
                    <Input
                      placeholder="输入关键词搜索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onPressEnter={() => handleSearch(1)}
                    />
                    <Button type="primary" icon={<SearchOutlined />} onClick={() => handleSearch(1)} loading={searching}>
                      搜索
                    </Button>
                  </Space.Compact>

                  {/* 搜索结果 */}
                  <Spin spinning={searching}>
                    {searchResults.length > 0 ? (
                      <>
                        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                          <Checkbox
                            checked={selectedSearchIds.size === searchResults.length}
                            indeterminate={selectedSearchIds.size > 0 && selectedSearchIds.size < searchResults.length}
                            onChange={() => {
                              if (selectedSearchIds.size === searchResults.length) {
                                setSelectedSearchIds(new Set());
                              } else {
                                setSelectedSearchIds(new Set(searchResults.map(r => r.id)));
                              }
                            }}
                          >
                            全选 ({selectedSearchIds.size}/{searchResults.length})
                          </Checkbox>
                          <Button
                            type="primary"
                            icon={<DownloadOutlined />}
                            onClick={handleDownloadAndAdd}
                            loading={downloading}
                            disabled={selectedSearchIds.size === 0}
                          >
                            下载并添加 ({selectedSearchIds.size})
                          </Button>
                        </div>
                        <Row gutter={[8, 8]} style={{ maxHeight: 300, overflowY: 'auto' }}>
                          {searchResults.map(item => (
                            <Col key={item.id} span={6}>
                              <SearchResultCard
                                item={item}
                                selected={selectedSearchIds.has(item.id)}
                                onToggle={() => {
                                  const next = new Set(selectedSearchIds);
                                  if (next.has(item.id)) next.delete(item.id);
                                  else next.add(item.id);
                                  setSelectedSearchIds(next);
                                }}
                              />
                            </Col>
                          ))}
                        </Row>
                        {searchTotal > 12 && (
                          <Pagination
                            size="small"
                            current={searchPage}
                            total={searchTotal}
                            pageSize={12}
                            onChange={(p) => handleSearch(p)}
                            style={{ marginTop: 8, textAlign: 'center' }}
                          />
                        )}
                      </>
                    ) : (
                      <Empty description={searchQuery ? '未找到结果' : '输入关键词搜索图片或视频'} />
                    )}
                  </Spin>
                </div>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
}
