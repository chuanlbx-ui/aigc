import { useState, useEffect } from 'react';
import { Modal, Table, Tag, Button, Input, Popconfirm, message, Space } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useKnowledgeStore } from '../../stores/knowledge';

interface TagManagerProps {
  open: boolean;
  onCancel: () => void;
}

export default function TagManager({ open, onCancel }: TagManagerProps) {
  const { tags, fetchTags, fetchDocs } = useKnowledgeStore();
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    if (open) {
      fetchTags();
    }
  }, [open, fetchTags]);

  const handleRename = async (oldName: string) => {
    if (!newTagName.trim() || newTagName === oldName) {
      setEditingTag(null);
      setNewTagName('');
      return;
    }

    try {
      // 调用后端 API 重命名标签
      const response = await fetch('/api/knowledge/tags/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName: newTagName.trim() }),
      });

      if (response.ok) {
        message.success('标签重命名成功');
        fetchTags();
        fetchDocs();
      } else {
        message.error('标签重命名失败');
      }
    } catch (error) {
      message.error('标签重命名失败');
    }

    setEditingTag(null);
    setNewTagName('');
  };

  const handleDelete = async (tagName: string) => {
    try {
      // 调用后端 API 删除标签
      const response = await fetch('/api/knowledge/tags/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagName }),
      });

      if (response.ok) {
        message.success('标签删除成功');
        fetchTags();
        fetchDocs();
      } else {
        message.error('标签删除失败');
      }
    } catch (error) {
      message.error('标签删除失败');
    }
  };

  return (
    <Modal
      title="标签管理"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <Table
        dataSource={tags}
        rowKey="name"
        pagination={false}
        columns={[
          {
            title: '标签名称',
            dataIndex: 'name',
            render: (name: string) => {
              if (editingTag === name) {
                return (
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onPressEnter={() => handleRename(name)}
                    onBlur={() => handleRename(name)}
                    autoFocus
                  />
                );
              }
              return <Tag>{name}</Tag>;
            },
          },
          {
            title: '使用次数',
            dataIndex: 'count',
            width: 100,
          },
          {
            title: '操作',
            width: 150,
            render: (_: any, record: any) => (
              <Space>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setEditingTag(record.name);
                    setNewTagName(record.name);
                  }}
                >
                  重命名
                </Button>
                <Popconfirm
                  title={`确定删除标签"${record.name}"？这将从所有文档中移除该标签。`}
                  onConfirm={() => handleDelete(record.name)}
                >
                  <Button size="small" danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
    </Modal>
  );
}
