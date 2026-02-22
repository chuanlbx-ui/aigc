/**
 * 代码样式编辑器
 */

import React from 'react';
import { Form, Input, ColorPicker, Collapse } from 'antd';
import type { Color } from 'antd/es/color-picker';
import { LayoutTemplateConfig } from '../types';

interface CodeStyleEditorProps {
  value: LayoutTemplateConfig['code'];
  onChange: (value: LayoutTemplateConfig['code']) => void;
}

export const CodeStyleEditor: React.FC<CodeStyleEditorProps> = ({ value, onChange }) => {
  const handleInlineChange = (field: string, val: any) => {
    onChange({ ...value, inline: { ...value.inline, [field]: val } });
  };

  const handleBlockChange = (field: string, val: any) => {
    onChange({ ...value, block: { ...value.block, [field]: val } });
  };

  const items = [
    {
      key: 'inline',
      label: '行内代码',
      children: (
        <Form layout="vertical" size="small">
          <Form.Item label="背景颜色">
            <ColorPicker
              value={value.inline.backgroundColor}
              onChange={(c: Color) => handleInlineChange('backgroundColor', c.toHexString())}
              showText
            />
          </Form.Item>
          <Form.Item label="文字颜色">
            <ColorPicker
              value={value.inline.color}
              onChange={(c: Color) => handleInlineChange('color', c.toHexString())}
              showText
            />
          </Form.Item>
          <Form.Item label="内边距">
            <Input
              value={value.inline.padding}
              onChange={(e) => handleInlineChange('padding', e.target.value)}
              placeholder="如: 2px 6px"
            />
          </Form.Item>
          <Form.Item label="圆角">
            <Input
              value={value.inline.borderRadius}
              onChange={(e) => handleInlineChange('borderRadius', e.target.value)}
              placeholder="如: 3px"
            />
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'block',
      label: '代码块',
      children: (
        <Form layout="vertical" size="small">
          <Form.Item label="背景颜色">
            <ColorPicker
              value={value.block.backgroundColor}
              onChange={(c: Color) => handleBlockChange('backgroundColor', c.toHexString())}
              showText
            />
          </Form.Item>
          <Form.Item label="文字颜色">
            <ColorPicker
              value={value.block.color || '#333333'}
              onChange={(c: Color) => handleBlockChange('color', c.toHexString())}
              showText
              allowClear
            />
          </Form.Item>
          <Form.Item label="内边距">
            <Input
              value={value.block.padding}
              onChange={(e) => handleBlockChange('padding', e.target.value)}
              placeholder="如: 16px"
            />
          </Form.Item>
          <Form.Item label="圆角">
            <Input
              value={value.block.borderRadius}
              onChange={(e) => handleBlockChange('borderRadius', e.target.value)}
              placeholder="如: 6px"
            />
          </Form.Item>
        </Form>
      ),
    },
  ];

  return <Collapse items={items} defaultActiveKey={['inline']} size="small" />;
};

export default CodeStyleEditor;
