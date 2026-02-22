import React from 'react';
import { Card, Tag, Space, Typography, Badge } from 'antd';
import { FireOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { HotTopic, HOT_TOPIC_SOURCES } from '../../stores/hotTopic';
import './HotTopicCard.css';

const { Text, Paragraph } = Typography;

interface HotTopicCardProps {
  topic: HotTopic;
  onClick?: (topic: HotTopic) => void;
  showDescription?: boolean;
  compact?: boolean;
}

export const HotTopicCard: React.FC<HotTopicCardProps> = ({
  topic,
  onClick,
  showDescription = true,
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

  // 获取来源颜色
  const getSourceColor = (source: string) => {
    return source === 'weibo' ? 'red' : 'blue';
  };

  return (
    <Card
      className={`hot-topic-card ${compact ? 'compact' : ''}`}
      hoverable
      onClick={() => onClick?.(topic)}
      style={{ marginBottom: 16 }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {/* 标题和热度 */}
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
          <Tag color="orange" icon={<FireOutlined />}>
            {formatHotScore(topic.hotScore)}
          </Tag>
        </div>

        {/* 描述 */}
        {showDescription && topic.description && !compact && (
          <Paragraph
            ellipsis={{ rows: 2 }}
            style={{ marginBottom: 8, color: '#666' }}
          >
            {topic.description}
          </Paragraph>
        )}

        {/* 底部信息 */}
        <div className="topic-footer">
          <Space size="small">
            <Tag color={getSourceColor(topic.source)}>
              {HOT_TOPIC_SOURCES[topic.source]}
            </Tag>
            {topic.category && <Tag>{topic.category}</Tag>}
            {topic.tags.slice(0, 2).map((tag, index) => (
              <Tag key={index} color="default">
                {tag}
              </Tag>
            ))}
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <ClockCircleOutlined /> {formatTime(topic.fetchedAt)}
          </Text>
        </div>
      </Space>
    </Card>
  );
};

