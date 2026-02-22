import { useState, useEffect } from 'react';
import { Select, Tag, Space } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { api } from '../../api/client';

interface AIService {
  id: string;
  name: string;
  provider: string;
  model: string;
  supportsWebSearch: boolean;
  isDefault: boolean;
}

interface AIModelSelectorProps {
  value?: string;
  onChange: (serviceId: string | undefined) => void;
  showWebSearchTag?: boolean;
}

export default function AIModelSelector({
  value,
  onChange,
  showWebSearchTag = true,
}: AIModelSelectorProps) {
  const [services, setServices] = useState<AIService[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/articles/ai/services');
      setServices(res.data.services || []);
    } catch (error) {
      console.error('加载 AI 服务列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedService = services.find(s => s.id === value);

  return (
    <Space size="small">
      <Select
        value={value}
        onChange={onChange}
        loading={loading}
        placeholder="选择 AI 模型"
        allowClear
        style={{ minWidth: 180 }}
        options={services.map(s => ({
          value: s.id,
          label: (
            <Space size="small">
              <span>{s.name}</span>
              {s.isDefault && <Tag color="blue" style={{ marginRight: 0 }}>默认</Tag>}
              {showWebSearchTag && s.supportsWebSearch && (
                <GlobalOutlined style={{ color: '#52c41a' }} />
              )}
            </Space>
          ),
        }))}
      />
      {showWebSearchTag && selectedService?.supportsWebSearch && (
        <Tag color="green" icon={<GlobalOutlined />}>
          支持联网搜索
        </Tag>
      )}
    </Space>
  );
}
