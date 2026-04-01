import { Button, Space } from 'antd';
import EditableResult from '../EditableResult';

interface Props {
  outlineResult: string;
  loading: boolean;
  onOutlineChange: (v: string) => void;
  onGenerate: () => Promise<void>;
}

export default function StepOutline({ outlineResult, loading, onOutlineChange, onGenerate }: Props) {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Button type="primary" onClick={onGenerate} loading={loading}>
        生成大纲
      </Button>
      <EditableResult
        value={outlineResult}
        onChange={onOutlineChange}
        onRegenerate={onGenerate}
        loading={loading}
      />
    </Space>
  );
}
