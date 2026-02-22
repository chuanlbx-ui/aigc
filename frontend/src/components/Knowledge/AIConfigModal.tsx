import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Table, Space, Popconfirm, message, Tag, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined, CheckOutlined, GlobalOutlined } from '@ant-design/icons';
import { api } from '../../api/client';

interface AIService {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
  isDefault: boolean;
  isEnabled: boolean;
}

interface AIConfigModalProps {
  open: boolean;
  onCancel: () => void;
}

const providerOptions = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'Claude', value: 'claude' },
  { label: 'DeepSeek', value: 'deepseek' },
  { label: 'Kimi (月之暗面)', value: 'kimi', supportsWebSearch: true },
  { label: '通义千问', value: 'qwen', supportsWebSearch: true },
  { label: '智谱 GLM', value: 'zhipu', supportsWebSearch: true },
  { label: 'Gemini', value: 'gemini', supportsWebSearch: true },
];

const modelOptions: Record<string, { label: string; value: string }[]> = {
  openai: [
    { label: 'GPT-5.2 (最新)', value: 'gpt-5.2' },
    { label: 'GPT-5.1', value: 'gpt-5.1' },
    { label: 'GPT-5', value: 'gpt-5' },
    { label: 'o3 (推理)', value: 'o3' },
    { label: 'o3-mini', value: 'o3-mini' },
    { label: 'o1 (推理)', value: 'o1' },
    { label: 'o1-mini', value: 'o1-mini' },
    { label: 'GPT-4o', value: 'gpt-4o' },
    { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
  ],
  claude: [
    { label: 'Claude Opus 4.5 (最新)', value: 'claude-opus-4-5-20251124' },
    { label: 'Claude Sonnet 4.5', value: 'claude-sonnet-4-5-20250929' },
    { label: 'Claude Opus 4.1', value: 'claude-opus-4-1-20250801' },
    { label: 'Claude Sonnet 4', value: 'claude-sonnet-4-20250514' },
    { label: 'Claude Opus 4', value: 'claude-opus-4-20250514' },
    { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
    { label: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku-20241022' },
  ],
  deepseek: [
    { label: 'DeepSeek V3.2 (最新)', value: 'deepseek-chat' },
    { label: 'DeepSeek Reasoner', value: 'deepseek-reasoner' },
    { label: 'DeepSeek Coder', value: 'deepseek-coder' },
  ],
  kimi: [
    { label: 'Kimi K2.5 (最新)', value: 'kimi-k2.5' },
    { label: 'Moonshot v1 128K', value: 'moonshot-v1-128k' },
    { label: 'Moonshot v1 32K', value: 'moonshot-v1-32k' },
    { label: 'Moonshot v1 Auto', value: 'moonshot-v1-auto' },
  ],
  qwen: [
    { label: 'Qwen3 Max (最新)', value: 'qwen3-max' },
    { label: 'Qwen Max Latest', value: 'qwen-max-latest' },
    { label: 'Qwen Max', value: 'qwen-max' },
    { label: 'Qwen Plus', value: 'qwen-plus' },
    { label: 'Qwen Turbo', value: 'qwen-turbo' },
  ],
  zhipu: [
    { label: 'GLM-4.7 (最新)', value: 'glm-4.7' },
    { label: 'GLM-4.5', value: 'glm-4.5' },
    { label: 'GLM-4.5 Air', value: 'glm-4.5-air' },
    { label: 'GLM-4 Plus', value: 'glm-4-plus' },
    { label: 'GLM-4 Flash', value: 'glm-4-flash' },
  ],
  gemini: [
    { label: 'Gemini 3 Pro (最新)', value: 'gemini-3-pro' },
    { label: 'Gemini 3 Flash', value: 'gemini-3-flash' },
    { label: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro' },
    { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
    { label: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash' },
  ],
};

export default function AIConfigModal({ open, onCancel }: AIConfigModalProps) {
  const [services, setServices] = useState<AIService[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form] = Form.useForm();
  const [selectedProvider, setSelectedProvider] = useState('openai');

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/knowledge/config/services');
      setServices(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchServices();
  }, [open]);

  const handleAdd = async () => {
    const values = await form.validateFields();
    await api.post('/knowledge/config/services', values);
    message.success('添加成功');
    form.resetFields();
    setShowAddForm(false);
    fetchServices();
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/knowledge/config/services/${id}`);
    message.success('删除成功');
    fetchServices();
  };

  const handleSetDefault = async (id: string) => {
    await api.put(`/knowledge/config/services/${id}`, { isDefault: true });
    message.success('已设为默认');
    fetchServices();
  };

  const columns = [
    { title: '名称', dataIndex: 'name', width: 120 },
    {
      title: '服务商',
      dataIndex: 'provider',
      width: 130,
      render: (p: string) => {
        const provider = providerOptions.find(o => o.value === p);
        return (
          <Space size="small">
            <span>{provider?.label || p}</span>
            {(provider as any)?.supportsWebSearch && (
              <GlobalOutlined style={{ color: '#52c41a' }} title="支持联网搜索" />
            )}
          </Space>
        );
      },
    },
    { title: '模型', dataIndex: 'model', width: 150 },
    {
      title: '状态',
      width: 100,
      render: (_: any, r: AIService) => (
        <Space>
          {r.isDefault && <Tag color="blue">默认</Tag>}
          {r.isEnabled ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag>}
        </Space>
      ),
    },
    {
      title: '操作',
      width: 120,
      render: (_: any, r: AIService) => (
        <Space>
          {!r.isDefault && (
            <Button size="small" icon={<CheckOutlined />} onClick={() => handleSetDefault(r.id)}>
              设为默认
            </Button>
          )}
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title="AI 服务配置"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={700}
    >
      <div style={{ marginBottom: 16 }}>
        <Button icon={<PlusOutlined />} onClick={() => setShowAddForm(true)}>
          添加服务
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

      {/* 添加服务弹窗 */}
      <Modal
        title="添加 AI 服务"
        open={showAddForm}
        onCancel={() => setShowAddForm(false)}
        onOk={handleAdd}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="如：我的 GPT-4" />
          </Form.Item>
          <Form.Item name="provider" label="服务商" rules={[{ required: true }]}>
            <Select
              options={providerOptions.map(p => ({
                ...p,
                label: (
                  <Space size="small">
                    <span>{p.label}</span>
                    {(p as any).supportsWebSearch && (
                      <Tag color="green" style={{ marginRight: 0 }}>
                        <GlobalOutlined /> 联网搜索
                      </Tag>
                    )}
                  </Space>
                ),
              }))}
              onChange={setSelectedProvider}
              placeholder="选择服务商"
            />
          </Form.Item>
          <Form.Item name="model" label="模型" rules={[{ required: true }]}>
            <Select
              options={modelOptions[selectedProvider] || []}
              placeholder="选择模型"
            />
          </Form.Item>
          <Form.Item name="apiKey" label="API Key" rules={[{ required: true }]}>
            <Input.Password placeholder="输入 API Key" />
          </Form.Item>
          <Form.Item name="baseUrl" label="自定义 API 地址（可选）">
            <Input placeholder="留空使用默认地址" />
          </Form.Item>
          <Form.Item name="isDefault" valuePropName="checked" label="设为默认">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
}
