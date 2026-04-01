import { Button, Card, Divider, Space, Tag } from 'antd';

interface Props {
  content: string;
  reviewResult: string;
  hkrResult: any;
  qualityResult: any;
  reviewLoading: boolean;
  hkrLoading: boolean;
  qualityChecking: boolean;
  improving: boolean;
  onReview: () => Promise<void>;
  onHKR: () => Promise<void>;
  onHKRImprove: () => Promise<void>;
  onQualityCheck: () => Promise<void>;
}

export default function StepReview({
  content, reviewResult, hkrResult, qualityResult,
  reviewLoading, hkrLoading, qualityChecking, improving,
  onReview, onHKR, onHKRImprove, onQualityCheck,
}: Props) {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {/* AI 审校 */}
      <Button type="primary" onClick={onReview} loading={reviewLoading} disabled={!content.trim()}>
        开始审校
      </Button>
      {reviewResult && (
        <Card size="small" style={{ background: '#fff7e6' }}>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{reviewResult}</pre>
        </Card>
      )}

      <Divider style={{ margin: '12px 0' }} />

      {/* HKR 评估 */}
      <div style={{ fontWeight: 500 }}>HKR 评估</div>
      <div style={{ color: '#666', fontSize: 12 }}>H(吸引力) K(知识价值) R(情感共鸣) 三维评估</div>
      <Button onClick={onHKR} loading={hkrLoading} disabled={!content.trim()}>
        开始评估
      </Button>
      {hkrResult && (
        <Card size="small">
          {typeof hkrResult === 'object' ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              <div><Tag color="blue">H 吸引力</Tag>{hkrResult.H?.score}/10 <span style={{ color: '#666' }}>{hkrResult.H?.comment}</span></div>
              <div><Tag color="green">K 知识价值</Tag>{hkrResult.K?.score}/10 <span style={{ color: '#666' }}>{hkrResult.K?.comment}</span></div>
              <div><Tag color="orange">R 情感共鸣</Tag>{hkrResult.R?.score}/10 <span style={{ color: '#666' }}>{hkrResult.R?.comment}</span></div>
              <Divider style={{ margin: '8px 0' }} />
              <div style={{ fontWeight: 500 }}>综合评分：{hkrResult.overall}/10</div>
              {hkrResult.suggestions?.length > 0 && (
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>改进建议：</div>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {hkrResult.suggestions.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                  <Button type="primary" size="small" style={{ marginTop: 12 }} onClick={onHKRImprove} loading={improving}>
                    根据建议自动改进
                  </Button>
                </div>
              )}
            </Space>
          ) : (
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{hkrResult}</pre>
          )}
        </Card>
      )}

      <Divider style={{ margin: '12px 0' }} />

      {/* 质量检查 */}
      <div style={{ fontWeight: 500 }}>发布前质量检查</div>
      <div style={{ color: '#666', fontSize: 12 }}>检查 AI 味关键词、字数、配图、工作流完成度等</div>
      <Button onClick={onQualityCheck} loading={qualityChecking} disabled={!content.trim()}>
        质量检查
      </Button>
      {qualityResult && (
        <Card size="small" style={{ background: qualityResult.passed ? '#f6ffed' : '#fff2f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <Tag color={qualityResult.passed ? 'success' : 'error'}>{qualityResult.passed ? '通过' : '未通过'}</Tag>
            <span style={{ marginLeft: 8, fontWeight: 500 }}>评分：{qualityResult.score}/100</span>
          </div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{qualityResult.overallComment}</div>
          {qualityResult.suggestions?.length > 0 && (
            <div>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>改进建议：</div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
                {qualityResult.suggestions.map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </Card>
      )}
    </Space>
  );
}
