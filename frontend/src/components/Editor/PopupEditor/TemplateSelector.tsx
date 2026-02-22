import { useState, useEffect } from 'react';
import { Modal, Tabs, Card, Row, Col, Spin, Empty, Popconfirm, message } from 'antd';
import { DeleteOutlined, FileTextOutlined, PictureOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { getTemplates, deleteTemplate, type PopupTemplate, type PopupTemplateConfig } from './templateApi';

interface TemplateSelectorProps {
  open: boolean;
  onSelect: (config: PopupTemplateConfig) => void;
  onCancel: () => void;
}

// 内容类型图标
const contentTypeIcons = {
  text: <FileTextOutlined />,
  image: <PictureOutlined />,
  video: <VideoCameraOutlined />,
};

export default function TemplateSelector({ open, onSelect, onCancel }: TemplateSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [systemTemplates, setSystemTemplates] = useState<PopupTemplate[]>([]);
  const [customTemplates, setCustomTemplates] = useState<PopupTemplate[]>([]);
  const [activeTab, setActiveTab] = useState('system');

  // 加载模板
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const all = await getTemplates();
      setSystemTemplates(all.filter(t => t.isSystem));
      setCustomTemplates(all.filter(t => !t.isSystem));
    } catch {
      message.error('加载模板失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  // 删除自定义模板
  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate(id);
      message.success('删除成功');
      setCustomTemplates(prev => prev.filter(t => t.id !== id));
    } catch {
      message.error('删除失败');
    }
  };

  // 渲染模板卡片
  const renderTemplateCard = (template: PopupTemplate, showDelete = false) => (
    <Col span={8} key={template.id}>
      <Card
        hoverable
        size="small"
        style={{ marginBottom: 12 }}
        onClick={() => onSelect(template.config)}
        actions={showDelete ? [
          <Popconfirm
            title="确定删除此模板？"
            onConfirm={(e) => { e?.stopPropagation(); handleDelete(template.id); }}
            onCancel={(e) => e?.stopPropagation()}
          >
            <DeleteOutlined onClick={(e) => e.stopPropagation()} />
          </Popconfirm>
        ] : undefined}
      >
        <Card.Meta
          avatar={contentTypeIcons[template.config.contentType]}
          title={template.name}
          description={template.description || '无描述'}
        />
      </Card>
    </Col>
  );

  return (
    <Modal
      title="选择弹窗模板"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={700}
    >
      <Spin spinning={loading}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'system',
              label: `系统预设 (${systemTemplates.length})`,
              children: (
                <Row gutter={12}>
                  {systemTemplates.length > 0 ? (
                    systemTemplates.map(t => renderTemplateCard(t))
                  ) : (
                    <Col span={24}><Empty description="暂无系统模板" /></Col>
                  )}
                </Row>
              ),
            },
            {
              key: 'custom',
              label: `我的模板 (${customTemplates.length})`,
              children: (
                <Row gutter={12}>
                  {customTemplates.length > 0 ? (
                    customTemplates.map(t => renderTemplateCard(t, true))
                  ) : (
                    <Col span={24}><Empty description="暂无自定义模板" /></Col>
                  )}
                </Row>
              ),
            },
          ]}
        />
      </Spin>
    </Modal>
  );
}
