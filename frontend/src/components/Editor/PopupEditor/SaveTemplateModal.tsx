import { useState } from 'react';
import { Modal, Form, Input, message } from 'antd';
import type { Popup } from '../../../stores/editor';
import { createTemplate, type PopupTemplateConfig } from './templateApi';

interface SaveTemplateModalProps {
  open: boolean;
  popup: Popup | null;
  onSave: () => void;
  onCancel: () => void;
}

export default function SaveTemplateModal({ open, popup, onSave, onCancel }: SaveTemplateModalProps) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleOk = async () => {
    if (!popup) return;

    try {
      const values = await form.validateFields();
      setSaving(true);

      // 从弹窗配置中提取模板配置（排除实例相关字段）
      const { id, startTime, duration, mediaUrl, mediaAssetId, ...config } = popup;

      await createTemplate(values.name, config as PopupTemplateConfig, values.description);
      message.success('模板保存成功');
      form.resetFields();
      onSave();
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="保存为模板"
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={saving}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="模板名称"
          rules={[{ required: true, message: '请输入模板名称' }]}
        >
          <Input placeholder="例如：产品介绍卡片" />
        </Form.Item>
        <Form.Item name="description" label="模板描述">
          <Input.TextArea rows={2} placeholder="可选，描述模板的用途" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
