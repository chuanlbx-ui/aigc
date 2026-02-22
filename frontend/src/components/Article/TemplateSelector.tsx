/**
 * 工作流配置模板选择器
 */

import React, { useState, useEffect } from 'react';
import { Radio, Select, Card, Space, Tag, Spin, message } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';

interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  platform?: string;
  column?: string;
  usageCount: number;
  isDefault: boolean;
}

interface TemplateSelectorProps {
  platform?: string;
  column?: string;
  value?: string;
  onChange?: (templateId?: string) => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  platform,
  column,
  value,
  onChange,
}) => {
  const [useTemplate, setUseTemplate] = useState<boolean>(!!value);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(value);

  // 加载模板列表
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (platform) params.append('platform', platform);
      
      const response = await fetch(`/api/workflow-templates?${params}`);
      const data = await response.json();
      
      let filteredTemplates = data.templates || [];
      
      // 如果有栏目筛选，进一步过滤
      if (column) {
        filteredTemplates = filteredTemplates.filter(
          (t: WorkflowTemplate) => !t.column || t.column === column
        );
      }
      
      setTemplates(filteredTemplates);
      
      // 如果有默认模板且未选择，自动选择默认模板
      if (!selectedTemplateId) {
        const defaultTemplate = filteredTemplates.find((t: WorkflowTemplate) => t.isDefault);
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id);
          onChange?.(defaultTemplate.id);
        }
      }
    } catch (error) {
      message.error('加载模板列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (useTemplate) {
      loadTemplates();
    }
  }, [platform, column, useTemplate]);

  const handleUseTemplateChange = (use: boolean) => {
    setUseTemplate(use);
    if (!use) {
      setSelectedTemplateId(undefined);
      onChange?.(undefined);
    } else {
      loadTemplates();
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    onChange?.(templateId);
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <strong>工作流配置模板</strong>
        </div>
        
        <Radio.Group
          value={useTemplate}
          onChange={(e) => handleUseTemplateChange(e.target.value)}
        >
          <Space direction="vertical">
            <Radio value={false}>使用默认配置</Radio>
            <Radio value={true}>选择配置模板</Radio>
          </Space>
        </Radio.Group>

        {useTemplate && (
          <Spin spinning={loading}>
            <Select
              style={{ width: '100%' }}
              placeholder="选择配置模板"
              value={selectedTemplateId}
              onChange={handleTemplateChange}
              options={templates.map(t => ({
                label: (
                  <Space>
                    {t.name}
                    {t.isDefault && <Tag color="blue">默认</Tag>}
                    {t.platform && <Tag>{t.platform}</Tag>}
                    {t.column && <Tag>{t.column}</Tag>}
                  </Space>
                ),
                value: t.id,
              }))}
            />
            
            {selectedTemplate && (
              <Card size="small" style={{ marginTop: 8, background: '#f5f5f5' }}>
                <Space direction="vertical" size="small">
                  <div>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />
                    <strong>{selectedTemplate.name}</strong>
                  </div>
                  {selectedTemplate.description && (
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {selectedTemplate.description}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#999' }}>
                    使用次数: {selectedTemplate.usageCount}
                  </div>
                </Space>
              </Card>
            )}
          </Spin>
        )}
      </Space>
    </Card>
  );
};

export default TemplateSelector;
