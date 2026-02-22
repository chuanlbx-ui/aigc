/**
 * 工作流配置模板编辑器
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Tabs,
  Button,
  Space,
  message,
  Spin,
} from 'antd';
import { SaveOutlined } from '@ant-design/icons';

interface WorkflowTemplateEditorProps {
  visible: boolean;
  templateId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const WorkflowTemplateEditor: React.FC<WorkflowTemplateEditorProps> = ({
  visible,
  templateId,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 加载模板数据
  useEffect(() => {
    if (visible && templateId) {
      loadTemplate();
    } else if (visible && !templateId) {
      form.resetFields();
    }
  }, [visible, templateId]);

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/workflow-templates/${templateId}`);
      const data = await response.json();

      form.setFieldsValue({
        name: data.name,
        description: data.description,
        platform: data.platform,
        column: data.column,
        isDefault: data.isDefault,
      });
    } catch (error) {
      message.error('加载模板失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const url = templateId
        ? `/api/workflow-templates/${templateId}`
        : '/api/workflow-templates';

      const method = templateId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success(templateId ? '更新成功' : '创建成功');
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        message.error(error.error || '保存失败');
      }
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={templateId ? '编辑模板' : '新建模板'}
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={handleSave}
        >
          保存
        </Button>,
      ]}
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="模板名称"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="例如：深度分析模板" />
          </Form.Item>

          <Form.Item name="description" label="模板描述">
            <Input.TextArea
              rows={3}
              placeholder="描述此模板的用途和特点"
            />
          </Form.Item>

          <Space style={{ width: '100%' }}>
            <Form.Item name="platform" label="适用平台">
              <Select style={{ width: 150 }} placeholder="选择平台" allowClear>
                <Select.Option value="wechat">公众号</Select.Option>
                <Select.Option value="xiaohongshu">小红书</Select.Option>
                <Select.Option value="video">视频</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="column" label="适用栏目">
              <Input style={{ width: 150 }} placeholder="例如：深度" />
            </Form.Item>
          </Space>

          <Form.Item name="isDefault" label="设为默认模板" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default WorkflowTemplateEditor;
