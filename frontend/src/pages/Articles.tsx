import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Row, Col, Input, Select, Button, Table, Tag, Space, Empty,
  Modal, Form, Popconfirm, message, Tooltip, Pagination
} from 'antd';
import {
  PlusOutlined, SearchOutlined, FolderOutlined,
  EditOutlined, DeleteOutlined, EyeOutlined,
  SendOutlined, StopOutlined, CloudUploadOutlined
} from '@ant-design/icons';
import {
  useArticleStore, Article, ArticleCategory,
  PLATFORM_COLUMNS, PLATFORM_NAMES
} from '../stores/article';
import BatchPublishModal from '../components/Article/BatchPublishModal';
import TemplateSelector from '../components/Article/TemplateSelector';

export default function Articles() {
  const navigate = useNavigate();
  const {
    articles, categories, total, page, pageSize, loading,
    fetchArticles, fetchCategories, createCategory, deleteCategory, deleteArticle,
    publishArticle, unpublishArticle
  } = useArticleStore();

  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showNewArticleModal, setShowNewArticleModal] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [categoryForm] = Form.useForm();
  const [newArticleForm] = Form.useForm();

  useEffect(() => {
    fetchCategories();
    fetchArticles();
  }, []);

  const handleSearch = () => {
    fetchArticles({
      search: searchText,
      categoryId: selectedCategory || undefined,
      status: selectedStatus || undefined,
      platform: selectedPlatform || undefined,
    });
  };

  const handleFilterChange = (type: string, value: string | null) => {
    if (type === 'category') setSelectedCategory(value);
    if (type === 'status') setSelectedStatus(value);
    if (type === 'platform') setSelectedPlatform(value);

    fetchArticles({
      search: searchText,
      categoryId: type === 'category' ? (value || undefined) : (selectedCategory || undefined),
      status: type === 'status' ? (value || undefined) : (selectedStatus || undefined),
      platform: type === 'platform' ? (value || undefined) : (selectedPlatform || undefined),
    });
  };

  const handlePageChange = (newPage: number) => {
    fetchArticles({
      page: newPage,
      categoryId: selectedCategory || undefined,
      status: selectedStatus || undefined,
      platform: selectedPlatform || undefined,
      search: searchText,
    });
  };

  const handleCreateCategory = async () => {
    const values = await categoryForm.validateFields();
    await createCategory(values);
    message.success('分类创建成功');
    categoryForm.resetFields();
    setShowCategoryModal(false);
  };

  const handleDelete = async (id: string) => {
    await deleteArticle(id);
    message.success('删除成功');
  };

  const handlePublish = async (id: string) => {
    await publishArticle(id);
    message.success('发布成功');
  };

  const handleUnpublish = async (id: string) => {
    await unpublishArticle(id);
    message.success('已取消发布');
  };

  // 状态标签颜色
  const getStatusTag = (status: string) => {
    const map: Record<string, { color: string; text: string }> = {
      draft: { color: 'default', text: '草稿' },
      published: { color: 'green', text: '已发布' },
      archived: { color: 'orange', text: '已归档' },
    };
    const item = map[status] || { color: 'default', text: status };
    return <Tag color={item.color}>{item.text}</Tag>;
  };

  // 新建文章
  const handleCreateArticle = async () => {
    const values = await newArticleForm.validateFields();
    const article = await useArticleStore.getState().createArticle(values);
    message.success('文章创建成功');
    newArticleForm.resetFields();
    setShowNewArticleModal(false);
    navigate(`/articles/${article.id}/edit`);
  };

  // 平台变化时重置栏目
  const handlePlatformChange = () => {
    newArticleForm.setFieldValue('column', undefined);
  };

  const selectedFormPlatform = Form.useWatch('platform', newArticleForm);

  return (
    <div style={{ padding: 24 }}>
      {/* 页面标题和操作按钮 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>文章创作</h2>
        <Space>
          <Button icon={<FolderOutlined />} onClick={() => setShowCategoryModal(true)}>
            管理分类
          </Button>
          <Button
            icon={<CloudUploadOutlined />}
            disabled={selectedRowKeys.length === 0}
            onClick={() => setShowPublishModal(true)}
          >
            发布到平台 {selectedRowKeys.length > 0 && `(${selectedRowKeys.length})`}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowNewArticleModal(true)}>
            新建文章
          </Button>
        </Space>
      </div>

      <Row gutter={24}>
        {/* 左侧筛选 */}
        <Col span={5}>
          <Card title="分类" size="small" style={{ marginBottom: 16 }}>
            <div
              style={{ padding: '8px 0', cursor: 'pointer', background: !selectedCategory ? '#e6f7ff' : 'transparent' }}
              onClick={() => handleFilterChange('category', null)}
            >
              <FolderOutlined style={{ marginRight: 8 }} />
              全部文章 ({total})
            </div>
            {categories.map(cat => (
              <div
                key={cat.id}
                style={{
                  padding: '8px 0', cursor: 'pointer',
                  background: selectedCategory === cat.id ? '#e6f7ff' : 'transparent',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
                onClick={() => handleFilterChange('category', cat.id)}
              >
                <span>
                  <FolderOutlined style={{ marginRight: 8, color: cat.color || '#1890ff' }} />
                  {cat.name}
                </span>
                <Tag>{cat._count?.articles || 0}</Tag>
              </div>
            ))}
          </Card>

          {/* 状态筛选 */}
          <Card title="状态" size="small" style={{ marginBottom: 16 }}>
            {[
              { value: null, label: '全部' },
              { value: 'draft', label: '草稿' },
              { value: 'published', label: '已发布' },
              { value: 'archived', label: '已归档' },
            ].map(item => (
              <div
                key={item.value || 'all'}
                style={{
                  padding: '6px 0', cursor: 'pointer',
                  color: selectedStatus === item.value ? '#1890ff' : 'inherit'
                }}
                onClick={() => handleFilterChange('status', item.value)}
              >
                {item.label}
              </div>
            ))}
          </Card>

          {/* 平台筛选 */}
          <Card title="平台" size="small">
            {[
              { value: null, label: '全部平台' },
              ...Object.entries(PLATFORM_NAMES).map(([k, v]) => ({ value: k, label: v }))
            ].map(item => (
              <div
                key={item.value || 'all'}
                style={{
                  padding: '6px 0', cursor: 'pointer',
                  color: selectedPlatform === item.value ? '#1890ff' : 'inherit'
                }}
                onClick={() => handleFilterChange('platform', item.value)}
              >
                {item.label}
              </div>
            ))}
          </Card>
        </Col>

        {/* 右侧文章列表 */}
        <Col span={19}>
          <Card>
            {/* 搜索栏 */}
            <Space style={{ marginBottom: 16 }}>
              <Input
                placeholder="搜索文章..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onPressEnter={handleSearch}
                style={{ width: 300 }}
                allowClear
              />
              <Button onClick={handleSearch}>搜索</Button>
            </Space>

            {/* 文章列表 */}
            <Table
              dataSource={articles}
              rowKey="id"
              loading={loading}
              pagination={false}
              rowSelection={{
                selectedRowKeys,
                onChange: (keys) => setSelectedRowKeys(keys as string[]),
              }}
              columns={[
                {
                  title: '标题',
                  dataIndex: 'title',
                  render: (title, record: Article) => (
                    <a onClick={() => navigate(`/articles/${record.id}/edit`)}>{title}</a>
                  ),
                },
                {
                  title: '平台/栏目',
                  width: 140,
                  render: (_: any, record: Article) => (
                    <Space direction="vertical" size={0}>
                      <Tag color="blue">{PLATFORM_NAMES[record.platform] || record.platform}</Tag>
                      <span style={{ fontSize: 12, color: '#666' }}>{record.column}</span>
                    </Space>
                  ),
                },
                {
                  title: '状态',
                  dataIndex: 'status',
                  width: 90,
                  render: (status: string) => getStatusTag(status),
                },
                {
                  title: '分类',
                  dataIndex: 'category',
                  width: 100,
                  render: (cat: ArticleCategory | null) => cat ? (
                    <Tag color={cat.color || 'blue'}>{cat.name}</Tag>
                  ) : <Tag>未分类</Tag>,
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
                  width: 180,
                  render: (_: any, record: Article) => (
                    <Space>
                      <Tooltip title="编辑">
                        <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/articles/${record.id}/edit`)} />
                      </Tooltip>
                      {record.status === 'published' ? (
                        <Tooltip title="取消发布">
                          <Button size="small" icon={<StopOutlined />} onClick={() => handleUnpublish(record.id)} />
                        </Tooltip>
                      ) : (
                        <Tooltip title="发布">
                          <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => handlePublish(record.id)} />
                        </Tooltip>
                      )}
                      {record.status === 'published' && (
                        <Tooltip title="预览">
                          <Button size="small" icon={<EyeOutlined />} onClick={() => window.open(`/read/${record.slug}`, '_blank')} />
                        </Tooltip>
                      )}
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
                showTotal={(t) => `共 ${t} 篇文章`}
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
                <Tag>{cat._count?.articles || 0} 篇</Tag>
              </Space>
              <Popconfirm title="删除分类后，文章将变为未分类" onConfirm={() => deleteCategory(cat.id)}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </div>
          ))
        )}
      </Modal>

      {/* 新建文章弹窗 */}
      <Modal
        title="新建文章"
        open={showNewArticleModal}
        onCancel={() => { setShowNewArticleModal(false); newArticleForm.resetFields(); }}
        onOk={handleCreateArticle}
        okText="创建"
        width={500}
      >
        <Form form={newArticleForm} layout="vertical">
          <Form.Item name="title" label="文章标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="输入文章标题" />
          </Form.Item>
          <Form.Item name="platform" label="发布平台" rules={[{ required: true, message: '请选择平台' }]}>
            <Select placeholder="选择平台" onChange={handlePlatformChange}>
              {Object.entries(PLATFORM_NAMES).map(([k, v]) => (
                <Select.Option key={k} value={k}>{v}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="column" label="内容栏目" rules={[{ required: true, message: '请选择栏目' }]}>
            <Select placeholder="选择栏目" disabled={!selectedFormPlatform}>
              {selectedFormPlatform && PLATFORM_COLUMNS[selectedFormPlatform]?.map(col => (
                <Select.Option key={col} value={col}>{col}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="categoryId" label="分类">
            <Select placeholder="选择分类（可选）" allowClear>
              {categories.map(c => (
                <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="templateId" label="工作流配置">
            <TemplateSelector
              platform={selectedFormPlatform}
              column={Form.useWatch('column', newArticleForm)}
            />
          </Form.Item>
        </Form>
      </Modal>

      <BatchPublishModal
        open={showPublishModal}
        onClose={() => {
          setShowPublishModal(false);
          setSelectedRowKeys([]);
        }}
        contentType="article"
        contentIds={selectedRowKeys}
      />
    </div>
  );
}
