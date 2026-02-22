/**
 * 列表样式编辑器
 */

import React from 'react';
import { Form, InputNumber, Input, ColorPicker } from 'antd';
import type { Color } from 'antd/es/color-picker';
import { LayoutTemplateConfig } from '../types';

interface ListStyleEditorProps {
  value: LayoutTemplateConfig['list'];
  onChange: (value: LayoutTemplateConfig['list']) => void;
}

export const ListStyleEditor: React.FC<ListStyleEditorProps> = ({ value, onChange }) => {
  const handleChange = (field: keyof LayoutTemplateConfig['list'], val: any) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <Form layout="vertical" size="small">
      <Form.Item label="左内边距">
        <InputNumber
          value={value.paddingLeft}
          onChange={(v) => handleChange('paddingLeft', v)}
          min={0}
          max={60}
          addonAfter="px"
          style={{ width: '100%' }}
        />
      </Form.Item>

      <Form.Item label="外边距">
        <Input
          value={value.margin}
          onChange={(e) => handleChange('margin', e.target.value)}
          placeholder="如: 12px 0"
        />
      </Form.Item>

      <Form.Item label="列表项间距">
        <Input
          value={value.itemMargin}
          onChange={(e) => handleChange('itemMargin', e.target.value)}
          placeholder="如: 6px 0"
        />
      </Form.Item>

      <Form.Item label="标记颜色">
        <ColorPicker
          value={value.markerColor || '#333333'}
          onChange={(c: Color) => handleChange('markerColor', c.toHexString())}
          showText
          allowClear
        />
      </Form.Item>
    </Form>
  );
};

export default ListStyleEditor;
