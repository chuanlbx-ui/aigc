import { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Select, Space,
  Switch, message, Popconfirm, Avatar, Tag
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  WechatOutlined, ApiOutlined, ChromeOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { ExtensionStatus } from '../components/Extension/ExtensionStatus';

interface Platform {
  id: string;
  name: string;
  displayName: string;
  accountName?: string;
  accountAvatar?: string;
  isEnabled: boolean;
  updatedAt: string;
  publishMethod?: string;
  extensionRequired?: boolean;
  apiAvailable?: boolean;
}

interface SupportedPlatform {
  name: string;
  displayName: string;
  supportedContentTypes: string[];
}

export default function PublishPlatforms() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [supported, setSupported] = useState<SupportedPlatform[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchPlatforms();
    fetchSupported();
  }, []);

  const fetchPlatforms = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/publish/platforms');
      setPlatforms(res.data);
    } catch (error) {
      message.error('获取平台列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchSupported = async () => {
    try {
      const res = await axios.get('/api/publish/platforms/supported');
      setSupported(res.data);
    } catch (error) {
      console.error('获取支持平台失败');
    }
  };

  // 继续下一部分...

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = async (id: string) => {
    try {
      const res = await axios.get(`/api/publish/platforms/${id}`);
      setEditingId(id);
      form.setFieldsValue(res.data);
      setModalOpen(true);
    } catch (error) {
      message.error('获取配置失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/publish/platforms/${id}`);
      message.success('删除成功');
      fetchPlatforms();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await axios.patch(`/api/publish/platforms/${id}/toggle`);
      fetchPlatforms();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      await axios.post('/api/publish/platforms', {
        ...values,
        id: editingId,
      });
      message.success(editingId ? '更新成功' : '添加成功');
      setModalOpen(false);
      fetchPlatforms();
    } catch (error: any) {
      message.error(error.response?.data?.error || '保存失败');
    }
  };

  const columns = [
    {
      title: '平台',
      dataIndex: 'displayName',
      render: (text: string, _record: Platform) => (
        <Space>
          <Avatar icon={<WechatOutlined />} style={{ backgroundColor: '#07c160' }} />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '账号',
      dataIndex: 'accountName',
      render: (text: string) => text || '-',
    },
    {
      title: '发布方式',
      dataIndex: 'publishMethod',
      render: (_: any, record: Platform) => {
        const method = record.publishMethod || 'api';
        const apiAvailable = record.apiAvailable !== false;
        const extensionRequired = record.extensionRequired || false;

        return (
          <Space>
            {(method === 'api' || method === 'hybrid') && apiAvailable && (
              <Tag icon={<ApiOutlined />} color="blue">API</Tag>
            )}
            {(method === 'extension' || method === 'hybrid') && (
              <Tag icon={<ChromeOutlined />} color="green">扩展</Tag>
            )}
            {extensionRequired && (
              <Tag color="orange">必须扩展</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'isEnabled',
      render: (enabled: boolean, record: Platform) => (
        <Switch checked={enabled} onChange={() => handleToggle(record.id)} />
      ),
    },
    {
      title: '操作',
      render: (_: any, record: Platform) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record.id)}>
            编辑
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <ExtensionStatus />
      </div>

      <Card
        title="发布平台配置"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加平台
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={platforms}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingId ? '编辑平台' : '添加平台'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="平台"
            rules={[{ required: true, message: '请选择平台' }]}
          >
            <Select
              placeholder="选择平台"
              disabled={!!editingId}
              options={supported.map(p => ({ label: p.displayName, value: p.name }))}
            />
          </Form.Item>
          <Form.Item
            name="appId"
            label="AppID"
            rules={[{ required: true, message: '请输入 AppID' }]}
          >
            <Input placeholder="平台应用 ID" />
          </Form.Item>
          <Form.Item
            name="appSecret"
            label="AppSecret"
            rules={[{ required: !editingId, message: '请输入 AppSecret' }]}
          >
            <Input.Password placeholder={editingId ? '不填则保留原密钥' : '平台应用密钥'} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
