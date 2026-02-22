/**
 * 链接样式编辑器
 */

import React from 'react';
import { Form, Input, Select, ColorPicker } from 'antd';
import type { Color } from 'antd/es/color-picker';
import { LayoutTemplateConfig } from '../types';

interface LinkStyleEditorProps {
  value: LayoutTemplateConfig['link'];
  onChange: (value: LayoutTemplateConfig['link']) => void;
}

const TEXT_DECORATIONS = [
  { label: '无', value: 'none' },
  { label: '下划线', value: 'underline' },
];

export const LinkStyleEditor: React.FC<LinkStyleEditorProps> = ({ value, onChange }) => {
  const handleChange = (field: keyof LayoutTemplateConfig['link'], val: any) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <Form layout="vertical" size="small">
      <Form.Item label="颜色">
        <ColorPicker
          value={value.color}
          onChange={(c: Color) => handleChange('color', c.toHexString())}
          showText
        />
      </Form.Item>

      <Form.Item label="文字装饰">
        <Select
          value={value.textDecoration}
          onChange={(v) => handleChange('textDecoration', v)}
          options={TEXT_DECORATIONS}
        />
      </Form.Item>

      <Form.Item label="下边框">
        <Input
          value={value.borderBottom || ''}
          onChange={(e) => handleChange('borderBottom', e.target.value)}
          placeholder="如: 1px solid #1890ff"
        />
      </Form.Item>
    </Form>
  );
};

export default LinkStyleEditor;
