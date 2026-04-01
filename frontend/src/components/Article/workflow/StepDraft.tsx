import { Button, Divider, Input, Space } from 'antd';

interface Props {
  outlineResult: string;
  content: string;
  optimizeInstruction: string;
  draftLoading: boolean;
  optimizing: boolean;
  onOptimizeInstructionChange: (v: string) => void;
  onGenerate: () => Promise<void>;
  onOptimize: () => Promise<void>;
}

export default function StepDraft({
  outlineResult, content, optimizeInstruction,
  draftLoading, optimizing,
  onOptimizeInstructionChange, onGenerate, onOptimize,
}: Props) {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Button
        type="primary"
        onClick={onGenerate}
        loading={draftLoading}
        disabled={!outlineResult}
      >
        生成初稿
      </Button>
      {!outlineResult && (
        <div style={{ color: '#faad14', fontSize: 12 }}>请先生成大纲</div>
      )}
      <Divider style={{ margin: '12px 0' }} />
      <div style={{ color: '#666', fontSize: 12 }}>
        针对性优化：输入优化指令，AI 将根据指令优化文章
      </div>
      <Input.TextArea
        placeholder="输入优化指令，如：加强开头吸引力、补充数据支撑、增加案例说明..."
        value={optimizeInstruction}
        onChange={e => onOptimizeInstructionChange(e.target.value)}
        autoSize={{ minRows: 2, maxRows: 4 }}
      />
      <Button onClick={onOptimize} loading={optimizing} disabled={!content.trim()}>
        针对性优化
      </Button>
    </Space>
  );
}
