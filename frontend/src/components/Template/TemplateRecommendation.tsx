/**
 * 模板推荐组件
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Tag, Spin, Empty, Tooltip } from 'antd';
import { StarOutlined, FireOutlined, ClockCircleOutlined } from '@ant-design/icons';
import {
  getRecommendations,
  RecommendationResult,
  TemplateType,
  RecommendContext,
  UnifiedTemplate,
} from './api';

interface TemplateRecommendationProps {
  type: TemplateType;
  context?: RecommendContext;
  limit?: number;
  onSelect?: (template: UnifiedTemplate) => void;
}

// 推荐理由图标映射
const reasonIcons: Record<string, React.ReactNode> = {
  '平台匹配': <StarOutlined style={{ color: '#faad14' }} />,
  '热门模板': <FireOutlined style={{ color: '#f5222d' }} />,
  '近期活跃': <ClockCircleOutlined style={{ color: '#1890ff' }} />,
  '系统推荐': <StarOutlined style={{ color: '#52c41a' }} />,
};

export const TemplateRecommendation: React.FC<TemplateRecommendationProps> = ({
  type,
  context = {},
  limit = 5,
  onSelect,
}) => {
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, [type, context.platform, context.column, context.contentType]);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const results = await getRecommendations(type, context, limit);
      setRecommendations(results);
    } catch (error) {
      console.error('加载推荐失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 渲染推荐理由标签
  const renderReasonTags = (reason: string) => {
    const reasons = reason.split('、');
    return reasons.map((r, index) => (
      <Tag key={index} icon={reasonIcons[r]} style={{ marginRight: 4 }}>
        {r}
      </Tag>
    ));
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <Spin tip="加载推荐中..." />
      </div>
    );
  }

  if (recommendations.length === 0) {
    return <Empty description="暂无推荐" />;
  }

  return (
    <div>
      <div style={{ marginBottom: 12, fontWeight: 500 }}>
        为你推荐
      </div>
      <Row gutter={[12, 12]}>
        {recommendations.map((rec) => (
          <Col key={rec.template.id} xs={24} sm={12} md={8} lg={6} xl={4}>
            <RecommendCard
              recommendation={rec}
              onSelect={onSelect}
              renderReasonTags={renderReasonTags}
            />
          </Col>
        ))}
      </Row>
    </div>
  );
};

// 推荐卡片子组件
interface RecommendCardProps {
  recommendation: RecommendationResult;
  onSelect?: (template: UnifiedTemplate) => void;
  renderReasonTags: (reason: string) => React.ReactNode;
}

const RecommendCard: React.FC<RecommendCardProps> = ({
  recommendation,
  onSelect,
  renderReasonTags,
}) => {
  const { template, score, reason } = recommendation;

  return (
    <Card
      hoverable
      size="small"
      onClick={() => onSelect?.(template)}
      style={{ height: '100%' }}
    >
      <Tooltip title={template.name}>
        <div style={{
          fontWeight: 500,
          marginBottom: 8,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {template.name}
        </div>
      </Tooltip>
      <div style={{ marginBottom: 8 }}>
        {renderReasonTags(reason)}
      </div>
      <div style={{ fontSize: 12, color: '#999' }}>
        匹配度: {Math.round(score * 100)}%
      </div>
    </Card>
  );
};

export default TemplateRecommendation;
