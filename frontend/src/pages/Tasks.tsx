import { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, message, Modal } from 'antd';
import { ReloadOutlined, StopOutlined, SyncOutlined, PlayCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import { api } from '../api/client';

interface Task {
  id: string;
  projectName: string;
  status: string;
  progress: number;
  createdAt: string;
  outputPath: string | null;
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewTask, setPreviewTask] = useState<Task | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const timer = setInterval(fetchTasks, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleCancel = async (id: string) => {
    await api.post(`/tasks/${id}/cancel`);
    message.success('已取消');
    fetchTasks();
  };

  const handleRetry = async (id: string) => {
    await api.post(`/tasks/${id}/retry`);
    message.success('已重试');
    fetchTasks();
  };

  const handleDownload = (id: string) => {
    window.open(`/api/tasks/${id}/video?download=true`, '_blank');
  };

  const columns = [
    { title: '项目名称', dataIndex: 'projectName', key: 'projectName' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config: Record<string, { color: string; label: string }> = {
          queued: { color: 'default', label: '排队中' },
          processing: { color: 'processing', label: '渲染中' },
          completed: { color: 'success', label: '已完成' },
          failed: { color: 'error', label: '失败' },
        };
        return <Tag color={config[status]?.color}>{config[status]?.label}</Tag>;
      },
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number) => `${progress}%`,
    },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Task) => (
        <Space>
          {record.status === 'completed' && (
            <>
              <Button icon={<PlayCircleOutlined />} size="small" onClick={() => setPreviewTask(record)}>
                预览
              </Button>
              <Button icon={<DownloadOutlined />} size="small" type="primary" onClick={() => handleDownload(record.id)}>
                下载
              </Button>
            </>
          )}
          {record.status === 'failed' && (
            <Button icon={<ReloadOutlined />} size="small" onClick={() => handleRetry(record.id)}>
              重试
            </Button>
          )}
          {record.status === 'processing' && (
            <Button icon={<StopOutlined />} size="small" danger onClick={() => handleCancel(record.id)}>
              取消
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<SyncOutlined />} onClick={fetchTasks} loading={loading}>
          刷新
        </Button>
      </div>
      <Table columns={columns} dataSource={tasks} rowKey="id" loading={loading} />

      {/* 视频预览弹窗 */}
      <Modal
        title={`预览: ${previewTask?.projectName}`}
        open={!!previewTask}
        footer={null}
        onCancel={() => setPreviewTask(null)}
        width={800}
        destroyOnClose
      >
        {previewTask && (
          <video
            src={`/api/tasks/${previewTask.id}/video`}
            controls
            autoPlay
            style={{ width: '100%' }}
          />
        )}
      </Modal>
    </div>
  );
}
