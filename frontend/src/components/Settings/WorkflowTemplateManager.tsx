/**
 * 工作流配置模板管理器
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Input,
  Select,
  Space,
  Modal,
  message,
  Spin,
  Empty,
  Tag,
  Popconfirm,
  Upload,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  ExportOutlined,
  ImportOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import TemplateCard from './TemplateCard';
import PresetCard from './PresetCard';
import ImportModal from './ImportModal';
import WorkflowTemplateEditor from './WorkflowTemplateEditor';

interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'system' | 'custom';
  isSystem: boolean;
  isDefault: boolean;
  platform?: string;
  column?: string;
  usageCount: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PresetTemplate {
  id: string;
  name: string;
  description: string;
  platform: string;
  column: string;
}

const WorkflowTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [presets, setPresets] = useState<PresetTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importData, setImportData] = useState<string>('');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string>();

  // 加载模板列表
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (platformFilter) params.append('platform', platformFilter);
      if (typeFilter) params.append('type', typeFilter);

      const response = await fetch(`/api/workflow-templates?${params}`);
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      message.error('加载模板列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载预设模板列表
  const loadPresets = async () => {
    try {
      const response = await fetch('/api/workflow-templates/presets');
      const data = await response.json();
      setPresets(data.presets || []);
    } catch (error) {
      message.error('加载预设模板失败');
    }
  };

  useEffect(() => {
    loadTemplates();
    loadPresets();
  }, [platformFilter, typeFilter]);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Space>
          <Input.Search
            placeholder="搜索模板"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
          />
          <Select
            placeholder="平台"
            value={platformFilter}
            onChange={setPlatformFilter}
            style={{ width: 120 }}
            allowClear
          >
            <Select.Option value="wechat">公众号</Select.Option>
            <Select.Option value="xiaohongshu">小红书</Select.Option>
            <Select.Option value="video">视频</Select.Option>
          </Select>
          <Select
            placeholder="类型"
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: 120 }}
            allowClear
          >
            <Select.Option value="system">系统预设</Select.Option>
            <Select.Option value="custom">自定义</Select.Option>
          </Select>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingTemplateId(undefined);
              setEditorVisible(true);
            }}
          >
            新建模板
          </Button>
          <Button icon={<ImportOutlined />} onClick={() => setImportModalVisible(true)}>
            导入配置
          </Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        {/* 已安装的系统模板 */}
        {templates.filter(t => t.type === 'system').length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h3>已安装的系统模板 ({templates.filter(t => t.type === 'system').length})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {templates
                .filter(t => t.type === 'system')
                .map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onUpdate={loadTemplates}
                    onEdit={(id) => {
                      setEditingTemplateId(id);
                      setEditorVisible(true);
                    }}
                  />
                ))}
            </div>
          </div>
        )}

        {/* 系统预设模板（未安装） */}
        {presets.filter(p => !templates.some(t => t.type === 'system' && t.name === p.name)).length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h3>可安装的预设模板 ({presets.filter(p => !templates.some(t => t.type === 'system' && t.name === p.name)).length})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {presets
                .filter(p => !templates.some(t => t.type === 'system' && t.name === p.name))
                .map((preset) => (
                  <PresetCard key={preset.id} preset={preset} onInstall={loadTemplates} />
                ))}
            </div>
          </div>
        )}

        {/* 我的模板 */}
        <div>
          <h3>我的模板 ({templates.filter(t => t.type === 'custom').length})</h3>
          {templates.filter(t => t.type === 'custom').length === 0 ? (
            <Empty description="暂无自定义模板" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {templates
                .filter(t => t.type === 'custom')
                .filter(t => !searchText || t.name.includes(searchText))
                .map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onUpdate={loadTemplates}
                    onEdit={(id) => {
                      setEditingTemplateId(id);
                      setEditorVisible(true);
                    }}
                  />
                ))}
            </div>
          )}
        </div>
      </Spin>

      {/* 导入配置对话框 */}
      <ImportModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        onSuccess={loadTemplates}
      />

      {/* 模板编辑器 */}
      <WorkflowTemplateEditor
        visible={editorVisible}
        templateId={editingTemplateId}
        onClose={() => setEditorVisible(false)}
        onSuccess={loadTemplates}
      />
    </div>
  );
};

export default WorkflowTemplateManager;
