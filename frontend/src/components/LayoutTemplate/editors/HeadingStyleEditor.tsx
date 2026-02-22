/**
 * 标题样式编辑器
 */

import React from 'react';
import { Form, InputNumber, Select, ColorPicker, Collapse, Input } from 'antd';
import type { Color } from 'antd/es/color-picker';
import { HeadingStyle, LayoutTemplateConfig } from '../types';

interface HeadingStyleEditorProps {
  value: LayoutTemplateConfig['headings'];
  onChange: (value: LayoutTemplateConfig['headings']) => void;
}

const FONT_WEIGHTS = [
  { label: '正常', value: 'normal' },
  { label: '粗体', value: 'bold' },
  { label: '500', value: '500' },
  { label: '600', value: '600' },
  { label: '700', value: '700' },
];

const TEXT_ALIGNS = [
  { label: '左对齐', value: 'left' },
  { label: '居中', value: 'center' },
  { label: '右对齐', value: 'right' },
];

interface SingleHeadingEditorProps {
  level: string;
  value: HeadingStyle;
  onChange: (value: HeadingStyle) => void;
}

const SingleHeadingEditor: React.FC<SingleHeadingEditorProps> = ({ level, value, onChange }) => {
  const handleChange = (field: keyof HeadingStyle, val: any) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <Form layout="vertical" size="small">
      <Form.Item label="字号">
        <InputNumber
          value={value.fontSize}
          onChange={(v) => handleChange('fontSize', v)}
          min={14}
          max={48}
          addonAfter="px"
          style={{ width: '100%' }}
        />
      </Form.Item>

      <Form.Item label="字重">
        <Select
          value={value.fontWeight}
          onChange={(v) => handleChange('fontWeight', v)}
          options={FONT_WEIGHTS}
        />
      </Form.Item>

      <Form.Item label="外边距">
        <Input
          value={value.margin}
          onChange={(e) => handleChange('margin', e.target.value)}
          placeholder="如: 24px 0 16px"
        />
      </Form.Item>

      <Form.Item label="颜色">
        <ColorPicker
          value={value.color || '#333333'}
          onChange={(c: Color) => handleChange('color', c.toHexString())}
          showText
          allowClear
        />
      </Form.Item>

      <Form.Item label="对齐">
        <Select
          value={value.textAlign || 'left'}
          onChange={(v) => handleChange('textAlign', v)}
          options={TEXT_ALIGNS}
          allowClear
        />
      </Form.Item>

      <Form.Item label="下边框">
        <Input
          value={value.borderBottom || ''}
          onChange={(e) => handleChange('borderBottom', e.target.value)}
          placeholder="如: 1px solid #eee"
        />
      </Form.Item>

      <Form.Item label="左边框">
        <Input
          value={value.borderLeft || ''}
          onChange={(e) => handleChange('borderLeft', e.target.value)}
          placeholder="如: 4px solid #07c160"
        />
      </Form.Item>
    </Form>
  );
};

export const HeadingStyleEditor: React.FC<HeadingStyleEditorProps> = ({ value, onChange }) => {
  const handleHeadingChange = (level: 'h1' | 'h2' | 'h3', style: HeadingStyle) => {
    onChange({ ...value, [level]: style });
  };

  const items = [
    { key: 'h1', label: 'H1 一级标题', children: (
      <SingleHeadingEditor level="h1" value={value.h1} onChange={(v) => handleHeadingChange('h1', v)} />
    )},
    { key: 'h2', label: 'H2 二级标题', children: (
      <SingleHeadingEditor level="h2" value={value.h2} onChange={(v) => handleHeadingChange('h2', v)} />
    )},
    { key: 'h3', label: 'H3 三级标题', children: (
      <SingleHeadingEditor level="h3" value={value.h3} onChange={(v) => handleHeadingChange('h3', v)} />
    )},
  ];

  return <Collapse items={items} defaultActiveKey={['h1']} size="small" />;
};

export default HeadingStyleEditor;
