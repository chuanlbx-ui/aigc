import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Row, Col, Input, Button, Table, Tag, Space,
  Popconfirm, message, Tooltip, Image,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, PictureOutlined,
  EditOutlined, DeleteOutlined, DownloadOutlined,
} from '@ant-design/icons';
import { usePosterStore, THEME_OPTIONS, Poster } from '../stores/poster';

export default function Posters() {
  const navigate = useNavigate();
  const { posters, total, loading, fetchPosters, deletePoster } = usePosterStore();

  const [searchText, setSearchText] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchPosters({ theme: selectedTheme || undefined, search: searchText || undefined, page: currentPage });
  }, [selectedTheme, currentPage]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchPosters({ theme: selectedTheme || undefined, search: searchText || undefined, page: 1 });
  };

  const handleDelete = async (id: string) => {
    await deletePoster(id);
    message.success('删除成功');
  };

  const handleDownload = (poster: Poster) => {
    const filename = poster.filePath.split(/[/\\]/).pop() || 'poster.png';
    window.open(`/api/posters/image/${filename}`, '_blank');
  };

  const getThemeLabel = (theme: string) => {
    const option = THEME_OPTIONS.find(t => t.value === theme);
    return option?.label || theme;
  };

  const getThemeColor = (theme: string) => {
    const colors: Record<string, string> = {
      light: 'default',
      dark: 'purple',
      elegant: 'gold',
      tech: 'blue',
      nature: 'green',
      warm: 'orange',
      minimal: 'default',
    };
    return colors[theme] || 'default';
  };

  const columns = [
    {
      title: '缩略图',
      dataIndex: 'filePath',
      key: 'thumbnail',
      width: 100,
      render: (filePath: string) => {
        const filename = filePath.split(/[/\\]/).pop() || '';
        return (
          <Image
            src={`/api/posters/image/${filename}`}
            alt="海报"
            width={60}
            height={80}
            style={{ objectFit: 'cover', borderRadius: 4 }}
            preview={{ mask: '预览' }}
          />
        );
      },
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Poster) => (
        <a onClick={() => navigate(`/posters/${record.id}/edit`)}>
          <PictureOutlined style={{ marginRight: 8 }} />
          {name}
        </a>
      ),
    },
    {
      title: '精句',
      dataIndex: 'quote',
      key: 'quote',
      ellipsis: true,
      width: 200,
    },
    {
      title: '主题',
      dataIndex: 'theme',
      key: 'theme',
      width: 100,
      render: (theme: string) => (
        <Tag color={getThemeColor(theme)}>{getThemeLabel(theme)}</Tag>
      ),
    },
    {
      title: '关联文章',
      dataIndex: 'article',
      key: 'article',
      width: 150,
      render: (article: Poster['article']) => (
        article ? (
          <Tooltip title={article.title}>
            <span style={{ color: '#1890ff', cursor: 'pointer' }}>
              {article.title.length > 10 ? article.title.slice(0, 10) + '...' : article.title}
            </span>
          </Tooltip>
        ) : <span style={{ color: '#999' }}>-</span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: Poster) => (
        <Space>
          <Tooltip title="编辑">
            <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/posters/${record.id}/edit`)} />
          </Tooltip>
          <Tooltip title="下载">
            <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(record)} />
          </Tooltip>
          <Popconfirm title="确定删除此海报？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>海报生成</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/posters/new')}>
          新建海报
        </Button>
      </div>

      <Row gutter={24}>
        <Col span={5}>
          <Card title="主题筛选" size="small">
            {[
              { value: null, label: '全部主题', icon: <PictureOutlined /> },
              ...THEME_OPTIONS,
            ].map(item => (
              <div
                key={item.value || 'all'}
                style={{
                  padding: '8px 0',
                  cursor: 'pointer',
                  color: selectedTheme === item.value ? '#1890ff' : 'inherit',
                  background: selectedTheme === item.value ? '#e6f7ff' : 'transparent',
                  paddingLeft: 8,
                  borderRadius: 4,
                }}
                onClick={() => {
                  setSelectedTheme(item.value);
                  setCurrentPage(1);
                }}
              >
                {'icon' in item && item.icon} {item.label}
              </div>
            ))}
          </Card>
        </Col>

        <Col span={19}>
          <Card>
            <Space style={{ marginBottom: 16 }}>
              <Input
                placeholder="搜索海报名称或精句..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onPressEnter={handleSearch}
                style={{ width: 300 }}
                allowClear
              />
              <Button onClick={handleSearch}>搜索</Button>
            </Space>

            <Table
              columns={columns}
              dataSource={posters}
              loading={loading}
              rowKey="id"
              pagination={{
                current: currentPage,
                pageSize: 20,
                total,
                onChange: (page) => setCurrentPage(page),
                showTotal: (t) => `共 ${t} 张海报`,
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
