import { Button, Input, Space } from 'antd';
import EditableResult from '../EditableResult';

interface Props {
  topicInput: string;
  topicResult: string;
  loading: boolean;
  similarityResult: any;
  onTopicInputChange: (v: string) => void;
  onTopicResultChange: (v: string) => void;
  onAnalyze: () => Promise<void>;
}

export default function StepTopic({
  topicInput, topicResult, loading, similarityResult,
  onTopicInputChange, onTopicResultChange, onAnalyze,
}: Props) {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Input
        placeholder="输入选题关键词"
        value={topicInput}
        onChange={e => onTopicInputChange(e.target.value)}
      />
      <Button type="primary" onClick={onAnalyze} loading={loading}>
        开始分析
      </Button>
      {similarityResult?.hasSimilar && (
        <div style={{ padding: 8, background: '#fffbe6', borderRadius: 6, fontSize: 12, color: '#ad6800' }}>
          发现相似选题，可能已写过类似内容
        </div>
      )}
      <EditableResult
        value={topicResult}
        onChange={onTopicResultChange}
        onRegenerate={onAnalyze}
        loading={loading}
      />
    </Space>
  );
}
