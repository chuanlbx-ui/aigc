/**
 * 段落样式编辑器
 */

import React from 'react';
import { Form, InputNumber, Select, Input } from 'antd';
import { LayoutTemplateConfig } from '../types';

interface ParagraphStyleEditorProps {
  value: LayoutTemplateConfig['paragraph'];
  onChange: (value: LayoutTemplateConfig['paragraph']) => void;
}

const TEXT_ALIGNS = [
  { label: '左对齐', value: 'left' },
  { label: '两端对齐', value: 'justify' },
  { label: '居中', value: 'center' },
];

export const ParagraphStyleEditor: React.FC<ParagraphStyleEditorProps> = ({ value, onChange }) => {
  const handleChange = (field: keyof LayoutTemplateConfig['paragraph'], val: any) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <Form layout="vertical" size="small">
      <Form.Item label="外边距">
        <Input
          value={value.margin}
          onChange={(e) => handleChange('margin', e.target.value)}
          placeholder="如: 12px 0"
        />
      </Form.Item>

      <Form.Item label="首行缩进">
        <InputNumber
          value={value.textIndent || 0}
          onChange={(v) => handleChange('textIndent', v)}
          min={0}
          max={4}
          step={0.5}
          addonAfter="em"
          style={{ width: '100%' }}
        />
      </Form.Item>

      <Form.Item label="对齐方式">
        <Select
          value={value.textAlign || 'left'}
          onChange={(v) => handleChange('textAlign', v)}
          options={TEXT_ALIGNS}
        />
      </Form.Item>
    </Form>
  );
};

export default ParagraphStyleEditor;
