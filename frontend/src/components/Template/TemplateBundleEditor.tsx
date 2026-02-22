/**
 * 模板组合编辑器
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  List,
  Card,
  Space,
  message,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  HolderOutlined,
} from '@ant-design/icons';

const { TextArea } = Input;

interface BundleItem {
  id?: string;
  templateId: string;
  templateType: string;
  templateName?: string;
  sortOrder: number;
}

interface TemplateBundleEditorProps {
  visible: boolean;
  bundleId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function TemplateBundleEditor({
  visible,
  bundleId,
  onClose,
  onSuccess,
}: TemplateBundleEditorProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<BundleItem[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  // 加载模板列表
  useEffect(() => {
    if (visible) {
      fetchTemplates();
      if (bundleId) {
        fetchBundle();
      } else {
        form.resetFields();
        setItems([]);
      }
    }
  }, [visible, bundleId]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/unified-templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (error) {
      message.error('加载模板失败');
    }
  };

  const fetchBundle = async () => {
    try {
      const res = await fetch(`/api/template-bundles/${bundleId}`);
      const data = await res.json();
      form.setFieldsValue({
        name: data.name,
        description: data.description,
        bundleType: data.bundleType,
      });
      setItems(data.items || []);
    } catch (error) {
      message.error('加载组合包失败');
    }
  };

  // 添加模板项
  const handleAddItem = () => {
    setItems([...items, {
      templateId: '',
      templateType: 'general',
      sortOrder: items.length,
    }]);
  };

  // 删除模板项
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // 更新模板项
  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  // 保存
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (items.length === 0) {
        message.error('请至少添加一个模板');
        return;
      }

      setLoading(true);
      const url = bundleId
        ? `/api/template-bundles/${bundleId}`
        : '/api/template-bundles';
      const method = bundleId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, items }),
      });

      if (!res.ok) throw new Error('保存失败');
      message.success(bundleId ? '更新成功' : '创建成功');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={bundleId ? '编辑组合包' : '创建组合包'}
      open={visible}
      onCancel={onClose}
      width={700}
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleSave} loading={loading}>
            保存
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" initialValues={{ bundleType: 'sequential' }}>
        <Form.Item name="name" label="名称" rules={[{ required: true }]}>
          <Input placeholder="输入组合包名称" />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <TextArea rows={2} placeholder="可选描述" />
        </Form.Item>
        <Form.Item name="bundleType" label="组合类型">
          <Select>
            <Select.Option value="sequential">顺序执行</Select.Option>
            <Select.Option value="parallel">并行执行</Select.Option>
            <Select.Option value="conditional">条件执行</Select.Option>
          </Select>
        </Form.Item>
      </Form>

      <div style={{ marginBottom: 8 }}>
        <Space>
          <span>模板列表</span>
          <Button size="small" icon={<PlusOutlined />} onClick={handleAddItem}>
            添加
          </Button>
        </Space>
      </div>

      {items.length === 0 ? (
        <Empty description="暂无模板，点击添加" />
      ) : (
        <List
          dataSource={items}
          renderItem={(item, index) => (
            <Card size="small" style={{ marginBottom: 8 }}>
              <Space style={{ width: '100%' }}>
                <HolderOutlined style={{ cursor: 'move', color: '#999' }} />
                <Select
                  style={{ width: 200 }}
                  placeholder="选择模板"
                  value={item.templateId || undefined}
                  onChange={(v) => handleUpdateItem(index, 'templateId', v)}
                >
                  {templates.map((t) => (
                    <Select.Option key={t.id} value={t.id}>
                      {t.name}
                    </Select.Option>
                  ))}
                </Select>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemoveItem(index)}
                />
              </Space>
            </Card>
          )}
        />
      )}
    </Modal>
  );
}
