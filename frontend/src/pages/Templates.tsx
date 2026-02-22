/**
 * 统一模板管理页面
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Empty,
  Spin,
  Tabs,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Dropdown,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  EllipsisOutlined,
  ShareAltOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  cloneTemplate,
  UnifiedTemplate,
  TemplateType,
} from '../components/Template/api';
import TemplateRecommendation from '../components/Template/TemplateRecommendation';
import ShareDialog from '../components/Template/ShareDialog';
import VersionHistory from '../components/Template/VersionHistory';
import { LayoutTemplateEditor, LayoutTemplateConfig } from '../components/LayoutTemplate';

const { TextArea } = Input;
const { Search } = Input;

// 模板类型配置
const typeConfig: Record<TemplateType, { label: string; color: string }> = {
  popup: { label: '弹窗模板', color: 'blue' },
  workflow: { label: '工作流模板', color: 'green' },
  general: { label: '通用模板', color: 'purple' },
  layout: { label: '排版模板', color: 'orange' },
};

// 模板卡片组件
interface TemplateCardItemProps {
  template: UnifiedTemplate;
  onEdit: (t: UnifiedTemplate) => void;
  onDelete: (t: UnifiedTemplate) => void;
  onClone: (t: UnifiedTemplate) => void;
  onShare: (t: UnifiedTemplate) => void;
  onHistory: (t: UnifiedTemplate) => void;
}

function TemplateCardItem({ template, onEdit, onDelete, onClone, onShare, onHistory }: TemplateCardItemProps) {
  const menuItems: MenuProps['items'] = [
    { key: 'clone', icon: <CopyOutlined />, label: '克隆', onClick: () => onClone(template) },
    { key: 'share', icon: <ShareAltOutlined />, label: '分享', onClick: () => onShare(template) },
    { key: 'history', icon: <HistoryOutlined />, label: '版本历史', onClick: () => onHistory(template) },
  ];

  if (!template.isSystem) {
    menuItems.unshift({ key: 'edit', icon: <EditOutlined />, label: '编辑', onClick: () => onEdit(template) });
    menuItems.push({ key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true, onClick: () => onDelete(template) });
  }

  const config = typeConfig[template.type];

  return (
    <Card hoverable style={{ height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Space style={{ marginBottom: 8 }}>
            <Tag color={config.color}>{config.label}</Tag>
            {template.isSystem && <Tag color="gold">系统</Tag>}
          </Space>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>{template.name}</div>
          <div style={{ color: '#999', fontSize: 12 }}>{template.description || '暂无描述'}</div>
        </div>
        <Dropdown menu={{ items: menuItems }} trigger={['click']}>
          <Button
            type="text"
            icon={<EllipsisOutlined />}
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>
      </div>
    </Card>
  );
}

export default function Templates() {
  const [templates, setTemplates] = useState<UnifiedTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<TemplateType | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<UnifiedTemplate | null>(null);
  const [shareDialogVisible, setShareDialogVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<UnifiedTemplate | null>(null);
  const [layoutEditorVisible, setLayoutEditorVisible] = useState(false);
  const [editingLayoutTemplate, setEditingLayoutTemplate] = useState<UnifiedTemplate | null>(null);
  const [form] = Form.useForm();

  // 加载模板
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTemplates({
        type: activeType === 'all' ? undefined : activeType,
        search: searchText || undefined,
      });
      setTemplates(result.templates);
    } catch (error) {
      message.error('获取模板失败');
    } finally {
      setLoading(false);
    }
  }, [activeType, searchText]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // 创建模板
  const handleCreate = () => {
    const targetType = activeType === 'all' ? 'general' : activeType;
    // 排版模板使用专用编辑器
    if (targetType === 'layout') {
      setEditingLayoutTemplate(null);
      setLayoutEditorVisible(true);
      return;
    }
    setEditingTemplate(null);
    form.resetFields();
    form.setFieldsValue({ type: targetType });
    setModalVisible(true);
  };

  // 编辑模板
  const handleEdit = (template: UnifiedTemplate) => {
    // 排版模板使用专用编辑器
    if (template.type === 'layout') {
      setEditingLayoutTemplate(template);
      setLayoutEditorVisible(true);
      return;
    }
    setEditingTemplate(template);
    form.setFieldsValue({
      type: template.type,
      name: template.name,
      description: template.description,
      config: JSON.stringify(template.config, null, 2),
    });
    setModalVisible(true);
  };

  // 删除模板
  const handleDelete = async (template: UnifiedTemplate) => {
    try {
      await deleteTemplate(template.type, template.id);
      message.success('删除成功');
      fetchTemplates();
    } catch (error: any) {
      message.error(error.response?.data?.error || '删除失败');
    }
  };

  // 克隆模板
  const handleClone = async (template: UnifiedTemplate) => {
    try {
      await cloneTemplate(template.type, template.id);
      message.success('克隆成功');
      fetchTemplates();
    } catch (error) {
      message.error('克隆失败');
    }
  };

  // 分享模板
  const handleShare = (template: UnifiedTemplate) => {
    setSelectedTemplate(template);
    setShareDialogVisible(true);
  };

  // 查看版本历史
  const handleHistory = (template: UnifiedTemplate) => {
    setSelectedTemplate(template);
    setHistoryVisible(true);
  };

  // 保存模板
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const config = values.config ? JSON.parse(values.config) : {};

      if (editingTemplate) {
        await updateTemplate(editingTemplate.type, editingTemplate.id, {
          name: values.name,
          description: values.description,
          config,
        });
        message.success('更新成功');
      } else {
        await createTemplate({
          type: values.type,
          name: values.name,
          description: values.description,
          config,
        });
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchTemplates();
    } catch (error) {
      message.error('保存失败');
    }
  };

  // 保存排版模板
  const handleSaveLayoutTemplate = async (config: LayoutTemplateConfig) => {
    if (editingLayoutTemplate) {
      await updateTemplate('layout', editingLayoutTemplate.id, {
        name: editingLayoutTemplate.name,
        description: editingLayoutTemplate.description,
        config,
      });
    } else {
      await createTemplate({
        type: 'layout',
        name: '新排版模板',
        description: '',
        config,
      });
    }
    setLayoutEditorVisible(false);
    fetchTemplates();
  };

  // Tab 配置
  const tabItems = [
    { key: 'all', label: '全部模板' },
    { key: 'popup', label: '弹窗模板' },
    { key: 'workflow', label: '工作流模板' },
    { key: 'general', label: '通用模板' },
    { key: 'layout', label: '排版模板' },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* 顶部操作栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Search
          placeholder="搜索模板名称"
          allowClear
          onSearch={setSearchText}
          style={{ width: 300 }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建模板
        </Button>
      </div>

      {/* 类型切换 */}
      <Tabs
        activeKey={activeType}
        onChange={(key) => setActiveType(key as TemplateType | 'all')}
        items={tabItems}
      />

      {/* 推荐区域 - 仅在选择具体类型时显示 */}
      {activeType !== 'all' && (
        <Card style={{ marginBottom: 16 }} size="small">
          <TemplateRecommendation
            type={activeType}
            onSelect={(template) => handleEdit(template)}
          />
        </Card>
      )}

      {/* 模板列表 */}
      <Spin spinning={loading}>
        {templates.length === 0 ? (
          <Card>
            <Empty description="暂无模板" />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {templates.map((template) => (
              <Col key={template.id} xs={24} sm={12} md={8} lg={6}>
                <TemplateCardItem
                  template={template}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onClone={handleClone}
                  onShare={handleShare}
                  onHistory={handleHistory}
                />
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      {/* 编辑弹窗 */}
      <Modal
        title={editingTemplate ? '编辑模板' : '新建模板'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select
              disabled={!!editingTemplate}
              options={[
                { label: '弹窗模板', value: 'popup' },
                { label: '工作流模板', value: 'workflow' },
                { label: '通用模板', value: 'general' },
                { label: '排版模板', value: 'layout' },
              ]}
            />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item name="config" label="配置 (JSON)">
            <TextArea rows={6} placeholder="{}" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 分享对话框 */}
      {selectedTemplate && (
        <ShareDialog
          visible={shareDialogVisible}
          templateId={selectedTemplate.id}
          templateType={selectedTemplate.type}
          templateName={selectedTemplate.name}
          onClose={() => setShareDialogVisible(false)}
        />
      )}

      {/* 版本历史 */}
      {selectedTemplate && (
        <VersionHistory
          visible={historyVisible}
          templateId={selectedTemplate.id}
          templateType={selectedTemplate.type}
          templateName={selectedTemplate.name}
          onClose={() => setHistoryVisible(false)}
        />
      )}

      {/* 排版模板编辑器 */}
      <Modal
        title={editingLayoutTemplate ? '编辑排版模板' : '新建排版模板'}
        open={layoutEditorVisible}
        onCancel={() => setLayoutEditorVisible(false)}
        footer={null}
        width={1200}
        style={{ top: 20 }}
        bodyStyle={{ height: 'calc(100vh - 160px)', padding: 16 }}
      >
        <LayoutTemplateEditor
          initialConfig={editingLayoutTemplate?.config as LayoutTemplateConfig}
          themeId={editingLayoutTemplate?.id || 'new'}
          onSave={handleSaveLayoutTemplate}
          onCancel={() => setLayoutEditorVisible(false)}
        />
      </Modal>
    </div>
  );
}
