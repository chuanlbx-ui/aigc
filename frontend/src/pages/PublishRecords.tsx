import { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, Select, message, Modal, Typography, Alert } from 'antd';
import { ReloadOutlined, SyncOutlined, EyeOutlined, ApiOutlined, ThunderboltOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Paragraph } = Typography;

interface PublishRecord {
  id: string;
  contentType: string;
  contentTitle: string;
  platformName: string;
  status: string;
  publishMode: string;
  publishMethod?: string;
  extensionTaskId?: string;
  extensionLogs?: string;
  errorMessage?: string;
  createdAt: string;
  publishedAt?: string;
}

const statusMap: Record<string, { color: string; text: string }> = {
  pending: { color: 'default', text: '等待中' },
  processing: { color: 'processing', text: '处理中' },
  draft_saved: { color: 'cyan', text: '已存草稿' },
  published: { color: 'success', text: '已发布' },
  failed: { color: 'error', text: '失败' },
  cancelled: { color: 'default', text: '已取消' },
};

export default function PublishRecords() {
  const [records, setRecords] = useState<PublishRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>();
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PublishRecord | null>(null);

  useEffect(() => {
    fetchRecords();
  }, [page, statusFilter]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize: 20 };
      if (statusFilter) params.status = statusFilter;
      const res = await axios.get('/api/publish/records', { params });
      setRecords(res.data.records);
      setTotal(res.data.total);
    } catch (error) {
      message.error('获取记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (id: string) => {
    try {
      await axios.post(`/api/publish/records/${id}/retry`);
      message.success('重试成功');
      fetchRecords();
    } catch (error: any) {
      message.error(error.response?.data?.error || '重试失败');
    }
  };

  const handleViewLogs = (record: PublishRecord) => {
    setSelectedRecord(record);
    setShowLogsModal(true);
  };

  const columns = [
    { title: '内容', dataIndex: 'contentTitle', ellipsis: true },
    { title: '平台', dataIndex: 'platformName' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (s: string) => {
        const info = statusMap[s] || { color: 'default', text: s };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '发布方式',
      dataIndex: 'publishMethod',
      width: 100,
      render: (method: string) => {
        if (method === 'extension') {
          return <Tag icon={<ThunderboltOutlined />} color="green">扩展</Tag>;
        }
        if (method === 'api') {
          return <Tag icon={<ApiOutlined />} color="blue">API</Tag>;
        }
        return <Tag>未知</Tag>;
      },
    },
    {
      title: '模式',
      dataIndex: 'publishMode',
      render: (m: string) => (m === 'draft' ? '草稿' : '发布'),
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      render: (t: string) => new Date(t).toLocaleString(),
    },
    {
      title: '操作',
      render: (_: any, r: PublishRecord) => (
        <Space>
          {r.publishMethod === 'extension' && (
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewLogs(r)}
            >
              日志
            </Button>
          )}
          {r.status === 'failed' && (
            <Button
              size="small"
              icon={<SyncOutlined />}
              onClick={() => handleRetry(r.id)}
            >
              重试
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="发布记录"
        extra={
          <Space>
            <Select
              placeholder="状态筛选"
              allowClear
              style={{ width: 120 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={Object.entries(statusMap).map(([k, v]) => ({
                label: v.text,
                value: k,
              }))}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchRecords}>
              刷新
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={records}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            total,
            pageSize: 20,
            onChange: setPage,
          }}
        />
      </Card>

      {/* 扩展日志查看 Modal */}
      <Modal
        title="扩展执行日志"
        open={showLogsModal}
        onCancel={() => setShowLogsModal(false)}
        footer={null}
        width={800}
      >
        {selectedRecord && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <strong>内容：</strong>{selectedRecord.contentTitle}
            </div>
            <div>
              <strong>平台：</strong>{selectedRecord.platformName}
            </div>
            <div>
              <strong>状态：</strong>
              {statusMap[selectedRecord.status]?.text || selectedRecord.status}
            </div>
            {selectedRecord.errorMessage && (
              <Alert
                message="错误信息"
                description={selectedRecord.errorMessage}
                type="error"
                showIcon
              />
            )}
            <div>
              <strong>执行日志：</strong>
              <Paragraph
                style={{
                  marginTop: 8,
                  padding: 12,
                  background: '#f5f5f5',
                  borderRadius: 4,
                  maxHeight: 400,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
              >
                {selectedRecord.extensionLogs
                  ? JSON.parse(selectedRecord.extensionLogs).join('\n')
                  : '暂无日志'}
              </Paragraph>
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
}
