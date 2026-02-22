/**
 * 模板卡片组件
 */

import React from 'react';
import { Card, Tag, Dropdown, Button, Tooltip } from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { UnifiedTemplate, TemplateType } from './api';

interface TemplateCardProps {
  template: UnifiedTemplate;
  onEdit?: (template: UnifiedTemplate) => void;
  onDelete?: (template: UnifiedTemplate) => void;
  onClone?: (template: UnifiedTemplate) => void;
  onSelect?: (template: UnifiedTemplate) => void;
}

// 模板类型标签颜色
const typeColors: Record<TemplateType, string> = {
  popup: 'blue',
  workflow: 'green',
  general: 'purple',
  layout: 'orange',
};

// 模板类型中文名
const typeNames: Record<TemplateType, string> = {
  popup: '弹窗',
  workflow: '工作流',
  general: '通用',
  layout: '布局',
};

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onEdit,
  onDelete,
  onClone,
  onSelect,
}) => {
  // 操作菜单
  const menuItems: MenuProps['items'] = [
    {
      key: 'clone',
      icon: <CopyOutlined />,
      label: '克隆',
      onClick: () => onClone?.(template),
    },
  ];

  // 非系统模板可编辑和删除
  if (!template.isSystem) {
    menuItems.unshift({
      key: 'edit',
      icon: <EditOutlined />,
      label: '编辑',
      onClick: () => onEdit?.(template),
    });
    menuItems.push({
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除',
      danger: true,
      onClick: () => onDelete?.(template),
    });
  }

  return (
    <Card
      hoverable
      onClick={() => onSelect?.(template)}
      style={{ height: '100%' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tooltip title={template.name}>
              <span style={{
                fontWeight: 500,
                fontSize: 14,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {template.name}
              </span>
            </Tooltip>
            {template.isSystem && (
              <Tag color="gold" style={{ marginLeft: 4 }}>系统</Tag>
            )}
          </div>
        </div>
        <Dropdown menu={{ items: menuItems }} trigger={['click']}>
          <Button
            type="text"
            icon={<EllipsisOutlined />}
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>
      </div>
    </Card>
  );
};

export default TemplateCard;
