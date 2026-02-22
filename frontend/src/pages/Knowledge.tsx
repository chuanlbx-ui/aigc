import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Row, Col, Input, Select, Button, Table, Tag, Space, Empty,
  Modal, Form, Popconfirm, message, Tooltip, Pagination, Progress,
  Tabs, Upload
} from 'antd';
import {
  PlusOutlined, SearchOutlined, FolderOutlined,
  EditOutlined, DeleteOutlined, PushpinOutlined, ImportOutlined,
  EyeOutlined, SettingOutlined, ExportOutlined, ApartmentOutlined,
  RobotOutlined, InboxOutlined
} from '@ant-design/icons';
import { useKnowledgeStore, KnowledgeDoc, KnowledgeCategory } from '../stores/knowledge';
import { useAuthStore } from '../stores/authStore';
import TagManager from '../components/Knowledge/TagManager';
import AISearchPanel from '../components/Knowledge/AISearchPanel';
import KnowledgeGraph from '../components/Knowledge/KnowledgeGraph';

const { Dragger } = Upload;

// 带认证的 fetch 封装
const authFetch = (url: string, options: RequestInit = {}) => {
  const { accessToken } = useAuthStore.getState();
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
  });
};

export default function Knowledge() {
  const navigate = useNavigate();
  const {
    docs, categories, tags, total, page, pageSize, loading,
    fetchDocs, fetchCategories, fetchTags, createCategory, deleteCategory, deleteDoc, updateDoc,
    batchDelete, batchUpdateCategory, batchUpdateTags
  } = useKnowledgeStore();

  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showAISearchPanel, setShowAISearchPanel] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [showBatchCategoryModal, setShowBatchCategoryModal] = useState(false);
  const [showBatchTagModal, setShowBatchTagModal] = useState(false);
  const [batchCategoryId, setBatchCategoryId] = useState<string | null>(null);
  const [batchTags, setBatchTags] = useState<string[]>([]);
  const [categoryForm] = Form.useForm();
  const [importForm] = Form.useForm();
  // 导入进度状态
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, file: '' });
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  // 文件上传状态
  const [importTab, setImportTab] = useState('directory');
  const [uploadCategoryId, setUploadCategoryId] = useState<string | null>(null);
  const [uploadFileList, setUploadFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  // 导出状态
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  // 图谱状态
  const [showGraphModal, setShowGraphModal] = useState(false);
  // 语义搜索状态
  const [searchMode, setSearchMode] = useState<'keyword' | 'semantic'>('keyword');
  const [semanticResults, setSemanticResults] = useState<any[]>([]);
  const [semanticSearching, setSemanticSearching] = useState(false);
  const [embedStatus, setEmbedStatus] = useState({ total: 0, embedded: 0, pending: 0 });
  const [embedding, setEmbedding] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchTags();
    fetchDocs();
    fetchEmbedStatus();
  }, []);

  // 获取向量化状态
  const fetchEmbedStatus = async () => {
    try {
      const res = await authFetch('/api/knowledge/embed/status');
      const data = await res.json();
      if (res.ok) setEmbedStatus(data);
    } catch (e) { /* ignore */ }
  };

  // 语义搜索
  const handleSemanticSearch = async () => {
    if (!searchText.trim()) return;
    setSemanticSearching(true);
    try {
      const res = await authFetch(`/api/knowledge/search/semantic?q=${encodeURIComponent(searchText)}`);
      const data = await res.json();
      if (res.ok) {
        setSemanticResults(data.results);
      } else {
        message.error(data.error || '语义搜索失败');
      }
    } catch (e) {
      message.error('语义搜索请求失败');
    } finally {
      setSemanticSearching(false);
    }
  };

  // 批量向量化
  const handleBatchEmbed = async () => {
    setEmbedding(true);
    try {
      const res = await authFetch('/api/knowledge/embed/batch', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        message.success(`成功向量化 ${data.embedded} 篇文档`);
        fetchEmbedStatus();
      } else {
        message.error(data.error || '向量化失败');
      }
    } catch (e) {
      message.error('向量化请求失败');
    } finally {
      setEmbedding(false);
    }
  };

  const handleSearch = () => {
    fetchDocs({ search: searchText, categoryId: selectedCategory || undefined, tag: selectedTag || undefined });
  };

  const handleCategoryChange = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    fetchDocs({ categoryId: categoryId || undefined, tag: selectedTag || undefined, search: searchText });
  };

  const handleTagChange = (tag: string | null) => {
    setSelectedTag(tag);
    fetchDocs({ tag: tag || undefined, categoryId: selectedCategory || undefined, search: searchText });
  };

  const handlePageChange = (newPage: number) => {
    fetchDocs({ page: newPage, categoryId: selectedCategory || undefined, tag: selectedTag || undefined, search: searchText });
  };

  const handleCreateCategory = async () => {
    const values = await categoryForm.validateFields();
    await createCategory(values);
    message.success('分类创建成功');
    categoryForm.resetFields();
    setShowCategoryModal(false);
  };

  const handleTogglePin = async (doc: KnowledgeDoc) => {
    await updateDoc(doc.id, { isPinned: !doc.isPinned } as any);
    message.success(doc.isPinned ? '已取消置顶' : '已置顶');
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(id);
    message.success('删除成功');
  };

  // 批量操作
  const handleBatchDelete = async () => {
    await batchDelete(selectedRowKeys);
    message.success(`成功删除 ${selectedRowKeys.length} 篇文档`);
    setSelectedRowKeys([]);
  };

  const handleBatchCategory = async () => {
    await batchUpdateCategory(selectedRowKeys, batchCategoryId);
    message.success(`成功修改 ${selectedRowKeys.length} 篇文档的分类`);
    setSelectedRowKeys([]);
    setShowBatchCategoryModal(false);
  };

  const handleBatchTags = async (mode: 'add' | 'replace') => {
    await batchUpdateTags(selectedRowKeys, batchTags, mode);
    message.success(`成功修改 ${selectedRowKeys.length} 篇文档的标签`);
    setSelectedRowKeys([]);
    setShowBatchTagModal(false);
    setBatchTags([]);
  };

  // 流式导入处理
  const handleImportWithProgress = async () => {
    const values = await importForm.validateFields();
    setImporting(true);
    setImportProgress({ current: 0, total: 0, file: '' });
    setImportResult(null);

    try {
      const { accessToken } = useAuthStore.getState();
      const response = await fetch('/api/knowledge/import/directory-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ dirPath: values.dirPath, categoryId: values.categoryId }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('无法读取响应');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'progress') {
            setImportProgress({ current: data.current, total: data.total, file: data.file });
          } else if (data.type === 'complete') {
            setImportResult({ success: data.imported, failed: data.errors });
          } else if (data.type === 'error') {
            message.error(data.message);
          }
        }
      }

      fetchDocs();
      fetchCategories();
    } catch (error) {
      message.error('导入失败');
    } finally {
      setImporting(false);
    }
  };

  // 文件上传处理
  const handleUpload = async () => {
    if (uploadFileList.length === 0) {
      message.warning('请选择要上传的文件');
      return;
    }

    const { accessToken } = useAuthStore.getState();
    if (!accessToken) {
      message.error('请先登录');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    uploadFileList.forEach(file => {
      formData.append('files', file.originFileObj);
    });
    if (uploadCategoryId) {
      formData.append('categoryId', uploadCategoryId);
    }

    try {
      // 直接请求后端，绕过 Vite 代理（解决大文件上传问题）
      const response = await fetch('http://localhost:3001/api/knowledge/import/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        message.success(`成功导入 ${data.count} 个文件`);
        setUploadFileList([]);
        setShowImportModal(false);
        fetchDocs();
      } else {
        message.error(data.error || '上传失败');
      }
    } catch (error) {
      message.error('上传请求失败');
    } finally {
      setUploading(false);
    }
  };

  // 解析标签
  const parseTags = (tagsStr: string): string[] => {
    try {
      const parsed = JSON.parse(tagsStr || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // 导出知识库
  const handleExport = async (obsidian: boolean) => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ obsidian: String(obsidian) });
      if (selectedCategory) params.append('scope', 'category');
      if (selectedCategory) params.append('id', selectedCategory);

      const response = await authFetch(`/api/knowledge/export?${params}`);
      if (!response.ok) throw new Error('导出失败');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = obsidian ? 'obsidian-vault.zip' : 'knowledge-export.zip';
      a.click();
      URL.revokeObjectURL(url);
      message.success('导出成功');
      setShowExportModal(false);
    } catch (error) {
      message.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {/* 页面标题和操作按钮 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>知识库</h2>
        <Space>
          <Button icon={<RobotOutlined />} onClick={() => setShowAISearchPanel(true)}>
            AI 搜索
          </Button>
          <Tooltip title="前往系统设置配置 AI 服务">
            <Button icon={<SettingOutlined />} onClick={() => navigate('/settings')}>
              AI 服务
            </Button>
          </Tooltip>
          <Button icon={<ImportOutlined />} onClick={() => setShowImportModal(true)}>
            导入
          </Button>
          <Button icon={<ExportOutlined />} onClick={() => setShowExportModal(true)}>
            导出
          </Button>
          <Button icon={<ApartmentOutlined />} onClick={() => setShowGraphModal(true)}>
            知识图谱
          </Button>
          <Button icon={<FolderOutlined />} onClick={() => setShowCategoryModal(true)}>
            管理分类
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/knowledge/new')}>
            新建文档
          </Button>
        </Space>
      </div>

      <Row gutter={24}>
        {/* 左侧分类树 */}
        <Col span={5}>
          <Card title="分类" size="small" style={{ marginBottom: 16 }}>
            <div
              style={{ padding: '8px 0', cursor: 'pointer', background: !selectedCategory ? '#e6f7ff' : 'transparent' }}
              onClick={() => handleCategoryChange(null)}
            >
              <FolderOutlined style={{ marginRight: 8 }} />
              全部文档 ({total})
            </div>
            <div
              style={{ padding: '8px 0', cursor: 'pointer', background: selectedCategory === 'uncategorized' ? '#e6f7ff' : 'transparent' }}
              onClick={() => handleCategoryChange('uncategorized')}
            >
              <FolderOutlined style={{ marginRight: 8 }} />
              未分类
            </div>
            {categories.map(cat => (
              <div
                key={cat.id}
                style={{ padding: '8px 0', cursor: 'pointer', background: selectedCategory === cat.id ? '#e6f7ff' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => handleCategoryChange(cat.id)}
              >
                <span>
                  <FolderOutlined style={{ marginRight: 8, color: cat.color || '#1890ff' }} />
                  {cat.name}
                </span>
                <Tag>{cat._count?.docs || 0}</Tag>
              </div>
            ))}
          </Card>

          {/* 标签云 */}
          <Card
            title="标签"
            size="small"
            extra={
              <Button
                type="link"
                size="small"
                onClick={() => setShowTagManager(true)}
              >
                管理
              </Button>
            }
          >
            {tags.length === 0 ? (
              <Empty description="暂无标签" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {tags.slice(0, 20).map(tag => (
                  <Tag
                    key={tag.name}
                    color={selectedTag === tag.name ? 'blue' : 'default'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleTagChange(selectedTag === tag.name ? null : tag.name)}
                  >
                    {tag.name} ({tag.count})
                  </Tag>
                ))}
              </div>
            )}
          </Card>
        </Col>

        {/* 右侧文档列表 */}
        <Col span={19}>
          <Card>
            {/* 搜索栏 */}
            <Space style={{ marginBottom: 16 }} wrap>
              <Select
                value={searchMode}
                onChange={setSearchMode}
                style={{ width: 120 }}
                options={[
                  { label: '关键词搜索', value: 'keyword' },
                  { label: '语义搜索', value: 'semantic' },
                ]}
              />
              <Input
                placeholder={searchMode === 'semantic' ? '输入问题或描述...' : '搜索文档...'}
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onPressEnter={searchMode === 'semantic' ? handleSemanticSearch : handleSearch}
                style={{ width: 300 }}
                allowClear
              />
              <Button
                onClick={searchMode === 'semantic' ? handleSemanticSearch : handleSearch}
                loading={semanticSearching}
              >
                搜索
              </Button>
              {embedStatus.pending > 0 && (
                <Button onClick={handleBatchEmbed} loading={embedding}>
                  向量化 ({embedStatus.embedded}/{embedStatus.total})
                </Button>
              )}
            </Space>

            {/* 批量操作工具栏 */}
            {selectedRowKeys.length > 0 && (
              <div style={{ marginBottom: 16, padding: '8px 16px', background: '#e6f7ff', borderRadius: 4 }}>
                <Space>
                  <span>已选择 {selectedRowKeys.length} 项</span>
                  <Button size="small" onClick={() => setShowBatchCategoryModal(true)}>
                    修改分类
                  </Button>
                  <Button size="small" onClick={() => setShowBatchTagModal(true)}>
                    修改标签
                  </Button>
                  <Popconfirm
                    title={`确定删除选中的 ${selectedRowKeys.length} 篇文档？`}
                    onConfirm={handleBatchDelete}
                  >
                    <Button size="small" danger>批量删除</Button>
                  </Popconfirm>
                  <Button size="small" onClick={() => setSelectedRowKeys([])}>取消选择</Button>
                </Space>
              </div>
            )}

            {/* 语义搜索结果 */}
            {searchMode === 'semantic' && semanticResults.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, color: '#666' }}>
                  语义搜索结果 ({semanticResults.length} 条)
                </div>
                {semanticResults.map((item: any) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '12px 16px',
                      marginBottom: 8,
                      background: '#fafafa',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate(`/knowledge/${item.id}`)}
                  >
                    <div style={{ fontWeight: 500 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                      相似度: {(item.similarity * 100).toFixed(1)}%
                      {item.summary && ` · ${item.summary.substring(0, 100)}...`}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 文档列表 */}
            <Table
              dataSource={docs}
              rowSelection={{
                selectedRowKeys,
                onChange: (keys) => setSelectedRowKeys(keys as string[]),
              }}
              rowKey="id"
              loading={loading}
              pagination={false}
              columns={[
                {
                  title: '标题',
                  dataIndex: 'title',
                  render: (title, record: KnowledgeDoc) => (
                    <Space>
                      {record.isPinned && <PushpinOutlined style={{ color: '#faad14' }} />}
                      <a onClick={() => navigate(`/knowledge/${record.id}`)}>{title}</a>
                    </Space>
                  ),
                },
                {
                  title: '分类',
                  dataIndex: 'category',
                  width: 120,
                  render: (cat: KnowledgeCategory | null) => cat ? (
                    <Tag color={cat.color || 'blue'}>{cat.name}</Tag>
                  ) : <Tag>未分类</Tag>,
                },
                {
                  title: '标签',
                  dataIndex: 'tags',
                  width: 200,
                  render: (tagsStr: string) => {
                    const tagList = parseTags(tagsStr);
                    return tagList.slice(0, 3).map(t => <Tag key={t}>{t}</Tag>);
                  },
                },
                {
                  title: '字数',
                  dataIndex: 'wordCount',
                  width: 80,
                  render: (count: number) => `${count}字`,
                },
                {
                  title: '更新时间',
                  dataIndex: 'updatedAt',
                  width: 160,
                  render: (date: string) => new Date(date).toLocaleString('zh-CN'),
                },
                {
                  title: '操作',
                  width: 150,
                  render: (_: any, record: KnowledgeDoc) => (
                    <Space>
                      <Tooltip title="查看">
                        <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/knowledge/${record.id}`)} />
                      </Tooltip>
                      <Tooltip title="编辑">
                        <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/knowledge/${record.id}/edit`)} />
                      </Tooltip>
                      <Tooltip title={record.isPinned ? '取消置顶' : '置顶'}>
                        <Button size="small" icon={<PushpinOutlined />} onClick={() => handleTogglePin(record)} />
                      </Tooltip>
                      <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
            />

            {/* 分页 */}
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                onChange={handlePageChange}
                showTotal={(t) => `共 ${t} 篇文档`}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* 分类管理弹窗 */}
      <Modal
        title="管理分类"
        open={showCategoryModal}
        onCancel={() => setShowCategoryModal(false)}
        footer={null}
        width={500}
      >
        <Form form={categoryForm} layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item name="name" rules={[{ required: true, message: '请输入分类名称' }]}>
            <Input placeholder="分类名称" />
          </Form.Item>
          <Form.Item name="color">
            <Input type="color" style={{ width: 50 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={handleCreateCategory}>添加</Button>
          </Form.Item>
        </Form>
        {categories.length === 0 ? (
          <Empty description="暂无分类" />
        ) : (
          categories.map(cat => (
            <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
              <Space>
                <FolderOutlined style={{ color: cat.color || '#1890ff' }} />
                <span>{cat.name}</span>
                <Tag>{cat._count?.docs || 0} 篇</Tag>
              </Space>
              <Popconfirm title="删除分类后，文档将变为未分类" onConfirm={() => deleteCategory(cat.id)}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </div>
          ))
        )}
      </Modal>

      {/* 导入弹窗 */}
      <Modal
        title="导入文档"
        open={showImportModal}
        onCancel={() => {
          if (!importing && !uploading) {
            setShowImportModal(false);
            setImportResult(null);
            importForm.resetFields();
            setUploadFileList([]);
          }
        }}
        footer={null}
        closable={!importing && !uploading}
        maskClosable={!importing && !uploading}
        width={600}
      >
        {!importing && !importResult && (
          <Tabs activeKey={importTab} onChange={setImportTab} items={[
            {
              key: 'directory',
              label: '本地目录',
              children: (
                <Form form={importForm} layout="vertical">
                  <Form.Item name="dirPath" label="目录路径" rules={[{ required: true }]}>
                    <Input placeholder="输入本地目录路径，如 D:\docs" />
                  </Form.Item>
                  <Form.Item name="categoryId" label="导入到分类">
                    <Select
                      placeholder="选择分类（可选）"
                      allowClear
                      options={categories.map(c => ({ label: c.name, value: c.id }))}
                    />
                  </Form.Item>
                  <Button type="primary" onClick={handleImportWithProgress} block>
                    开始导入
                  </Button>
                </Form>
              ),
            },
            {
              key: 'upload',
              label: '上传文件',
              children: (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Dragger
                    multiple
                    accept=".md,.txt,.pdf"
                    fileList={uploadFileList}
                    onChange={({ fileList }) => setUploadFileList(fileList)}
                    beforeUpload={() => false}
                  >
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                    <p className="ant-upload-hint">支持 .md, .txt, .pdf 文件</p>
                  </Dragger>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="选择分类（可选）"
                    allowClear
                    value={uploadCategoryId}
                    onChange={setUploadCategoryId}
                    options={categories.map(c => ({ label: c.name, value: c.id }))}
                  />
                  <Button
                    type="primary"
                    onClick={handleUpload}
                    loading={uploading}
                    disabled={uploadFileList.length === 0}
                    block
                  >
                    开始上传
                  </Button>
                </Space>
              ),
            },
          ]} />
        )}

        {importing && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Progress
              percent={importProgress.total > 0 ? Math.round((importProgress.current / importProgress.total) * 100) : 0}
              status="active"
            />
            <p style={{ marginTop: 16 }}>
              正在导入: {importProgress.current} / {importProgress.total}
            </p>
            <p style={{ color: '#666', fontSize: 12 }}>
              {importProgress.file}
            </p>
          </div>
        )}

        {importResult && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Progress
              type="circle"
              percent={100}
              status={importResult.failed > 0 ? 'exception' : 'success'}
            />
            <p style={{ marginTop: 16, fontSize: 16 }}>
              导入完成
            </p>
            <p>
              成功: <span style={{ color: '#52c41a' }}>{importResult.success}</span> 个，
              失败: <span style={{ color: '#ff4d4f' }}>{importResult.failed}</span> 个
            </p>
            <Button onClick={() => {
              setImportResult(null);
              setShowImportModal(false);
            }}>
              关闭
            </Button>
          </div>
        )}
      </Modal>

      {/* 标签管理弹窗 */}
      <TagManager
        open={showTagManager}
        onCancel={() => setShowTagManager(false)}
      />

      {/* 批量修改分类弹窗 */}
      <Modal
        title="批量修改分类"
        open={showBatchCategoryModal}
        onCancel={() => setShowBatchCategoryModal(false)}
        onOk={handleBatchCategory}
      >
        <p>将选中的 {selectedRowKeys.length} 篇文档移动到：</p>
        <Select
          style={{ width: '100%' }}
          placeholder="选择分类"
          allowClear
          value={batchCategoryId}
          onChange={setBatchCategoryId}
          options={[
            { label: '未分类', value: '' },
            ...categories.map(c => ({ label: c.name, value: c.id }))
          ]}
        />
      </Modal>

      {/* 批量修改标签弹窗 */}
      <Modal
        title="批量修改标签"
        open={showBatchTagModal}
        onCancel={() => { setShowBatchTagModal(false); setBatchTags([]); }}
        footer={[
          <Button key="cancel" onClick={() => { setShowBatchTagModal(false); setBatchTags([]); }}>
            取消
          </Button>,
          <Button key="add" type="primary" onClick={() => handleBatchTags('add')}>
            追加标签
          </Button>,
          <Button key="replace" onClick={() => handleBatchTags('replace')}>
            替换标签
          </Button>,
        ]}
      >
        <p>为选中的 {selectedRowKeys.length} 篇文档设置标签：</p>
        <Select
          mode="tags"
          style={{ width: '100%' }}
          placeholder="输入标签，按回车添加"
          value={batchTags}
          onChange={setBatchTags}
        />
      </Modal>

      {/* AI 搜索面板 */}
      <AISearchPanel
        open={showAISearchPanel}
        onCancel={() => setShowAISearchPanel(false)}
      />

      {/* 导出弹窗 */}
      <Modal
        title="导出知识库"
        open={showExportModal}
        onCancel={() => setShowExportModal(false)}
        footer={null}
      >
        <p style={{ marginBottom: 16 }}>
          {selectedCategory ? '导出当前分类下的文档' : '导出全部文档'}
        </p>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            block
            loading={exporting}
            onClick={() => handleExport(false)}
          >
            导出为 ZIP（含元数据）
          </Button>
          <Button
            block
            type="primary"
            loading={exporting}
            onClick={() => handleExport(true)}
          >
            导出为 Obsidian Vault
          </Button>
        </Space>
        <p style={{ marginTop: 16, color: '#888', fontSize: 12 }}>
          Obsidian 格式会添加 frontmatter 并按分类组织文件夹
        </p>
      </Modal>

      {/* 知识图谱弹窗 */}
      <KnowledgeGraph
        open={showGraphModal}
        onCancel={() => setShowGraphModal(false)}
        onNodeClick={(docId) => navigate(`/knowledge/${docId}`)}
      />
    </div>
  );
}
