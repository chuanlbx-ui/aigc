import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Tag, Modal, message, Input } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { api } from '../api/client';

interface TopicPage {
  id: string;
  name: string;
  slug: string;
  title: string;
  template: string;
  status: string;
  viewCount: number;
  createdAt: string;
}

export default function TopicPages() {
  const navigate = useNavigate();
  const [pages, setPages] = useState<TopicPage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    setLoading(true);
    try {
      const res = await api.get('/topic-pages');
      setPages(res.data.pages || []);
    } catch (error) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除吗？',
      onOk: async () => {
        try {
          await api.delete(`/topic-pages/${id}`);
          message.success('删除成功');
          loadPages();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '标题', dataIndex: 'title', key: 'title' },
    {
      title: '模板',
      dataIndex: 'template',
      key: 'template',
      render: (t: string) => {
        const labels: Record<string, string> = {
          default: '标准',
          magazine: '杂志',
          minimal: '极简',
        };
        return labels[t] || t;
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'published' ? 'green' : 'default'}>
          {s === 'published' ? '已发布' : '草稿'}
        </Tag>
      ),
    },
    { title: '访问量', dataIndex: 'viewCount', key: 'viewCount' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: TopicPage) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => window.open(`/p/${record.slug}`, '_blank')}
          >
            预览
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/topic-pages/${record.id}/edit`)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>专题页面</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/topic-pages/new/edit')}
        >
          新建页面
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={pages}
        rowKey="id"
        loading={loading}
      />
    </div>
  );
}
