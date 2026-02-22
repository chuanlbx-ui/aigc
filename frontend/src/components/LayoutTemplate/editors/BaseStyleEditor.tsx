/**
 * 基础样式编辑器
 */

import React from 'react';
import { Form, InputNumber, Select, ColorPicker } from 'antd';
import type { Color } from 'antd/es/color-picker';
import { LayoutTemplateConfig } from '../types';

interface BaseStyleEditorProps {
  value: LayoutTemplateConfig['base'];
  onChange: (value: LayoutTemplateConfig['base']) => void;
}

const FONT_FAMILIES = [
  { label: '系统默认', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { label: '苹方/微软雅黑', value: '"PingFang SC", "Microsoft YaHei", sans-serif' },
  { label: '思源黑体', value: '"Source Han Sans SC", "Noto Sans SC", sans-serif' },
  { label: '思源宋体', value: '"Source Han Serif SC", "Noto Serif SC", serif' },
  { label: '霞鹜文楷', value: '"LXGW WenKai", serif' },
];

export const BaseStyleEditor: React.FC<BaseStyleEditorProps> = ({ value, onChange }) => {
  const handleChange = (field: keyof LayoutTemplateConfig['base'], val: any) => {
    onChange({ ...value, [field]: val });
  };

  const handleColorChange = (field: string, color: Color) => {
    handleChange(field as keyof LayoutTemplateConfig['base'], color.toHexString());
  };

  return (
    <Form layout="vertical" size="small">
      <Form.Item label="字体">
        <Select
          value={value.fontFamily}
          onChange={(v) => handleChange('fontFamily', v)}
          options={FONT_FAMILIES}
        />
      </Form.Item>

      <Form.Item label="字号">
        <InputNumber
          value={value.fontSize}
          onChange={(v) => handleChange('fontSize', v)}
          min={12}
          max={24}
          addonAfter="px"
          style={{ width: '100%' }}
        />
      </Form.Item>

      <Form.Item label="行高">
        <InputNumber
          value={value.lineHeight}
          onChange={(v) => handleChange('lineHeight', v)}
          min={1}
          max={3}
          step={0.1}
          style={{ width: '100%' }}
        />
      </Form.Item>

      <Form.Item label="文字颜色">
        <ColorPicker
          value={value.color}
          onChange={(c) => handleColorChange('color', c)}
          showText
        />
      </Form.Item>

      <Form.Item label="背景颜色">
        <ColorPicker
          value={value.backgroundColor || '#ffffff'}
          onChange={(c) => handleColorChange('backgroundColor', c)}
          showText
          allowClear
        />
      </Form.Item>

      <Form.Item label="字间距">
        <InputNumber
          value={value.letterSpacing || 0}
          onChange={(v) => handleChange('letterSpacing', v)}
          min={0}
          max={5}
          step={0.5}
          addonAfter="px"
          style={{ width: '100%' }}
        />
      </Form.Item>

      <Form.Item label="最大宽度">
        <InputNumber
          value={value.maxWidth}
          onChange={(v) => handleChange('maxWidth', v)}
          min={400}
          max={1200}
          step={50}
          addonAfter="px"
          style={{ width: '100%' }}
          placeholder="不限制"
        />
      </Form.Item>

      <Form.Item label="内边距">
        <InputNumber
          value={value.padding}
          onChange={(v) => handleChange('padding', v)}
          min={0}
          max={100}
          addonAfter="px"
          style={{ width: '100%' }}
        />
      </Form.Item>
    </Form>
  );
};

export default BaseStyleEditor;
