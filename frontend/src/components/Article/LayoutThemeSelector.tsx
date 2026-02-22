/**
 * 排版模板选择器（用于文章编辑器）
 * 支持从模板库加载排版模板
 */

import { useState, useEffect, useCallback } from 'react';
import { Select, Space, Typography, Spin, Button, Tooltip } from 'antd';
import { FormatPainterOutlined, SettingOutlined } from '@ant-design/icons';
import { getTemplates, UnifiedTemplate } from '../Template/api';
import { generateCSS, LayoutTemplateConfig } from '../LayoutTemplate';

const { Text } = Typography;

interface LayoutThemeSelectorProps {
  value?: string;
  onChange?: (templateId: string, config?: LayoutTemplateConfig) => void;
  onManage?: () => void;
}

export default function LayoutThemeSelector({
  value = 'default',
  onChange,
  onManage,
}: LayoutThemeSelectorProps) {
  const [templates, setTemplates] = useState<UnifiedTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载排版模板
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTemplates({ type: 'layout' });
      setTemplates(result.templates);
    } catch (error) {
      console.error('加载排版模板失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // 注入当前选中模板的样式
  useEffect(() => {
    const template = templates.find(t => t.id === value);
    if (template) {
      injectThemeStyles(template.id, template.config as LayoutTemplateConfig);
    }
  }, [value, templates]);

  const currentTemplate = templates.find(t => t.id === value);

  const handleChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    onChange?.(templateId, template?.config as LayoutTemplateConfig);
  };

  return (
    <Space>
      <FormatPainterOutlined />
      <Text>排版模板：</Text>
      {loading ? (
        <Spin size="small" />
      ) : (
        <Select
          value={value}
          onChange={handleChange}
          style={{ width: 160 }}
          options={templates.map(t => ({
            value: t.id,
            label: t.name,
          }))}
          placeholder="选择排版模板"
        />
      )}
      {currentTemplate && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {currentTemplate.description || ''}
        </Text>
      )}
      {onManage && (
        <Tooltip title="管理排版模板">
          <Button
            type="text"
            size="small"
            icon={<SettingOutlined />}
            onClick={onManage}
          />
        </Tooltip>
      )}
    </Space>
  );
}

// 注入主题样式到页面
function injectThemeStyles(themeId: string, config: LayoutTemplateConfig) {
  const styleId = `md-theme-${themeId}`;
  let styleEl = document.getElementById(styleId);

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = generateCSS(config, themeId);
}

// 获取主题类名
export function getLayoutThemeClassName(themeId: string): string {
  return `md-theme-${themeId}`;
}
