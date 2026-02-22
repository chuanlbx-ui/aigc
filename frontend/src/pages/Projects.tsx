import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Row, Col, Input, Select, Button, Table, Tag, Space,
  Modal, Form, Popconfirm, message, Tooltip, Pagination, Empty
} from 'antd';
import {
  PlusOutlined, SearchOutlined, FolderOutlined,
  EditOutlined, DeleteOutlined, PlayCircleOutlined,
  VideoCameraOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import { useProjectStore } from '../stores/project';

export default function Projects() {
  const navigate = useNavigate();
  const { projects, loading, fetchProjects, deleteProject } = useProjectStore();

  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectForm] = Form.useForm();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // 筛选后的项目列表
  const filteredProjects = projects.filter(p => {
    const matchSearch = !searchText || p.name.toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = !selectedStatus || p.status === selectedStatus;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    message.success('删除成功');
  };

  // 查看视频
  const handleViewVideo = (record: { id: string; outputPath?: string }) => {
    if (!record.outputPath) {
      message.warning('视频文件不存在');
      return;
    }
    // 打开视频文件（相对于 public 目录）
    const videoUrl = `http://localhost:3001/${record.outputPath}`;
    window.open(videoUrl, '_blank');
  };

  // 新建项目
  const handleCreateProject = async () => {
    const values = await newProjectForm.validateFields();
    // 直接跳转到编辑器，带上项目名称参数
    newProjectForm.resetFields();
    setShowNewProjectModal(false);
    navigate('/editor/new', { state: { projectName: values.name } });
  };

  const columns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: { id: string }) => (
        <a onClick={() => navigate(`/editor/${record.id}/edit`)}>
          <VideoCameraOutlined style={{ marginRight: 8 }} />
          {name}
        </a>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colors: Record<string, string> = {
          draft: 'default',
          rendering: 'processing',
          completed: 'success',
          failed: 'error',
        };
        const labels: Record<string, string> = {
          draft: '草稿',
          rendering: '渲染中',
          completed: '已完成',
          failed: '失败',
        };
        return <Tag color={colors[status]}>{labels[status] || status}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: { id: string; status: string }) => (
        <Space>
          <Tooltip title="编辑">
            <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/editor/${record.id}/edit`)} />
          </Tooltip>
          {record.status === 'completed' && (
            <Tooltip title="查看视频">
              <Button
                size="small"
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => handleViewVideo(record)}
              />
            </Tooltip>
          )}
          <Popconfirm title="确定删除此项目？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* 页面标题和操作按钮 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>视频创作</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowNewProjectModal(true)}>
          新建项目
        </Button>
      </div>

      <Row gutter={24}>
        {/* 左侧筛选 */}
        <Col span={5}>
          <Card title="状态筛选" size="small">
            {[
              { value: null, label: '全部项目', icon: <FolderOutlined /> },
              { value: 'draft', label: '草稿' },
              { value: 'rendering', label: '渲染中' },
              { value: 'completed', label: '已完成' },
              { value: 'failed', label: '失败' },
            ].map(item => (
              <div
                key={item.value || 'all'}
                style={{
                  padding: '8px 0',
                  cursor: 'pointer',
                  color: selectedStatus === item.value ? '#1890ff' : 'inherit',
                  background: selectedStatus === item.value ? '#e6f7ff' : 'transparent',
                  paddingLeft: 8,
                  borderRadius: 4,
                }}
                onClick={() => setSelectedStatus(item.value)}
              >
                {item.icon} {item.label}
              </div>
            ))}
          </Card>
        </Col>

        {/* 右侧项目列表 */}
        <Col span={19}>
          <Card>
            {/* 搜索栏 */}
            <Space style={{ marginBottom: 16 }}>
              <Input
                placeholder="搜索项目..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                style={{ width: 300 }}
                allowClear
              />
            </Space>

            {/* 项目列表 */}
            <Table
              columns={columns}
              dataSource={filteredProjects}
              loading={loading}
              rowKey="id"
              pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 个项目` }}
            />
          </Card>
        </Col>
      </Row>

      {/* 新建项目弹窗 */}
      <Modal
        title="新建视频项目"
        open={showNewProjectModal}
        onCancel={() => { setShowNewProjectModal(false); newProjectForm.resetFields(); }}
        onOk={handleCreateProject}
        okText="创建"
        width={400}
      >
        <Form form={newProjectForm} layout="vertical">
          <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
            <Input placeholder="输入项目名称" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
