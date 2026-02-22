/**
 * 系统设置页面
 */

import { Card, Tabs, Form, Input, Button, message, Select } from 'antd';
import WorkflowTemplateManager from '../components/Settings/WorkflowTemplateManager';
import MediaServiceManager from '../components/Settings/MediaServiceManager';

// 基本设置
function BasicSettings() {
  const [form] = Form.useForm();

  const handleSave = () => {
    message.success('设置已保存');
  };

  return (
    <Card>
      <Form form={form} layout="vertical" style={{ maxWidth: 500 }}>
        <Form.Item label="平台名称" name="siteName" initialValue="内容创作平台">
          <Input />
        </Form.Item>
        <Form.Item label="默认语言" name="language" initialValue="zh-CN">
          <Select options={[
            { label: '简体中文', value: 'zh-CN' },
            { label: 'English', value: 'en' },
          ]} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" onClick={handleSave}>保存</Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

// 存储设置
function StorageSettings() {
  return (
    <Card>
      <Form layout="vertical" style={{ maxWidth: 500 }}>
        <Form.Item label="存储类型" name="type" initialValue="local">
          <Select options={[
            { label: '本地存储', value: 'local' },
            { label: 'S3 兼容存储', value: 's3' },
          ]} />
        </Form.Item>
        <Form.Item label="S3 Endpoint" name="endpoint">
          <Input placeholder="https://oss.example.com" />
        </Form.Item>
        <Form.Item>
          <Button type="primary">保存</Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

export default function Settings() {
  return (
    <div style={{ padding: 24 }}>
      <h2>系统设置</h2>
      <Tabs
        items={[
          { key: 'basic', label: '基本设置', children: <BasicSettings /> },
          { key: 'media', label: '媒体服务', children: <MediaServiceManager /> },
          { key: 'workflow', label: '工作流配置', children: <WorkflowTemplateManager /> },
          { key: 'storage', label: '存储配置', children: <StorageSettings /> },
        ]}
      />
    </div>
  );
}
