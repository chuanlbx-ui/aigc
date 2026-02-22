/**
 * 模板卡片组件
 */

import React from 'react';
import { Card, Tag, Space, Button, Popconfirm, message } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  ExportOutlined,
  StarOutlined,
  StarFilled,
} from '@ant-design/icons';

interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'system' | 'custom';
  isSystem: boolean;
  isDefault: boolean;
  platform?: string;
  column?: string;
  usageCount: number;
  isEnabled: boolean;
}

interface TemplateCardProps {
  template: WorkflowTemplate;
  onUpdate: () => void;
  onEdit?: (templateId: string) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onUpdate, onEdit }) => {
  // 删除模板
  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/workflow-templates/${template.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        message.success('删除成功');
        onUpdate();
      } else {
        message.error('删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 克隆模板
  const handleClone = async () => {
    try {
      const response = await fetch(`/api/workflow-templates/${template.id}/clone`, {
        method: 'POST',
      });
      if (response.ok) {
        message.success('克隆成功');
        onUpdate();
      } else {
        message.error('克隆失败');
      }
    } catch (error) {
      message.error('克隆失败');
    }
  };

  // 导出模板
  const handleExport = async () => {
    try {
      const response = await fetch(`/api/workflow-templates/${template.id}/export`);
      const data = await response.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name}.json`;
      a.click();
      URL.revokeObjectURL(url);

      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  // 设为默认
  const handleSetDefault = async () => {
    try {
      const response = await fetch(`/api/workflow-templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: !template.isDefault }),
      });
      if (response.ok) {
        message.success(template.isDefault ? '已取消默认' : '已设为默认');
        onUpdate();
      } else {
        message.error('操作失败');
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  return (
    <Card
      hoverable
      style={{ height: '100%' }}
      actions={[
        <Button
          type="text"
          icon={<EditOutlined />}
          size="small"
          onClick={() => onEdit?.(template.id)}
        >
          编辑
        </Button>,
        <Button type="text" icon={<CopyOutlined />} size="small" onClick={handleClone}>
          克隆
        </Button>,
        <Button type="text" icon={<ExportOutlined />} size="small" onClick={handleExport}>
          导出
        </Button>,
        <Popconfirm
          title="确定删除此模板？"
          onConfirm={handleDelete}
          okText="确定"
          cancelText="取消"
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small">
            删除
          </Button>
        </Popconfirm>,
      ]}
    >
      <div style={{ marginBottom: '12px' }}>
        <Space>
          <h4 style={{ margin: 0 }}>{template.name}</h4>
          {template.isDefault && <StarFilled style={{ color: '#faad14' }} />}
        </Space>
      </div>

      <p style={{ color: '#666', fontSize: '12px', marginBottom: '12px' }}>
        {template.description || '暂无描述'}
      </p>

      <Space wrap>
        {template.platform && (
          <Tag color="blue">{template.platform}</Tag>
        )}
        {template.column && (
          <Tag color="green">{template.column}</Tag>
        )}
        <Tag>{template.usageCount} 次使用</Tag>
      </Space>

      <div style={{ marginTop: '12px' }}>
        <Button
          type="link"
          size="small"
          icon={template.isDefault ? <StarFilled /> : <StarOutlined />}
          onClick={handleSetDefault}
        >
          {template.isDefault ? '取消默认' : '设为默认'}
        </Button>
      </div>
    </Card>
  );
};

export default TemplateCard;
