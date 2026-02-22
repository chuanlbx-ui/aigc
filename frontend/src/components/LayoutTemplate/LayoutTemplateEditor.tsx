/**
 * 排版模板编辑器主组件
 */

import React, { useState, useCallback } from 'react';
import { Tabs, Button, Space, Input, message } from 'antd';
import { SaveOutlined, ReloadOutlined, EyeOutlined, CodeOutlined } from '@ant-design/icons';
import {
  BaseStyleEditor,
  HeadingStyleEditor,
  ParagraphStyleEditor,
  BlockquoteStyleEditor,
  CodeStyleEditor,
  LinkStyleEditor,
  ListStyleEditor,
  ImageStyleEditor,
  CustomCSSEditor,
} from './editors';
import { LayoutTemplatePreview } from './LayoutTemplatePreview';
import { LayoutTemplateConfig } from './types';
import { getDefaultConfig } from './presets/builtinThemes';

const { TextArea } = Input;

interface LayoutTemplateEditorProps {
  initialConfig?: LayoutTemplateConfig;
  themeId?: string;
  onSave?: (config: LayoutTemplateConfig) => Promise<void>;
  onCancel?: () => void;
}

// 工具栏组件
interface EditorToolbarProps {
  mode: 'visual' | 'json';
  saving: boolean;
  onModeChange: (mode: 'visual' | 'json') => void;
  onReset: () => void;
  onSave: () => void;
  onCancel?: () => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  mode, saving, onModeChange, onReset, onSave, onCancel
}) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <Space>
      <Button
        icon={mode === 'visual' ? <CodeOutlined /> : <EyeOutlined />}
        onClick={() => onModeChange(mode === 'visual' ? 'json' : 'visual')}
      >
        {mode === 'visual' ? 'JSON' : '可视化'}
      </Button>
      <Button icon={<ReloadOutlined />} onClick={onReset}>重置</Button>
    </Space>
    <Space>
      {onCancel && <Button onClick={onCancel}>取消</Button>}
      <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={onSave}>
        保存
      </Button>
    </Space>
  </div>
);

// 可视化编辑器
interface VisualEditorProps {
  config: LayoutTemplateConfig;
  updateConfig: (key: keyof LayoutTemplateConfig, value: any) => void;
  themeId: string;
}

const VisualEditor: React.FC<VisualEditorProps> = ({ config, updateConfig, themeId }) => {
  const items = [
    { key: 'base', label: '基础样式', children: (
      <BaseStyleEditor value={config.base} onChange={(v) => updateConfig('base', v)} />
    )},
    { key: 'headings', label: '标题样式', children: (
      <HeadingStyleEditor value={config.headings} onChange={(v) => updateConfig('headings', v)} />
    )},
    { key: 'paragraph', label: '段落样式', children: (
      <ParagraphStyleEditor value={config.paragraph} onChange={(v) => updateConfig('paragraph', v)} />
    )},
    { key: 'blockquote', label: '引用块', children: (
      <BlockquoteStyleEditor value={config.blockquote} onChange={(v) => updateConfig('blockquote', v)} />
    )},
    { key: 'code', label: '代码样式', children: (
      <CodeStyleEditor value={config.code} onChange={(v) => updateConfig('code', v)} />
    )},
    { key: 'link', label: '链接样式', children: (
      <LinkStyleEditor value={config.link} onChange={(v) => updateConfig('link', v)} />
    )},
    { key: 'list', label: '列表样式', children: (
      <ListStyleEditor value={config.list} onChange={(v) => updateConfig('list', v)} />
    )},
    { key: 'image', label: '图片样式', children: (
      <ImageStyleEditor value={config.image} onChange={(v) => updateConfig('image', v)} />
    )},
    { key: 'customCSS', label: '自定义CSS', children: (
      <CustomCSSEditor value={config.customCSS} onChange={(v) => updateConfig('customCSS', v)} themeId={themeId} />
    )},
  ];

  return <Tabs items={items} tabPosition="left" size="small" />;
};

// JSON 编辑器
interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const JsonEditor: React.FC<JsonEditorProps> = ({ value, onChange }) => (
  <TextArea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{ height: '100%', fontFamily: 'monospace', fontSize: 12 }}
    placeholder="输入 JSON 配置..."
  />
);

// 主编辑器组件
export const LayoutTemplateEditor: React.FC<LayoutTemplateEditorProps> = ({
  initialConfig,
  themeId = 'preview',
  onSave,
  onCancel,
}) => {
  const [config, setConfig] = useState<LayoutTemplateConfig>(
    initialConfig || getDefaultConfig()
  );
  const [mode, setMode] = useState<'visual' | 'json'>('visual');
  const [jsonText, setJsonText] = useState('');
  const [saving, setSaving] = useState(false);

  // 更新配置
  const updateConfig = useCallback((key: keyof LayoutTemplateConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  // 重置为默认
  const handleReset = useCallback(() => {
    setConfig(getDefaultConfig());
    message.success('已重置为默认配置');
  }, []);

  // 切换模式
  const handleModeChange = useCallback((newMode: 'visual' | 'json') => {
    if (newMode === 'json') {
      setJsonText(JSON.stringify(config, null, 2));
    } else {
      try {
        const parsed = JSON.parse(jsonText);
        setConfig(parsed);
      } catch {
        message.error('JSON 格式错误');
        return;
      }
    }
    setMode(newMode);
  }, [config, jsonText]);

  // 保存
  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(config);
      message.success('保存成功');
    } catch (err) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  }, [config, onSave]);

  return (
    <div style={{ display: 'flex', height: '100%', gap: 16 }}>
      {/* 左侧配置面板 */}
      <div style={{ width: 360, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <EditorToolbar
          mode={mode}
          saving={saving}
          onModeChange={handleModeChange}
          onReset={handleReset}
          onSave={handleSave}
          onCancel={onCancel}
        />
        <div style={{ flex: 1, overflow: 'auto', marginTop: 12 }}>
          {mode === 'visual' ? (
            <VisualEditor config={config} updateConfig={updateConfig} themeId={themeId} />
          ) : (
            <JsonEditor value={jsonText} onChange={setJsonText} />
          )}
        </div>
      </div>

      {/* 右侧预览 */}
      <div style={{ flex: 1, border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>
        <LayoutTemplatePreview config={config} themeId={themeId} />
      </div>
    </div>
  );
};

export default LayoutTemplateEditor;
