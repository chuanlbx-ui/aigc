/**
 * 图片样式编辑器
 */

import React from 'react';
import { Form, Input } from 'antd';
import { LayoutTemplateConfig } from '../types';

interface ImageStyleEditorProps {
  value: LayoutTemplateConfig['image'];
  onChange: (value: LayoutTemplateConfig['image']) => void;
}

export const ImageStyleEditor: React.FC<ImageStyleEditorProps> = ({ value, onChange }) => {
  const handleChange = (field: keyof LayoutTemplateConfig['image'], val: any) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <Form layout="vertical" size="small">
      <Form.Item label="最大宽度">
        <Input
          value={value.maxWidth}
          onChange={(e) => handleChange('maxWidth', e.target.value)}
          placeholder="如: 100%"
        />
      </Form.Item>

      <Form.Item label="圆角">
        <Input
          value={value.borderRadius || ''}
          onChange={(e) => handleChange('borderRadius', e.target.value)}
          placeholder="如: 4px"
        />
      </Form.Item>

      <Form.Item label="外边距">
        <Input
          value={value.margin || ''}
          onChange={(e) => handleChange('margin', e.target.value)}
          placeholder="如: 16px 0"
        />
      </Form.Item>

      <Form.Item label="阴影">
        <Input
          value={value.boxShadow || ''}
          onChange={(e) => handleChange('boxShadow', e.target.value)}
          placeholder="如: 0 4px 12px rgba(0,0,0,0.1)"
        />
      </Form.Item>
    </Form>
  );
};

export default ImageStyleEditor;
