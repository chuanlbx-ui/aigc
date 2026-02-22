/**
 * 模板版本历史组件
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Timeline,
  Button,
  Space,
  Typography,
  Spin,
  Empty,
  Tag,
  message,
  Popconfirm,
} from 'antd';
import {
  HistoryOutlined,
  RollbackOutlined,
  EyeOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface VersionInfo {
  id: string;
  version: number;
  changelog?: string;
  createdBy?: string;
  createdAt: string;
}

interface VersionHistoryProps {
  visible: boolean;
  templateId: string;
  templateType: string;
  templateName: string;
  onClose: () => void;
  onRestore?: (version: number) => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({
  visible,
  templateId,
  templateType,
  templateName,
  onClose,
  onRestore,
}) => {
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  useEffect(() => {
    if (visible && templateId) {
      fetchVersions();
    }
  }, [visible, templateId, templateType]);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/unified-templates/${templateType}/${templateId}/versions`
      );
      if (!response.ok) throw new Error('获取版本列表失败');
      const data = await response.json();
      setVersions(data.versions || []);
    } catch (error: any) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (version: number) => {
    try {
      onRestore?.(version);
      message.success(`已恢复到版本 ${version}`);
      onClose();
    } catch (error: any) {
      message.error(error.message || '恢复失败');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  return (
    <Modal
      title={
        <Space>
          <HistoryOutlined />
          <span>版本历史</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={560}
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">模板：</Text>
        <Text strong>{templateName}</Text>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : versions.length === 0 ? (
        <Empty description="暂无版本记录" />
      ) : (
        <Timeline
          items={versions.map((v, index) => ({
            color: index === 0 ? 'green' : 'gray',
            children: (
              <div key={v.id}>
                <Space>
                  <Tag color={index === 0 ? 'green' : 'default'}>
                    v{v.version}
                  </Tag>
                  <Text type="secondary">{formatDate(v.createdAt)}</Text>
                </Space>
                {v.changelog && (
                  <div style={{ marginTop: 4 }}>
                    <Text>{v.changelog}</Text>
                  </div>
                )}
                {index > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Space size="small">
                      <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => setSelectedVersion(v.version)}
                      >
                        查看
                      </Button>
                      <Popconfirm
                        title="确定恢复到此版本？"
                        onConfirm={() => handleRestore(v.version)}
                      >
                        <Button size="small" icon={<RollbackOutlined />}>
                          恢复
                        </Button>
                      </Popconfirm>
                    </Space>
                  </div>
                )}
              </div>
            ),
          }))}
        />
      )}
    </Modal>
  );
};

export default VersionHistory;
