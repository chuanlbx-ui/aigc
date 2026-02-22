import { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, Select, message, DatePicker } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined, CopyOutlined } from '@ant-design/icons';
import { api } from '../api/client';

interface ApiToken {
  id: string;
  name: string;
  token: string;
  permissions: string;
  rateLimit: number;
  isEnabled: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
}

export default function ApiTokens() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api-tokens');
      setTokens(res.data);
    } catch (error) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await api.post('/api-tokens', values);
      message.success('创建成功');
      setModalOpen(false);
      form.resetFields();
      loadTokens();
    } catch (error) {
      message.error('创建失败');
    }
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除吗？',
      onOk: async () => {
        try {
          await api.delete(`/api-tokens/${id}`);
          message.success('删除成功');
          loadTokens();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleRegenerate = async (id: string) => {
    Modal.confirm({
      title: '重新生成令牌',
      content: '重新生成后旧令牌将失效，确定要继续吗？',
      onOk: async () => {
        try {
          const res = await api.post(`/api-tokens/${id}/regenerate`);
          Modal.success({
            title: '新令牌已生成',
            content: <code style={{ wordBreak: 'break-all' }}>{res.data.token}</code>,
          });
          loadTokens();
        } catch (error) {
          message.error('生成失败');
        }
      },
    });
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    message.success('已复制到剪贴板');
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '令牌',
      dataIndex: 'token',
      key: 'token',
      render: (t: string) => (
        <Space>
          <code>{t}</code>
          <Button size="small" icon={<CopyOutlined />} onClick={() => copyToken(t)} />
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '禁用'}</Tag>,
    },
    { title: '调用次数', dataIndex: 'usageCount', key: 'usageCount' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ApiToken) => (
        <Space>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => handleRegenerate(record.id)}>
            重新生成
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>API 令牌管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          创建令牌
        </Button>
      </div>

      <Table columns={columns} dataSource={tokens} rowKey="id" loading={loading} />

      <Modal
        title="创建 API 令牌"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => setModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="令牌名称" rules={[{ required: true }]}>
            <Input placeholder="如：小程序、App" />
          </Form.Item>
          <Form.Item name="permissions" label="权限" initialValue={['read']}>
            <Select
              mode="multiple"
              options={[
                { value: 'read', label: '读取' },
                { value: 'write', label: '写入' },
              ]}
            />
          </Form.Item>
          <Form.Item name="rateLimit" label="每小时请求限制" initialValue={1000}>
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
