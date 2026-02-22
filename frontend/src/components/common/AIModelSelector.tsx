import { useState, useEffect } from 'react';
import { Select, Tag, Space, Tooltip } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { api } from '../../api/client';

interface AIService {
  id: string;
  name: string;
  provider: string;
  providerName: string;
  model: string;
  supportsWebSearch: boolean;
  isDefault: boolean;
  isEnabled: boolean;
}

interface AIModelSelectorProps {
  value?: string;
  onChange: (serviceId: string | undefined) => void;
  showWebSearchTag?: boolean;
  filterWebSearch?: boolean; // 仅显示支持联网搜索的模型
  size?: 'small' | 'middle' | 'large';
  placeholder?: string;
}

export default function AIModelSelector({
  value,
  onChange,
  showWebSearchTag = true,
  filterWebSearch = false,
  size = 'middle',
  placeholder = '选择 AI 模型',
}: AIModelSelectorProps) {
  const [services, setServices] = useState<AIService[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  // 自动选中默认模型
  useEffect(() => {
    if (!value && services.length > 0) {
      const defaultService = services.find(s => s.isDefault);
      if (defaultService) {
        onChange(defaultService.id);
      }
    }
  }, [services, value, onChange]);

  const loadServices = async () => {
    setLoading(true);
    try {
      // 使用新的统一 API
      const res = await api.get('/ai/services');
      let serviceList = res.data.services || [];

      // 过滤：仅显示已启用的服务
      serviceList = serviceList.filter((s: AIService) => s.isEnabled);

      // 可选过滤：仅显示支持联网搜索的服务
      if (filterWebSearch) {
        serviceList = serviceList.filter((s: AIService) => s.supportsWebSearch);
      }

      setServices(serviceList);
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
        placeholder={placeholder}
        allowClear
        size={size}
        style={{ minWidth: 180 }}
        options={services.map(s => ({
          value: s.id,
          label: (
            <Space size="small">
              <span>{s.name}</span>
              {s.isDefault && <Tag color="blue" style={{ marginRight: 0, fontSize: 11 }}>默认</Tag>}
              {showWebSearchTag && s.supportsWebSearch && (
                <Tooltip title="支持联网搜索">
                  <GlobalOutlined style={{ color: '#52c41a' }} />
                </Tooltip>
              )}
            </Space>
          ),
        }))}
      />
      {showWebSearchTag && selectedService?.supportsWebSearch && (
        <Tag color="green" icon={<GlobalOutlined />} style={{ fontSize: 11 }}>
          支持联网
        </Tag>
      )}
    </Space>
  );
}
