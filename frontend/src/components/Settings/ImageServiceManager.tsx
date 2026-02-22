import { useState, useEffect } from 'react';
import {
  Form, Input, Select, Button, Table, Space,
  Popconfirm, message, Tag, Switch, Modal, Card, Alert
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { api } from '../../api/client';

interface ImageService {
  id: string;
  name: string;
  provider: string;
  providerName: string;
  providerType: string;
  isEnabled: boolean;
  priority: number;
  hasApiKey: boolean;
}

interface ImageProvider {
  id: string;
  name: string;
  description: string;
  type: string;
}

export default function ImageServiceManager() {
  const [services, setServices] = useState<ImageService[]>([]);
  const [providers, setProviders] = useState<ImageProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingService, setEditingService] = useState<ImageService | null>(null);
  const [form] = Form.useForm();

  // 加载服务列表
  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/image-services');
      setServices(res.data.services || []);
    } catch (error) {
      message.error('加载服务列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载提供商列表
  const fetchProviders = async () => {
    try {
      const res = await api.get('/image-services/providers');
      setProviders(res.data.providers || []);
    } catch (error) {
      message.error('加载提供商列表失败');
    }
  };

  useEffect(() => {
    fetchServices();
    fetchProviders();
  }, []);

  // 打开添加表单
  const handleOpenAdd = () => {
    form.resetFields();
    setEditingService(null);
    setShowAddForm(true);
  };

  // 打开编辑表单
  const handleOpenEdit = (service: ImageService) => {
    setEditingService(service);
    form.setFieldsValue({
      name: service.name,
      provider: service.provider,
      priority: service.priority,
      isEnabled: service.isEnabled,
    });
    setShowAddForm(true);
  };

  // 保存服务
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingService) {
        await api.put(`/image-services/${editingService.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/image-services', values);
        message.success('添加成功');
      }
      form.resetFields();
      setShowAddForm(false);
      setEditingService(null);
      fetchServices();
    } catch (error: any) {
      message.error(error.response?.data?.error || '保存失败');
    }
  };

  // 删除服务
  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/image-services/${id}`);
      message.success('删除成功');
      fetchServices();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 切换启用状态
  const handleToggleEnabled = async (id: string, isEnabled: boolean) => {
    try {
      await api.put(`/image-services/${id}`, { isEnabled });
      message.success(isEnabled ? '已启用' : '已禁用');
      fetchServices();
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 表格列定义
  const columns = [
    { title: '名称', dataIndex: 'name', width: 150 },
    {
      title: '服务商',
      dataIndex: 'providerName',
      width: 150,
      render: (_: any, record: ImageService) => (
        <Space>
          <span>{record.providerName}</span>
          <Tag color={record.providerType === 'ai' ? 'purple' : 'green'}>
            {record.providerType === 'ai' ? 'AI生成' : '图库'}
          </Tag>
        </Space>
      ),
    },
    { title: '优先级', dataIndex: 'priority', width: 80 },
    {
      title: '状态',
      width: 100,
      render: (_: any, record: ImageService) => (
        <Switch
          size="small"
          checked={record.isEnabled}
          onChange={(checked) => handleToggleEnabled(record.id, checked)}
        />
      ),
    },
    {
      title: '操作',
      width: 150,
      render: (_: any, record: ImageService) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Alert
        message="图片服务配置说明"
        description="配置图片库和 AI 图片生成服务的 API Key。智能配图功能将按优先级使用这些服务。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
          添加图片服务
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={services}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="small"
      />

      <Modal
        title={editingService ? '编辑图片服务' : '添加图片服务'}
        open={showAddForm}
        onOk={handleSave}
        onCancel={() => {
          setShowAddForm(false);
          setEditingService(null);
          form.resetFields();
        }}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="服务名称"
            rules={[{ required: true, message: '请输入服务名称' }]}
          >
            <Input placeholder="例如：我的 Unsplash" />
          </Form.Item>

          <Form.Item
            name="provider"
            label="服务商"
            rules={[{ required: true, message: '请选择服务商' }]}
          >
            <Select
              placeholder="选择服务商"
              disabled={!!editingService}
              options={providers.map(p => ({
                value: p.id,
                label: `${p.name} - ${p.description}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="apiKey"
            label="API Key"
            rules={[{ required: !editingService, message: '请输入 API Key' }]}
            extra={editingService ? '留空表示不修改' : undefined}
          >
            <Input.Password placeholder="输入 API Key" />
          </Form.Item>

          <Form.Item
            name="priority"
            label="优先级"
            initialValue={0}
            extra="数字越大优先级越高，优先使用高优先级的服务"
          >
            <Input type="number" placeholder="0" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
