import { useState, useEffect } from 'react';
import { Card, Upload, Row, Col, Empty, message, Image, Popconfirm, Modal, Select, Input, Button, Space, Tag, Checkbox } from 'antd';
import { UploadOutlined, DeleteOutlined, SoundOutlined, PlayCircleOutlined, PlusOutlined, FolderOutlined, EditOutlined, CheckSquareOutlined, CloseSquareOutlined, SearchOutlined, RobotOutlined } from '@ant-design/icons';
import { api } from '../api/client';
import AssetSearchModal from '../components/Asset/AssetSearchModal';
import AssetGenerateModal from '../components/Asset/AssetGenerateModal';

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

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // 批量操作状态
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchCategoryModal, setShowBatchCategoryModal] = useState(false);
  const [showBatchRenameModal, setShowBatchRenameModal] = useState(false);
  const [batchCategoryId, setBatchCategoryId] = useState<string | null>(null);
  const [renameList, setRenameList] = useState<{ id: string; name: string; newName: string }[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // 清理孤立资源状态
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [cleanupData, setCleanupData] = useState<{ total: number; missing: number; assets: any[] } | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);

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

  const fetchCategories = async () => {
    try {
      const res = await api.get('/assets/categories');
      setCategories(res.data);
    } catch {
      setCategories([]);
    }
  };

  const fetchAssets = async (categoryId?: string | null) => {
    setLoading(true);
    try {
      const params = categoryId ? `?categoryId=${categoryId}` : '';
      const res = await api.get(`/assets${params}`);
      setAssets(res.data);
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchAssets();
  }, []);

  const handleCategoryChange = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    fetchAssets(categoryId);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    await api.post('/assets/categories', { name: newCategoryName, type: 'all' });
    message.success('分类创建成功');
    setNewCategoryName('');
    setShowCategoryModal(false);
    fetchCategories();
  };

  const handleDeleteCategory = async (id: string) => {
    await api.delete(`/assets/categories/${id}`);
    message.success('分类删除成功');
    if (selectedCategory === id) {
      setSelectedCategory(null);
      fetchAssets();
    }
    fetchCategories();
  };

  const handleUpdateAssetCategory = async (assetId: string, categoryId: string | null) => {
    await api.put(`/assets/${assetId}/category`, { categoryId });
    message.success('素材分类已更新');
    fetchAssets(selectedCategory);
  };

  // 批量选择处理
  const handleSelectAsset = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(i => i !== id));
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === assets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(assets.map(a => a.id));
    }
  };

  // 批量分类
  const handleBatchCategory = async () => {
    await api.put('/assets/batch/category', { ids: selectedIds, categoryId: batchCategoryId });
    message.success(`已更新 ${selectedIds.length} 个素材的分类`);
    setShowBatchCategoryModal(false);
    setSelectedIds([]);
    setBatchMode(false);
    fetchAssets(selectedCategory);
    fetchCategories();
  };

  // 批量删除
  const handleBatchDelete = async () => {
    await api.delete('/assets/batch', { data: { ids: selectedIds } });
    message.success(`已删除 ${selectedIds.length} 个素材`);
    setSelectedIds([]);
    setBatchMode(false);
    fetchAssets(selectedCategory);
  };

  // 打开批量重命名弹窗
  const openBatchRename = () => {
    const list = assets.filter(a => selectedIds.includes(a.id)).map(a => ({
      id: a.id,
      name: a.name,
      newName: a.name,
    }));
    setRenameList(list);
    setShowBatchRenameModal(true);
  };

  // 批量重命名
  const handleBatchRename = async () => {
    const renames = renameList.filter(r => r.newName !== r.name).map(r => ({ id: r.id, name: r.newName }));
    if (renames.length === 0) {
      message.info('没有需要修改的名称');
      return;
    }
    await api.put('/assets/batch/rename', { renames });
    message.success(`已重命名 ${renames.length} 个素材`);
    setShowBatchRenameModal(false);
    setSelectedIds([]);
    setBatchMode(false);
    fetchAssets(selectedCategory);
  };

  // 检查孤立资源
  const handleCheckCleanup = async () => {
    setCleanupLoading(true);
    try {
      const res = await api.get('/assets/cleanup/check');
      setCleanupData(res.data);
      setShowCleanupModal(true);
      if (res.data.missing === 0) {
        message.success('所有资源文件都存在，无需清理');
      }
    } catch (error) {
      message.error('检查失败');
    } finally {
      setCleanupLoading(false);
    }
  };

  // 执行清理
  const handleExecuteCleanup = async () => {
    setCleanupLoading(true);
    try {
      const res = await api.post('/assets/cleanup/execute');
      message.success(`已清理 ${res.data.deletedCount} 条无效记录`);
      setShowCleanupModal(false);
      setCleanupData(null);
      fetchAssets(selectedCategory);
      fetchCategories();
    } catch (error) {
      message.error('清理失败');
    } finally {
      setCleanupLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title="上传素材" style={{ marginBottom: 24 }}>
        <Upload.Dragger
          name="file"
          multiple
          action="/api/assets/upload"
          accept="image/*,video/*,audio/*,.mp3,.wav,.ogg,.m4a"
          onChange={(info) => {
            if (info.file.status === 'done') {
              message.success(`${info.file.name} 上传成功`);
              fetchAssets();
            } else if (info.file.status === 'error') {
              message.error(`${info.file.name} 上传失败`);
            }
          }}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          </p>
          <p>点击或拖拽文件到此区域上传</p>
          <p style={{ color: '#999' }}>支持图片、视频和音频文件</p>
        </Upload.Dragger>
      </Card>

      <Card
        title={
          <Space>
            <span>素材列表</span>
            <Select
              style={{ width: 150 }}
              placeholder="选择分类"
              allowClear
              value={selectedCategory}
              onChange={handleCategoryChange}
              options={[
                { label: '全部素材', value: null },
                { label: '未分类', value: 'uncategorized' },
                ...categories.map(c => ({ label: `${c.name} (${c._count?.assets || 0})`, value: c.id }))
              ]}
            />
            {batchMode && (
              <>
                <Button size="small" onClick={handleSelectAll}>
                  {selectedIds.length === assets.length ? '取消全选' : '全选'}
                </Button>
                <Tag color="blue">{selectedIds.length} 已选</Tag>
              </>
            )}
          </Space>
        }
        extra={
          <Space>
            {batchMode ? (
              <>
                <Button
                  size="small"
                  disabled={selectedIds.length === 0}
                  onClick={() => setShowBatchCategoryModal(true)}
                >
                  批量分类
                </Button>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  disabled={selectedIds.length === 0}
                  onClick={openBatchRename}
                >
                  批量改名
                </Button>
                <Popconfirm
                  title={`确定删除选中的 ${selectedIds.length} 个素材？`}
                  onConfirm={handleBatchDelete}
                  disabled={selectedIds.length === 0}
                >
                  <Button size="small" danger disabled={selectedIds.length === 0}>
                    批量删除
                  </Button>
                </Popconfirm>
                <Button
                  size="small"
                  icon={<CloseSquareOutlined />}
                  onClick={() => { setBatchMode(false); setSelectedIds([]); }}
                >
                  退出
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={() => setShowSearchModal(true)}
                >
                  搜索素材
                </Button>
                <Button
                  icon={<RobotOutlined />}
                  onClick={() => setShowGenerateModal(true)}
                >
                  AI 生成
                </Button>
                <Button
                  icon={<CheckSquareOutlined />}
                  onClick={() => setBatchMode(true)}
                >
                  批量操作
                </Button>
                <Button icon={<PlusOutlined />} onClick={() => setShowCategoryModal(true)}>
                  管理分类
                </Button>
                <Button
                  icon={<DeleteOutlined />}
                  onClick={handleCheckCleanup}
                  loading={cleanupLoading}
                  danger
                >
                  清理资源
                </Button>
              </>
            )}
          </Space>
        }
        loading={loading}
      >
        {assets.length === 0 ? (
          <Empty description="暂无素材" />
        ) : (
          <Row gutter={[16, 16]}>
            {assets.map((asset) => (
              <Col key={asset.id} span={4}>
                <Card
                  hoverable
                  onClick={() => batchMode ? handleSelectAsset(asset.id, !selectedIds.includes(asset.id)) : setPreviewAsset(asset)}
                  style={batchMode && selectedIds.includes(asset.id) ? { border: '2px solid #1890ff' } : {}}
                  cover={
                    <div style={{ position: 'relative' }}>
                      {batchMode && (
                        <Checkbox
                          checked={selectedIds.includes(asset.id)}
                          onChange={(e) => { e.stopPropagation(); handleSelectAsset(asset.id, e.target.checked); }}
                          style={{ position: 'absolute', top: 8, left: 8, zIndex: 10 }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      {asset.type === 'audio' ? (
                        <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                          <SoundOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                        </div>
                      ) : asset.type === 'video' ? (
                        <div style={{ height: 120, position: 'relative', background: '#000' }}>
                          <video
                            src={getAssetUrl(asset.id)}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            muted
                          />
                          <PlayCircleOutlined style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            fontSize: 32,
                            color: '#fff',
                            opacity: 0.8
                          }} />
                        </div>
                      ) : (
                        <Image
                          src={getAssetUrl(asset.id)}
                          alt={asset.name}
                          style={{ height: 120, objectFit: 'cover' }}
                          preview={false}
                          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88P/BfwYABQAB/auX/QAAAABJRU5ErkJggg=="
                        />
                      )}
                    </div>
                  }
                  bodyStyle={{ padding: 8 }}
                  actions={batchMode ? undefined : [
                    <Popconfirm
                      key="delete"
                      title="确定删除此素材？"
                      onConfirm={async () => {
                        await api.delete(`/assets/${asset.id}`);
                        message.success('删除成功');
                        fetchAssets();
                      }}
                    >
                      <DeleteOutlined onClick={(e) => e.stopPropagation()} />
                    </Popconfirm>,
                  ]}
                >
                  <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {asset.name}
                  </div>
                  <div style={{ fontSize: 10, color: '#999', marginBottom: 4 }}>
                    {asset.type === 'audio' ? '音频' : asset.type === 'video' ? '视频' : '图片'}
                  </div>
                  <Select
                    size="small"
                    style={{ width: '100%' }}
                    placeholder="设置分类"
                    allowClear
                    value={asset.categoryId}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(value) => handleUpdateAssetCategory(asset.id, value)}
                    options={categories.map(c => ({ label: c.name, value: c.id }))}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {/* 预览弹窗 */}
      <Modal
        title={previewAsset?.name}
        open={!!previewAsset}
        footer={null}
        onCancel={() => setPreviewAsset(null)}
        width={previewAsset?.type === 'audio' ? 400 : 800}
        destroyOnClose
      >
        {previewAsset?.type === 'audio' && (
          <audio
            src={getAssetUrl(previewAsset.id)}
            controls
            autoPlay
            style={{ width: '100%' }}
          />
        )}
        {previewAsset?.type === 'video' && (
          <video
            src={getAssetUrl(previewAsset.id)}
            controls
            autoPlay
            style={{ width: '100%' }}
          />
        )}
        {previewAsset?.type === 'image' && (
          <img
            src={getAssetUrl(previewAsset.id)}
            alt={previewAsset.name}
            style={{ width: '100%' }}
          />
        )}
      </Modal>

      {/* 分类管理弹窗 */}
      <Modal
        title="管理分类"
        open={showCategoryModal}
        onCancel={() => setShowCategoryModal(false)}
        footer={null}
      >
        <Space style={{ marginBottom: 16, width: '100%' }}>
          <Input
            placeholder="输入分类名称"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onPressEnter={handleCreateCategory}
          />
          <Button type="primary" onClick={handleCreateCategory}>
            添加
          </Button>
        </Space>
        {categories.length === 0 ? (
          <Empty description="暂无分类" />
        ) : (
          <div>
            {categories.map((cat) => (
              <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Space>
                  <FolderOutlined />
                  <span>{cat.name}</span>
                  <Tag>{cat._count?.assets || 0} 个素材</Tag>
                </Space>
                <Popconfirm
                  title="确定删除此分类？素材将变为未分类"
                  onConfirm={() => handleDeleteCategory(cat.id)}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* 批量分类弹窗 */}
      <Modal
        title={`批量设置分类 (${selectedIds.length} 个素材)`}
        open={showBatchCategoryModal}
        onCancel={() => setShowBatchCategoryModal(false)}
        onOk={handleBatchCategory}
      >
        <Select
          style={{ width: '100%' }}
          placeholder="选择分类"
          allowClear
          value={batchCategoryId}
          onChange={setBatchCategoryId}
          options={[
            { label: '取消分类', value: null },
            ...categories.map(c => ({ label: c.name, value: c.id }))
          ]}
        />
      </Modal>

      {/* 批量重命名弹窗 */}
      <Modal
        title={`批量重命名 (${renameList.length} 个素材)`}
        open={showBatchRenameModal}
        onCancel={() => setShowBatchRenameModal(false)}
        onOk={handleBatchRename}
        width={600}
      >
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {renameList.map((item, index) => (
            <div key={item.id} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                原名称: {item.name}
              </div>
              <Input
                value={item.newName}
                onChange={(e) => {
                  const newList = [...renameList];
                  newList[index].newName = e.target.value;
                  setRenameList(newList);
                }}
              />
            </div>
          ))}
        </div>
      </Modal>

      {/* 搜索素材弹窗 */}
      <AssetSearchModal
        open={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSuccess={() => {
          fetchAssets(selectedCategory);
          fetchCategories();
        }}
        categories={categories}
      />

      {/* AI 生成素材弹窗 */}
      <AssetGenerateModal
        open={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onSuccess={() => {
          fetchAssets(selectedCategory);
          fetchCategories();
        }}
      />

      {/* 清理孤立资源弹窗 */}
      <Modal
        title="清理孤立资源"
        open={showCleanupModal}
        onCancel={() => setShowCleanupModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowCleanupModal(false)}>
            取消
          </Button>,
          cleanupData && cleanupData.missing > 0 && (
            <Button
              key="cleanup"
              type="primary"
              danger
              loading={cleanupLoading}
              onClick={handleExecuteCleanup}
            >
              清理 {cleanupData.missing} 条记录
            </Button>
          ),
        ]}
        width={700}
      >
        {cleanupData && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <p>总资源数: <strong>{cleanupData.total}</strong></p>
              <p>文件缺失: <strong style={{ color: cleanupData.missing > 0 ? '#ff4d4f' : '#52c41a' }}>{cleanupData.missing}</strong></p>
            </div>

            {cleanupData.missing > 0 ? (
              <div>
                <p style={{ color: '#ff4d4f', marginBottom: 12 }}>
                  以下资源的文件不存在，点击"清理"将删除这些数据库记录：
                </p>
                <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 4, padding: 12 }}>
                  {cleanupData.assets.map((asset, index) => (
                    <div key={asset.id} style={{ marginBottom: 12, padding: 8, background: '#fff1f0', borderRadius: 4 }}>
                      <div><strong>{index + 1}. {asset.name}</strong></div>
                      <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                        类型: {asset.type} | 创建时间: {new Date(asset.createdAt).toLocaleString('zh-CN')}
                      </div>
                      <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                        路径: {asset.path}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <p style={{ color: '#52c41a', fontSize: 16 }}>✓ 所有资源文件都存在，无需清理</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
