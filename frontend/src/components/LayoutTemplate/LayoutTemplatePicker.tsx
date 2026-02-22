/**
 * 排版模板选择器组件
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spin, Empty, Tag, Button } from 'antd';
import { CheckOutlined, EditOutlined } from '@ant-design/icons';
import { LayoutTemplateConfig } from './types';
import { generateCSS } from './utils/cssGenerator';

// 模板卡片组件
interface TemplateCardProps {
  template: LayoutTemplate;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  selected,
  onSelect,
  onEdit,
}) => {
  const previewCSS = generateCSS(template.config, `picker-${template.id}`);

  return (
    <Card
      hoverable
      style={{
        border: selected ? '2px solid #1890ff' : '1px solid #f0f0f0',
        position: 'relative',
      }}
      bodyStyle={{ padding: 12 }}
      onClick={onSelect}
    >
      {selected && (
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: '#1890ff',
          borderRadius: '50%',
          width: 20,
          height: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <CheckOutlined style={{ color: '#fff', fontSize: 12 }} />
        </div>
      )}

      {/* 预览区域 */}
      <div style={{
        height: 120,
        overflow: 'hidden',
        marginBottom: 8,
        borderRadius: 4,
        border: '1px solid #f0f0f0',
      }}>
        <style>{previewCSS}</style>
        <div
          className={`md-theme-picker-${template.id}`}
          style={{ padding: 8, transform: 'scale(0.6)', transformOrigin: 'top left' }}
        >
          <h2 style={{ margin: '0 0 4px' }}>标题示例</h2>
          <p style={{ margin: 0 }}>正文内容预览...</p>
        </div>
      </div>

      {/* 信息区域 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 500 }}>{template.name}</div>
          {template.isSystem && <Tag color="blue" style={{ marginTop: 4 }}>系统</Tag>}
        </div>
        {!template.isSystem && (
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
          />
        )}
      </div>
    </Card>
  );
};

interface LayoutTemplate {
  id: string;
  name: string;
  description?: string;
  config: LayoutTemplateConfig;
  isSystem: boolean;
  thumbnail?: string;
}

interface LayoutTemplatePickerProps {
  value?: string;
  onChange?: (templateId: string, config: LayoutTemplateConfig) => void;
  onEdit?: (template: LayoutTemplate) => void;
  templates?: LayoutTemplate[];
  loading?: boolean;
}

export const LayoutTemplatePicker: React.FC<LayoutTemplatePickerProps> = ({
  value,
  onChange,
  onEdit,
  templates = [],
  loading = false,
}) => {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin tip="加载模板..." />
      </div>
    );
  }

  if (templates.length === 0) {
    return <Empty description="暂无排版模板" />;
  }

  return (
    <Row gutter={[16, 16]}>
      {templates.map((template) => (
        <Col key={template.id} xs={24} sm={12} md={8} lg={6}>
          <TemplateCard
            template={template}
            selected={value === template.id}
            onSelect={() => onChange?.(template.id, template.config)}
            onEdit={() => onEdit?.(template)}
          />
        </Col>
      ))}
    </Row>
  );
};

export default LayoutTemplatePicker;
