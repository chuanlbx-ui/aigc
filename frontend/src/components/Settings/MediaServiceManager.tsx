/**
 * 统一媒体服务管理组件
 * 管理所有类型的媒体服务配置
 */

import { useState, useEffect } from 'react';
import {
  Card, Tabs, Table, Button, Modal, Form, Input, Select,
  Switch, Space, Tag, message, Popconfirm, Tooltip, InputNumber,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined,
  ApiOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { api } from '../../api/client';

// 服务类型定义
type ServiceType =
  | 'ai_chat'
  | 'image_search'
  | 'image_generate'
  | 'video_generate'
  | 'video_search'
  | 'audio_search'
  | 'tts'
  | 'digital_human';

// 服务类型元数据
const SERVICE_TYPE_META: Record<ServiceType, { label: string; color: string }> = {
  ai_chat: { label: 'AI 大模型', color: 'blue' },
  image_search: { label: '图片搜索', color: 'green' },
  image_generate: { label: 'AI 图片生成', color: 'purple' },
  video_generate: { label: 'AI 视频生成', color: 'magenta' },
  video_search: { label: '视频搜索', color: 'cyan' },
  audio_search: { label: '音频搜索', color: 'orange' },
  tts: { label: '语音合成', color: 'geekblue' },
  digital_human: { label: '数字人', color: 'volcano' },
};

// 服务配置接口
interface MediaServiceConfig {
  id: string;
  name: string;
  provider: string;
  serviceType: ServiceType;
  modelId?: string;
  modelVersion?: string;
  apiKey?: string;
  apiEndpoint?: string;
  apiVersion?: string;
  isEnabled: boolean;
  priority: number;
  config: Record<string, any>;
}

// 服务商定义
interface ProviderDefinition {
  id: string;
  name: string;
  description?: string;
  website?: string;
  requiresApiKey: boolean;
  supportsCustomEndpoint?: boolean;
  models?: { id: string; name: string; description?: string; isDefault?: boolean }[];
}

// 服务类型定义
interface ServiceTypeDefinition {
  id: ServiceType;
  name: string;
  description: string;
  icon: string;
  providers: ProviderDefinition[];
}

export default function MediaServiceManager() {
  const [activeTab, setActiveTab] = useState<ServiceType>('ai_chat');
  const [configs, setConfigs] = useState<MediaServiceConfig[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeDefinition[]>([]);
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<MediaServiceConfig | null>(null);
  const [form] = Form.useForm();

  // 加载服务类型定义和数量统计
  useEffect(() => {
    loadServiceTypes();
    loadTypeCounts();
  }, []);

  // 加载配置列表
  useEffect(() => {
    loadConfigs();
  }, [activeTab]);

  const loadServiceTypes = async () => {
    try {
      const res = await api.get('/media-services/types');
      setServiceTypes(res.data.types || []);
    } catch (error) {
      console.error('加载服务类型失败:', error);
    }
  };

  // 加载各类型的数量统计
  const loadTypeCounts = async () => {
    try {
      const res = await api.get('/media-services');
      const allConfigs = res.data.configs || [];
      const counts: Record<string, number> = {};
      allConfigs.forEach((c: MediaServiceConfig) => {
        counts[c.serviceType] = (counts[c.serviceType] || 0) + 1;
      });
      setTypeCounts(counts);
    } catch (error) {
      console.error('加载数量统计失败:', error);
    }
  };

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/media-services', {
        params: { type: activeTab },
      });
      setConfigs(res.data.configs || []);
    } catch (error) {
      console.error('加载配置失败:', error);
      message.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取当前服务类型的服务商列表
  const getCurrentProviders = (): ProviderDefinition[] => {
    const typeDef = serviceTypes.find(t => t.id === activeTab);
    return typeDef?.providers || [];
  };

  // 打开新建/编辑弹窗
  const openModal = (config?: MediaServiceConfig) => {
    setEditingConfig(config || null);
    if (config) {
      form.setFieldsValue({
        ...config,
        config: JSON.stringify(config.config || {}, null, 2),
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ serviceType: activeTab, isEnabled: true, priority: 0 });
    }
    setModalVisible(true);
  };

  // 保存配置
  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      // 处理 config 字段
      let configObj = {};
      if (values.config) {
        if (typeof values.config === 'string') {
          // 如果是字符串，尝试解析 JSON
          try {
            configObj = JSON.parse(values.config);
          } catch {
            message.error('扩展配置 JSON 格式错误');
            return;
          }
        } else if (typeof values.config === 'object') {
          // 如果已经是对象（来自嵌套表单字段），直接使用
          configObj = values.config;
        }
      }

      const data = { ...values, config: configObj };

      if (editingConfig) {
        await api.put(`/media-services/${editingConfig.id}`, data);
        message.success('更新成功');
      } else {
        await api.post('/media-services', data);
        message.success('创建成功');
      }

      setModalVisible(false);
      loadConfigs();
      loadTypeCounts(); // 刷新数量统计
    } catch (error: any) {
      message.error(error.response?.data?.error || '保存失败');
    }
  };

  // 删除配置
  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/media-services/${id}`);
      message.success('删除成功');
      loadConfigs();
      loadTypeCounts(); // 刷新数量统计
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 切换启用状态
  const handleToggle = async (id: string) => {
    try {
      await api.post(`/media-services/${id}/toggle`);
      loadConfigs();
    } catch (error) {
      message.error('切换状态失败');
    }
  };

  // 测试连接
  const handleTest = async (id: string) => {
    try {
      const res = await api.post(`/media-services/${id}/test`);
      if (res.data.success) {
        message.success(`连接成功 (${res.data.latency}ms)`);
      } else {
        message.error(res.data.message || '连接失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '测试失败');
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: MediaServiceConfig) => (
        <Space>
          <span>{name}</span>
          {record.modelId && (
            <Tag color="default">{record.modelId}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '服务商',
      dataIndex: 'provider',
      key: 'provider',
      render: (provider: string) => {
        const providerDef = getCurrentProviders().find(p => p.id === provider);
        return providerDef?.name || provider;
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      sorter: (a: MediaServiceConfig, b: MediaServiceConfig) => b.priority - a.priority,
    },
    {
      title: '状态',
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      width: 80,
      render: (enabled: boolean, record: MediaServiceConfig) => (
        <Switch
          checked={enabled}
          onChange={() => handleToggle(record.id)}
          size="small"
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: any, record: MediaServiceConfig) => (
        <Space size="small">
          <Tooltip title="测试连接">
            <Button
              type="text"
              size="small"
              icon={<ApiOutlined />}
              onClick={() => handleTest(record.id)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定删除此配置？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Tooltip title="删除">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 构建 Tab 项
  const tabItems = Object.entries(SERVICE_TYPE_META).map(([key, meta]) => ({
    key,
    label: (
      <Space>
        <Tag color={meta.color} style={{ marginRight: 0 }}>{meta.label}</Tag>
        <span style={{ fontSize: 12, color: '#999' }}>
          ({typeCounts[key] || 0})
        </span>
      </Space>
    ),
  }));

  return (
    <Card
      title="媒体服务配置"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadConfigs}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
            添加服务
          </Button>
        </Space>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as ServiceType)}
        items={tabItems}
      />

      <Table
        dataSource={configs}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="small"
      />

      <ConfigModal
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        form={form}
        editingConfig={editingConfig}
        providers={getCurrentProviders()}
        serviceType={activeTab}
      />
    </Card>
  );
}

// 配置编辑弹窗组件
interface ConfigModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: () => void;
  form: any;
  editingConfig: MediaServiceConfig | null;
  providers: ProviderDefinition[];
  serviceType: ServiceType;
}

function ConfigModal({
  visible,
  onCancel,
  onOk,
  form,
  editingConfig,
  providers,
  serviceType,
}: ConfigModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [models, setModels] = useState<any[]>([]);

  // 监听服务商变化，更新模型列表
  useEffect(() => {
    if (selectedProvider) {
      const provider = providers.find(p => p.id === selectedProvider);
      setModels(provider?.models || []);
    } else {
      setModels([]);
    }
  }, [selectedProvider, providers]);

  // 监听表单值变化
  const handleProviderChange = (value: string) => {
    setSelectedProvider(value);
    form.setFieldValue('modelId', undefined);
  };

  const currentProvider = providers.find(p => p.id === selectedProvider);

  return (
    <Modal
      title={editingConfig ? '编辑服务配置' : '添加服务配置'}
      open={visible}
      onCancel={onCancel}
      onOk={onOk}
      width={600}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="serviceType" hidden>
          <Input />
        </Form.Item>

        <Form.Item
          name="provider"
          label="服务商"
          rules={[{ required: true, message: '请选择服务商' }]}
        >
          <Select
            placeholder="选择服务商"
            onChange={handleProviderChange}
            options={providers.map(p => ({
              value: p.id,
              label: (
                <Space>
                  <span>{p.name}</span>
                  {p.description && (
                    <span style={{ color: '#999', fontSize: 12 }}>
                      ({p.description})
                    </span>
                  )}
                </Space>
              ),
            }))}
          />
        </Form.Item>

        {models.length > 0 && (
          <Form.Item name="modelId" label="模型">
            <Select
              placeholder="选择模型（可选）"
              allowClear
              options={models.map(m => ({
                value: m.id,
                label: (
                  <Space>
                    <span>{m.name}</span>
                    {m.isDefault && <Tag color="blue">默认</Tag>}
                    {m.description && (
                      <span style={{ color: '#999', fontSize: 12 }}>
                        {m.description}
                      </span>
                    )}
                  </Space>
                ),
              }))}
            />
          </Form.Item>
        )}

        <Form.Item name="name" label="显示名称">
          <Input placeholder="自定义显示名称（可选）" />
        </Form.Item>

        {currentProvider?.requiresApiKey !== false && (
          <Form.Item
            name="apiKey"
            label="API Key"
            rules={[{ required: currentProvider?.requiresApiKey, message: '请输入 API Key' }]}
          >
            <Input.Password placeholder="输入 API Key" />
          </Form.Item>
        )}

        {/* 科大讯飞专用配置 */}
        {selectedProvider === 'xfyun' && (
          <>
            <Form.Item
              name={['config', 'appId']}
              label="App ID"
              rules={[{ required: true, message: '请输入讯飞 App ID' }]}
            >
              <Input placeholder="讯飞开放平台 App ID" />
            </Form.Item>
            <Form.Item
              name={['config', 'apiSecret']}
              label="API Secret"
              rules={[{ required: true, message: '请输入讯飞 API Secret' }]}
            >
              <Input.Password placeholder="讯飞 API Secret" />
            </Form.Item>
          </>
        )}

        {currentProvider?.supportsCustomEndpoint && (
          <Form.Item name="apiEndpoint" label="自定义端点">
            <Input placeholder="https://api.example.com（可选，用于代理或私有部署）" />
          </Form.Item>
        )}

        <Form.Item name="modelVersion" label="模型版本">
          <Input placeholder="如 2024-01-01 或 latest（可选）" />
        </Form.Item>

        <Form.Item name="priority" label="优先级" initialValue={0}>
          <InputNumber min={0} max={100} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="isEnabled" label="启用" valuePropName="checked" initialValue={true}>
          <Switch />
        </Form.Item>

        <Form.Item name="config" label="扩展配置 (JSON)">
          <Input.TextArea
            rows={3}
            placeholder='{"maxTokens": 4096, "temperature": 0.7}'
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
