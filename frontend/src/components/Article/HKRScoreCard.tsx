import { Card, Progress, Space, Tag, Typography, Divider } from 'antd';
import { SmileOutlined, BookOutlined, HeartOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface HKRScore {
  H: { score: number; comment: string };
  K: { score: number; comment: string };
  R: { score: number; comment: string };
  overall: number;
  suggestions?: string[];
}

interface HKRScoreCardProps {
  score: HKRScore | null;
  raw?: string;
}

export default function HKRScoreCard({ score, raw }: HKRScoreCardProps) {
  if (!score && !raw) {
    return (
      <Card size="small" title="HKR 评估">
        <Text type="secondary">暂无评估结果</Text>
      </Card>
    );
  }

  // 如果只有原始文本
  if (!score && raw) {
    return (
      <Card size="small" title="HKR 评估">
        <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{raw}</pre>
      </Card>
    );
  }

  const getScoreColor = (s: number) => {
    if (s >= 8) return '#52c41a';
    if (s >= 6) return '#1890ff';
    if (s >= 4) return '#faad14';
    return '#ff4d4f';
  };

  const getScoreStatus = (s: number): 'success' | 'normal' | 'exception' => {
    if (s >= 7) return 'success';
    if (s >= 4) return 'normal';
    return 'exception';
  };

  return (
    <Card size="small" title="HKR 质量评估">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* H 分数 */}
        <div>
          <Space style={{ marginBottom: 4 }}>
            <SmileOutlined style={{ color: '#1890ff' }} />
            <Text strong>H - 吸引力 (Hook)</Text>
            <Tag color={getScoreColor(score!.H.score)}>{score!.H.score}/10</Tag>
          </Space>
          <Progress
            percent={score!.H.score * 10}
            status={getScoreStatus(score!.H.score)}
            size="small"
            showInfo={false}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>{score!.H.comment}</Text>
        </div>

        {/* K 分数 */}
        <div>
          <Space style={{ marginBottom: 4 }}>
            <BookOutlined style={{ color: '#52c41a' }} />
            <Text strong>K - 知识价值 (Knowledge)</Text>
            <Tag color={getScoreColor(score!.K.score)}>{score!.K.score}/10</Tag>
          </Space>
          <Progress
            percent={score!.K.score * 10}
            status={getScoreStatus(score!.K.score)}
            size="small"
            showInfo={false}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>{score!.K.comment}</Text>
        </div>

        {/* R 分数 */}
        <div>
          <Space style={{ marginBottom: 4 }}>
            <HeartOutlined style={{ color: '#eb2f96' }} />
            <Text strong>R - 情感共鸣 (Resonance)</Text>
            <Tag color={getScoreColor(score!.R.score)}>{score!.R.score}/10</Tag>
          </Space>
          <Progress
            percent={score!.R.score * 10}
            status={getScoreStatus(score!.R.score)}
            size="small"
            showInfo={false}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>{score!.R.comment}</Text>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* 综合评分 */}
        <div style={{ textAlign: 'center' }}>
          <Text strong style={{ fontSize: 16 }}>综合评分</Text>
          <div style={{ marginTop: 8 }}>
            <Progress
              type="circle"
              percent={score!.overall * 10}
              format={() => `${score!.overall}`}
              strokeColor={getScoreColor(score!.overall)}
              size={80}
            />
          </div>
        </div>

        {/* 改进建议 */}
        {score!.suggestions && score!.suggestions.length > 0 && (
          <div>
            <Text strong>改进建议：</Text>
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              {score!.suggestions.map((s, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  <Text type="secondary">{s}</Text>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Space>
    </Card>
  );
}
