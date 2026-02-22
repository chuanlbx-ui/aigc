import { useState, useEffect } from 'react';
import { Select, Tag, Space, Tooltip } from 'antd';
import { PictureOutlined } from '@ant-design/icons';
import { api } from '../../api/client';

interface ImageService {
  id: string;
  name: string;
  provider: string;
  providerName: string;
  providerType: 'library' | 'ai';
  isEnabled: boolean;
  priority: number;
  hasApiKey: boolean;
}

interface ImageServiceSelectorProps {
  value?: string[];
  onChange: (serviceIds: string[]) => void;
  size?: 'small' | 'middle' | 'large';
  placeholder?: string;
  maxTagCount?: number;
}

export default function ImageServiceSelector({
  value = [],
  onChange,
  size = 'middle',
  placeholder = '选择图片服务',
  maxTagCount = 2,
}: ImageServiceSelectorProps) {
  const [services, setServices] = useState<ImageService[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  // 自动选中所有启用的服务
  useEffect(() => {
    if (value.length === 0 && services.length > 0) {
      const enabledIds = services.map(s => s.id);
      onChange(enabledIds);
    }
  }, [services]);

  const loadServices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/image-services');
      const serviceList = (res.data.services || []).filter(
        (s: ImageService) => s.isEnabled && s.hasApiKey
      );
      setServices(serviceList);
    } catch (error) {
      console.error('加载图片服务列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const typeColors = {
    library: 'green',
    ai: 'purple',
  };

  const typeLabels = {
    library: '图库',
    ai: 'AI',
  };

  return (
    <Space size="small">
      <Tooltip title="选择用于配图的服务（可多选）">
        <PictureOutlined style={{ color: '#1890ff' }} />
      </Tooltip>
      <Select
        mode="multiple"
        value={value}
        onChange={onChange}
        loading={loading}
        size={size}
        placeholder={placeholder}
        style={{ minWidth: 150 }}
        maxTagCount={maxTagCount}
        maxTagPlaceholder={(omitted) => `+${omitted.length}`}
        options={services.map(s => ({
          value: s.id,
          label: (
            <Space size="small">
              <span>{s.name}</span>
              <Tag color={typeColors[s.providerType]} style={{ marginRight: 0 }}>
                {typeLabels[s.providerType]}
              </Tag>
            </Space>
          ),
        }))}
        optionFilterProp="label"
        allowClear
      />
    </Space>
  );
}
