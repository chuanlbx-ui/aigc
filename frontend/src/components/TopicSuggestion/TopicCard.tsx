import React from 'react';
import { Card, Tag, Space, Typography, Badge, Progress, Button, Image } from 'antd';
import { FireOutlined, ClockCircleOutlined, CheckCircleOutlined, BookOutlined } from '@ant-design/icons';
import { TopicSuggestion } from '../../stores/topicSuggestion';
import './TopicCard.css';

const { Text, Paragraph } = Typography;

interface TopicCardProps {
  topic: TopicSuggestion;
  onAccept?: (topic: TopicSuggestion) => void;
  onViewDetail?: (topic: TopicSuggestion) => void;
  compact?: boolean;
}

export const TopicCard: React.FC<TopicCardProps> = ({
  topic,
  onAccept,
  onViewDetail,
  compact = false,
}) => {
  // 格式化热度分数
  const formatHotScore = (score: number) => {
    if (score >= 10000) {
      return `${(score / 10000).toFixed(1)}万`;
    }
    return score.toString();
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 60) {
      return `${minutes}分钟前`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}小时前`;
    }
    return `${Math.floor(hours / 24)}天前`;
  };

  // 获取来源标签颜色
  const getSourceColor = (sourceType: string) => {
    const colors: Record<string, string> = {
      news: 'red',
      social: 'blue',
      knowledge: 'purple',
      report: 'green',
    };
    return colors[sourceType] || 'default';
  };

  // 获取来源标签文本
  const getSourceText = (source: string, sourceType: string) => {
    if (sourceType === 'knowledge') return '知识库延伸';
    if (sourceType === 'report') return '行业报告';

    const sourceMap: Record<string, string> = {
      weibo: '微博',
      toutiao: '头条',
      zhihu: '知乎',
      reddit: 'Reddit',
    };
    return sourceMap[source] || source;
  };

  return (
    <Card
      className={`topic-card ${compact ? 'compact' : ''}`}
      hoverable
      style={{ marginBottom: 16 }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {/* 标题和推荐评分 */}
        <div className="topic-header">
          <Space>
            <Badge
              count={<FireOutlined style={{ color: '#ff4d4f' }} />}
              style={{ backgroundColor: '#fff' }}
            />
            <Text strong className="topic-title">
              {topic.title}
            </Text>
          </Space>
          {topic.recommendScore && (
            <div style={{ minWidth: 100 }}>
              <Progress
                percent={Math.round(topic.recommendScore * 100)}
                size="small"
                strokeColor="#52c41a"
                format={(percent) => `推荐 ${percent}%`}
              />
            </div>
          )}
        </div>

        {/* 描述 */}
        {!compact && topic.description && (
          <Paragraph
            ellipsis={{ rows: 2 }}
            style={{ marginBottom: 8, color: '#666' }}
          >
            {topic.description}
          </Paragraph>
        )}

        {/* 知识库匹配提示 */}
        {topic.matchedKnowledgeIds && topic.matchedKnowledgeIds.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <Tag icon={<BookOutlined />} color="purple">
              匹配 {topic.matchedKnowledgeIds.length} 个知识库文档
            </Tag>
            {topic.relevanceScore && (
              <Tag color="green">
                相关性 {Math.round(topic.relevanceScore * 100)}%
              </Tag>
            )}
          </div>
        )}

        {/* 底部信息 */}
        <div className="topic-footer">
          <Space size="small" wrap>
            <Tag color={getSourceColor(topic.sourceType)}>
              {getSourceText(topic.source, topic.sourceType)}
            </Tag>
            {topic.hotScore > 0 && (
              <Tag color="orange" icon={<FireOutlined />}>
                {formatHotScore(topic.hotScore)}
              </Tag>
            )}
            {topic.category && <Tag>{topic.category}</Tag>}
            {topic.tags.slice(0, 2).map((tag, index) => (
              <Tag key={index} color="default">
                {tag}
              </Tag>
            ))}
            <Text type="secondary" style={{ fontSize: 12 }}>
              <ClockCircleOutlined /> {formatTime(topic.fetchedAt)}
            </Text>
          </Space>

          <Space>
            {onViewDetail && (
              <Button size="small" onClick={() => onViewDetail(topic)}>
                查看详情
              </Button>
            )}
            {onAccept && (
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => onAccept(topic)}
              >
                接受选题
              </Button>
            )}
          </Space>
        </div>
      </Space>
    </Card>
  );
};
