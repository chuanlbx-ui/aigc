/**
 * 统一媒体服务选择器组件
 * 支持选择 AI、图片、视频、音频、TTS、数字人等服务
 */

import { useState, useEffect, useMemo } from 'react';
import { Select, Tag, Space, Tooltip, Spin } from 'antd';
import {
  RobotOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  SoundOutlined,
  AudioOutlined,
  UserOutlined,
  SearchOutlined,
  PlaySquareOutlined,
} from '@ant-design/icons';
import { api } from '../../api/client';

// 服务类型定义
export type ServiceType =
  | 'ai_chat'
  | 'image_search'
  | 'image_generate'
  | 'video_generate'
  | 'video_search'
  | 'audio_search'
  | 'tts'
  | 'digital_human';

// 服务配置接口
export interface MediaServiceConfig {
  id: string;
  name: string;
  provider: string;
  serviceType: ServiceType;
  modelId?: string;
  modelVersion?: string;
  apiKey?: string;
  apiEndpoint?: string;
  isEnabled: boolean;
  priority: number;
  config: Record<string, any>;
}

// 服务类型元数据
const SERVICE_TYPE_META: Record<ServiceType, {
  label: string;
  icon: React.ReactNode;
  color: string;
}> = {
  ai_chat: { label: 'AI 大模型', icon: <RobotOutlined />, color: 'blue' },
  image_search: { label: '图片搜索', icon: <SearchOutlined />, color: 'green' },
  image_generate: { label: 'AI 图片', icon: <PictureOutlined />, color: 'purple' },
  video_generate: { label: 'AI 视频', icon: <VideoCameraOutlined />, color: 'magenta' },
  video_search: { label: '视频搜索', icon: <PlaySquareOutlined />, color: 'cyan' },
  audio_search: { label: '音频搜索', icon: <SoundOutlined />, color: 'orange' },
  tts: { label: '语音合成', icon: <AudioOutlined />, color: 'geekblue' },
  digital_human: { label: '数字人', icon: <UserOutlined />, color: 'volcano' },
};

interface MediaServiceSelectorProps {
  /** 服务类型 */
  serviceType: ServiceType;
  /** 选中的服务 ID（单选模式） */
  value?: string;
  /** 选中的服务 ID 列表（多选模式） */
  values?: string[];
  /** 单选模式回调 */
  onChange?: (serviceId: string | undefined) => void;
  /** 多选模式回调 */
  onChangeMultiple?: (serviceIds: string[]) => void;
  /** 是否多选模式 */
  multiple?: boolean;
  /** 尺寸 */
  size?: 'small' | 'middle' | 'large';
  /** 占位文本 */
  placeholder?: string;
  /** 最大显示标签数 */
  maxTagCount?: number;
  /** 是否显示图标 */
  showIcon?: boolean;
  /** 是否显示服务类型标签 */
  showTypeTag?: boolean;
  /** 样式 */
  style?: React.CSSProperties;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否允许清空 */
  allowClear?: boolean;
  /** 自动选择第一个可用服务 */
  autoSelectFirst?: boolean;
}

export default function MediaServiceSelector({
  serviceType,
  value,
  values = [],
  onChange,
  onChangeMultiple,
  multiple = false,
  size = 'middle',
  placeholder,
  maxTagCount = 2,
  showIcon = true,
  showTypeTag = false,
  style,
  disabled = false,
  allowClear = true,
  autoSelectFirst = false,
}: MediaServiceSelectorProps) {
  const [services, setServices] = useState<MediaServiceConfig[]>([]);
  const [loading, setLoading] = useState(false);

  const meta = SERVICE_TYPE_META[serviceType];

  // 加载服务列表
  useEffect(() => {
    loadServices();
  }, [serviceType]);

  // 自动选择第一个服务
  useEffect(() => {
    if (autoSelectFirst && services.length > 0) {
      if (multiple && values.length === 0 && onChangeMultiple) {
        onChangeMultiple(services.map(s => s.id));
      } else if (!multiple && !value && onChange) {
        onChange(services[0].id);
      }
    }
  }, [services, autoSelectFirst]);

  const loadServices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/media-services', {
        params: { type: serviceType, enabled: true },
      });
      setServices(res.data.configs || []);
    } catch (error) {
      console.error('加载服务列表失败:', error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  // 构建选项
  const options = useMemo(() => {
    return services.map(s => ({
      value: s.id,
      label: (
        <Space size="small">
          <span>{s.name}</span>
          {showTypeTag && (
            <Tag color={meta.color} style={{ marginRight: 0 }}>
              {meta.label}
            </Tag>
          )}
        </Space>
      ),
      service: s,
    }));
  }, [services, showTypeTag, meta]);

  const defaultPlaceholder = placeholder || `选择${meta.label}服务`;

  // 单选模式
  if (!multiple) {
    return (
      <Space size="small">
        {showIcon && (
          <Tooltip title={meta.label}>
            <span style={{ color: '#1890ff' }}>{meta.icon}</span>
          </Tooltip>
        )}
        <Select
          value={value}
          onChange={onChange}
          loading={loading}
          size={size}
          placeholder={defaultPlaceholder}
          style={{ minWidth: 160, ...style }}
          options={options}
          optionFilterProp="label"
          allowClear={allowClear}
          disabled={disabled}
          notFoundContent={loading ? <Spin size="small" /> : '暂无可用服务'}
        />
      </Space>
    );
  }

  // 多选模式
  return (
    <Space size="small">
      {showIcon && (
        <Tooltip title={meta.label}>
          <span style={{ color: '#1890ff' }}>{meta.icon}</span>
        </Tooltip>
      )}
      <Select
        mode="multiple"
        value={values}
        onChange={onChangeMultiple}
        loading={loading}
        size={size}
        placeholder={defaultPlaceholder}
        style={{ minWidth: 180, ...style }}
        maxTagCount={maxTagCount}
        maxTagPlaceholder={(omitted) => `+${omitted.length}`}
        options={options}
        optionFilterProp="label"
        allowClear={allowClear}
        disabled={disabled}
        notFoundContent={loading ? <Spin size="small" /> : '暂无可用服务'}
      />
    </Space>
  );
}
