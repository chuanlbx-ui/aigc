import { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Table, Space, Popconfirm, message, Tag, Switch, Modal, Card, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined, CheckOutlined, GlobalOutlined, EditOutlined } from '@ant-design/icons';
import { api } from '../../api/client';

interface AIService {
  id: string;
  name: string;
  provider: string;
  providerName: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
  isDefault: boolean;
  isEnabled: boolean;
  supportsWebSearch: boolean;
}

interface AIProvider {
  id: string;
  name: string;
  supportsWebSearch: boolean;
  models: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
}

export default function AIServiceManager() {
  const [services, setServices] = useState<AIService[]>([]);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingService, setEditingService] = useState<AIService | null>(null);
  const [form] = Form.useForm();
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  // 加载服务列表
  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ai/services');
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
      const res = await api.get('/ai/providers');
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
    setSelectedProvider('');
    setEditingService(null);
    setShowAddForm(true);
  };

  // 打开编辑表单
  const handleOpenEdit = (service: AIService) => {
    setEditingService(service);
    setSelectedProvider(service.provider);
    form.setFieldsValue({
      name: service.name,
      provider: service.provider,
      model: service.model,
      apiKey: service.apiKey,
      baseUrl: service.baseUrl,
      isDefault: service.isDefault,
      isEnabled: service.isEnabled,
    });
    setShowAddForm(true);
  };

  // 保存服务
  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      if (editingService) {
        // 编辑模式
        await api.put(`/knowledge/config/services/${editingService.id}`, values);
        message.success('更新成功');
      } else {
        // 添加模式
        await api.post('/knowledge/config/services', values);
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
      await api.delete(`/knowledge/config/services/${id}`);
      message.success('删除成功');
      fetchServices();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 设为默认
  const handleSetDefault = async (id: string) => {
    try {
      await api.put(`/knowledge/config/services/${id}`, { isDefault: true });
      message.success('已设为默认');
      fetchServices();
    } catch (error) {
      message.error('设置失败');
    }
  };

  // 切换启用状态
  const handleToggleEnabled = async (id: string, isEnabled: boolean) => {
    try {
      await api.put(`/knowledge/config/services/${id}`, { isEnabled });
      message.success(isEnabled ? '已启用' : '已禁用');
      fetchServices();
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 获取当前选择的提供商信息
  const currentProvider = providers.find(p => p.id === selectedProvider);

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      width: 150,
    },
    {
      title: '服务商',
      dataIndex: 'providerName',
      width: 120,
      render: (_: any, record: AIService) => (
        <Space size="small">
          <span>{record.providerName}</span>
          {record.supportsWebSearch && (
            <GlobalOutlined style={{ color: '#52c41a' }} title="支持联网搜索" />
          )}
        </Space>
      ),
    },
    {
      title: '模型',
      dataIndex: 'model',
      width: 180,
    },
    {
      title: '状态',
      width: 120,
      render: (_: any, record: AIService) => (
        <Space>
          {record.isDefault && <Tag color="blue">默认</Tag>}
          <Switch
            size="small"
            checked={record.isEnabled}
            onChange={(checked) => handleToggleEnabled(record.id, checked)}
          />
        </Space>
      ),
    },
    {
      title: '操作',
      width: 180,
      render: (_: any, record: AIService) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
          >
            编辑
          </Button>
          {!record.isDefault && (
            <Button
              size="small"
              type="link"
              onClick={() => handleSetDefault(record.id)}
            >
              设为默认
            </Button>
          )}
          <Popconfirm
            title="确定删除此服务？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Alert
        message="AI 服务配置说明"
        description="在这里统一管理所有 AI 服务配置。配置后，可在文章创作、知识库等功能中选择使用。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenAdd}
        >
          添加 AI 服务
        </Button>
      </div>

      <Table
        dataSource={services}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={false}
      />

      {/* 添加/编辑服务弹窗 */}
      <Modal
        title={editingService ? '编辑 AI 服务' : '添加 AI 服务'}
        open={showAddForm}
        onCancel={() => {
          setShowAddForm(false);
          setEditingService(null);
        }}
        onOk={handleSave}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="服务名称"
            rules={[{ required: true, message: '请输入服务名称' }]}
          >
            <Input placeholder="如：我的 GPT-4o" />
          </Form.Item>

          <Form.Item
            name="provider"
            label="服务商"
            rules={[{ required: true, message: '请选择服务商' }]}
          >
            <Select
              placeholder="选择服务商"
              onChange={setSelectedProvider}
              options={providers.map(p => ({
                value: p.id,
                label: (
                  <Space size="small">
                    <span>{p.name}</span>
                    {p.supportsWebSearch && (
                      <Tag color="green" style={{ marginRight: 0, fontSize: 11 }}>
                        <GlobalOutlined /> 联网
                      </Tag>
                    )}
                  </Space>
                ),
              }))}
            />
          </Form.Item>

          <Form.Item
            name="model"
            label="模型"
            rules={[{ required: true, message: '请选择模型' }]}
          >
            <Select
              placeholder="选择模型"
              disabled={!selectedProvider}
              options={currentProvider?.models.map(m => ({
                value: m.id,
                label: m.name,
              })) || []}
            />
          </Form.Item>

          <Form.Item
            name="apiKey"
            label="API Key"
            rules={[{ required: true, message: '请输入 API Key' }]}
          >
            <Input.Password placeholder="输入 API Key" />
          </Form.Item>

          <Form.Item
            name="baseUrl"
            label="自定义 API 地址（可选）"
          >
            <Input placeholder="留空使用默认地址" />
          </Form.Item>

          <Form.Item
            name="isDefault"
            valuePropName="checked"
            label="设为默认服务"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="isEnabled"
            valuePropName="checked"
            label="启用此服务"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
