import { useState } from 'react';
import { Card, Button, Space, Input } from 'antd';
import { EditOutlined, ReloadOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface EditableResultProps {
  value: string;
  onChange: (value: string) => void;
  onRegenerate: () => void;
  loading?: boolean;
  title?: string;
  placeholder?: string;
}

export default function EditableResult({
  value,
  onChange,
  onRegenerate,
  loading = false,
  title,
  placeholder = '暂无内容',
}: EditableResultProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleEdit = () => {
    setEditValue(value);
    setIsEditing(true);
  };

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (!value && !isEditing) {
    return null;
  }

  return (
    <Card
      size="small"
      title={title}
      style={{ background: '#f6ffed' }}
      extra={
        <Space size="small">
          {isEditing ? (
            <>
              <Button
                size="small"
                icon={<CheckOutlined />}
                onClick={handleSave}
              >
                保存
              </Button>
              <Button
                size="small"
                icon={<CloseOutlined />}
                onClick={handleCancel}
              >
                取消
              </Button>
            </>
          ) : (
            <>
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={handleEdit}
              >
                编辑
              </Button>
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={onRegenerate}
                loading={loading}
              >
                重新生成
              </Button>
            </>
          )}
        </Space>
      }
    >
      {isEditing ? (
        <TextArea
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          autoSize={{ minRows: 4, maxRows: 20 }}
          placeholder={placeholder}
        />
      ) : (
        <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
          {value || placeholder}
        </pre>
      )}
    </Card>
  );
}
