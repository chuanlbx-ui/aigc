import { Button, Input, Space } from 'antd';
import { api } from '../../../api/client';

interface Props {
  articlePlatform: string;
  articleColumn: string;
  notes: string;
  metricsData: any;
  onNotesChange: (v: string) => void;
  onComplete: (notes: string) => Promise<void>;
}

export default function StepUnderstand({ notes, metricsData, onNotesChange, onComplete }: Props) {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Input.TextArea
        placeholder="写作目标：例如介绍新技术、分享经验、解决问题等"
        autoSize={{ minRows: 2, maxRows: 4 }}
        value={notes}
        onChange={e => onNotesChange(e.target.value)}
      />
      <Button type="primary" onClick={() => onComplete(notes)}>
        保存并继续
      </Button>
      {metricsData?.topArticles?.length > 0 && (
        <div style={{ marginTop: 12, padding: 12, background: '#f6f8fa', borderRadius: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>历史表现参考</div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{metricsData.insights}</div>
          {metricsData.topArticles.slice(0, 3).map((item: any, i: number) => (
            <div key={i} style={{ fontSize: 12, color: '#444', marginBottom: 4 }}>
              {i + 1}. {item.title} - 阅读 {item.views} | 互动率 {(item.engagementRate * 100).toFixed(1)}%
            </div>
          ))}
        </div>
      )}
    </Space>
  );
}

void api; // 保留 import 供后续扩展
