/**
 * 引用块样式编辑器
 */

import React from 'react';
import { Form, Input, ColorPicker } from 'antd';
import type { Color } from 'antd/es/color-picker';
import { LayoutTemplateConfig } from '../types';

interface BlockquoteStyleEditorProps {
  value: LayoutTemplateConfig['blockquote'];
  onChange: (value: LayoutTemplateConfig['blockquote']) => void;
}

export const BlockquoteStyleEditor: React.FC<BlockquoteStyleEditorProps> = ({ value, onChange }) => {
  const handleChange = (field: keyof LayoutTemplateConfig['blockquote'], val: any) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <Form layout="vertical" size="small">
      <Form.Item label="左边框">
        <Input
          value={value.borderLeft || ''}
          onChange={(e) => handleChange('borderLeft', e.target.value)}
          placeholder="如: 4px solid #ddd"
        />
      </Form.Item>

      <Form.Item label="背景颜色">
        <ColorPicker
          value={value.backgroundColor || '#f7f7f7'}
          onChange={(c: Color) => handleChange('backgroundColor', c.toHexString())}
          showText
          allowClear
        />
      </Form.Item>

      <Form.Item label="内边距">
        <Input
          value={value.padding}
          onChange={(e) => handleChange('padding', e.target.value)}
          placeholder="如: 12px 16px"
        />
      </Form.Item>

      <Form.Item label="外边距">
        <Input
          value={value.margin}
          onChange={(e) => handleChange('margin', e.target.value)}
          placeholder="如: 16px 0"
        />
      </Form.Item>

      <Form.Item label="文字颜色">
        <ColorPicker
          value={value.color || '#666666'}
          onChange={(c: Color) => handleChange('color', c.toHexString())}
          showText
          allowClear
        />
      </Form.Item>

      <Form.Item label="圆角">
        <Input
          value={value.borderRadius || ''}
          onChange={(e) => handleChange('borderRadius', e.target.value)}
          placeholder="如: 4px"
        />
      </Form.Item>
    </Form>
  );
};

export default BlockquoteStyleEditor;
