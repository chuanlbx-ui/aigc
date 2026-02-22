/**
 * 模板分享对话框
 */

import React, { useState } from 'react';
import {
  Modal,
  Form,
  Select,
  InputNumber,
  Button,
  Input,
  message,
  Space,
  Typography,
  Tooltip,
} from 'antd';
import {
  ShareAltOutlined,
  CopyOutlined,
  LinkOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface ShareDialogProps {
  visible: boolean;
  templateId: string;
  templateType: string;
  templateName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ShareInfo {
  id: string;
  shareCode: string;
  permission: string;
  expiresAt?: string;
  maxUses?: number;
  useCount: number;
  createdAt: string;
}

const ShareDialog: React.FC<ShareDialogProps> = ({
  visible,
  templateId,
  templateType,
  templateName,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const response = await fetch(
        `/api/unified-templates/${templateType}/${templateId}/share`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        }
      );

      if (!response.ok) {
        throw new Error('创建分享失败');
      }

      const data = await response.json();
      setShareInfo(data);
      message.success('分享链接已创建');
      onSuccess?.();
    } catch (error: any) {
      message.error(error.message || '创建分享失败');
    } finally {
      setLoading(false);
    }
  };

  const getShareUrl = () => {
    if (!shareInfo) return '';
    return `${window.location.origin}/templates/share/${shareInfo.shareCode}`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      message.success('链接已复制到剪贴板');
    } catch {
      message.error('复制失败');
    }
  };

  const handleClose = () => {
    setShareInfo(null);
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <ShareAltOutlined />
          <span>分享模板</span>
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={480}
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">模板：</Text>
        <Text strong>{templateName}</Text>
      </div>

      {!shareInfo ? (
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            permission: 'view',
            expiresInDays: 7,
          }}
        >
          <Form.Item
            name="permission"
            label="分享权限"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="view">仅查看</Select.Option>
              <Select.Option value="clone">允许克隆</Select.Option>
              <Select.Option value="edit">允许编辑</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="expiresInDays" label="有效期（天）">
            <InputNumber
              min={1}
              max={365}
              style={{ width: '100%' }}
              placeholder="留空表示永不过期"
            />
          </Form.Item>

          <Form.Item name="maxUses" label="最大使用次数">
            <InputNumber
              min={1}
              max={1000}
              style={{ width: '100%' }}
              placeholder="留空表示不限制"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              onClick={handleCreate}
              loading={loading}
              icon={<LinkOutlined />}
              block
            >
              生成分享链接
            </Button>
          </Form.Item>
        </Form>
      ) : (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">分享链接：</Text>
          </div>
          <Input.Group compact>
            <Input
              style={{ width: 'calc(100% - 80px)' }}
              value={getShareUrl()}
              readOnly
            />
            <Tooltip title="复制链接">
              <Button icon={<CopyOutlined />} onClick={copyToClipboard}>
                复制
              </Button>
            </Tooltip>
          </Input.Group>

          <div style={{ marginTop: 16 }}>
            <Space direction="vertical" size="small">
              <Text type="secondary">
                权限：
                {shareInfo.permission === 'view' && '仅查看'}
                {shareInfo.permission === 'clone' && '允许克隆'}
                {shareInfo.permission === 'edit' && '允许编辑'}
              </Text>
              {shareInfo.expiresAt && (
                <Text type="secondary">
                  过期时间：{new Date(shareInfo.expiresAt).toLocaleString()}
                </Text>
              )}
              {shareInfo.maxUses && (
                <Text type="secondary">
                  使用次数：{shareInfo.useCount} / {shareInfo.maxUses}
                </Text>
              )}
            </Space>
          </div>

          <div style={{ marginTop: 24 }}>
            <Button onClick={handleClose} block>
              关闭
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ShareDialog;
