import { useState, useEffect } from 'react';
import { Modal, Checkbox, Radio, Space, message, Alert, Badge } from 'antd';
import { WechatOutlined } from '@ant-design/icons';
import axios from 'axios';
import { BatchPublishProgress } from '../Publish/BatchPublishProgress';

interface Platform {
  id: string;
  name: string;
  displayName: string;
  isEnabled: boolean;
  publishMethod?: string;
  extensionRequired?: boolean;
}

interface BatchPublishModalProps {
  open: boolean;
  onClose: () => void;
  contentType: 'article' | 'video';
  contentIds: string[];
}

export default function BatchPublishModal({
  open,
  onClose,
  contentType,
  contentIds,
}: BatchPublishModalProps) {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [mode, setMode] = useState<'draft' | 'publish'>('draft');
  const [loading, setLoading] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPlatforms();
      setSelectedPlatforms([]);
      setBatchId(null);
      setShowProgress(false);
    }
  }, [open]);

  const fetchPlatforms = async () => {
    try {
      const res = await axios.get('/api/publish/platforms');
      setPlatforms(res.data.filter((p: Platform) => p.isEnabled));
    } catch (error) {
      message.error('获取平台列表失败');
    }
  };

  const handleSubmit = async () => {
    if (selectedPlatforms.length === 0) {
      message.warning('请选择至少一个平台');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/publish/batch', {
        contentType,
        contentIds,
        platformIds: selectedPlatforms,
        mode,
      });

      message.success(`已创建 ${res.data.totalCount} 个发布任务`);
      setBatchId(res.data.batchId);
      setShowProgress(true);
    } catch (error: any) {
      message.error(error.response?.data?.error || '发布失败');
    } finally {
      setLoading(false);
    }
  };

  const handleProgressClose = () => {
    setShowProgress(false);
    setBatchId(null);
    onClose();
  };

  return (
    <Modal
      title="批量发布"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="开始发布"
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Alert
          message={`已选择 ${contentIds.length} 篇${contentType === 'article' ? '文章' : '视频'}`}
          type="info"
          showIcon
        />

        <div>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>选择发布平台</div>
          {platforms.length === 0 ? (
            <Alert message="暂无可用平台，请先配置" type="warning" />
          ) : (
            <Checkbox.Group
              value={selectedPlatforms}
              onChange={(v) => setSelectedPlatforms(v as string[])}
            >
              <Space direction="vertical">
                {platforms.map((p) => (
                  <Checkbox key={p.id} value={p.id}>
                    <Space>
                      <WechatOutlined />
                      {p.displayName}
                      {p.publishMethod === 'extension' && (
                        <Badge count="扩展" style={{ backgroundColor: '#52c41a' }} />
                      )}
                      {p.publishMethod === 'api' && (
                        <Badge count="API" style={{ backgroundColor: '#1890ff' }} />
                      )}
                      {p.extensionRequired && (
                        <Badge count="需扩展" style={{ backgroundColor: '#faad14' }} />
                      )}
                    </Space>
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          )}
        </div>

        <div>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>发布模式</div>
          <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
            <Radio value="draft">保存到草稿箱</Radio>
            <Radio value="publish">直接发布</Radio>
          </Radio.Group>
        </div>

      </Space>

      {/* 批量发布进度显示 */}
      {showProgress && batchId && (
        <BatchPublishProgress batchId={batchId} onClose={handleProgressClose} />
      )}
    </Modal>
  );
}
