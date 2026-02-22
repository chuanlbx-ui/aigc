import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Button, List, Tag, Space, Typography } from 'antd';
import {
  FormOutlined,
  FileImageOutlined,
  VideoCameraOutlined,
  SendOutlined,
  RightOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EditOutlined,
  FireOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useHotTopicStore } from '../stores/hotTopic';
import { HotTopicCard } from '../components/HotTopic/HotTopicCard';
import { useTopicSuggestionStore, DOMAIN_CONFIG } from '../stores/topicSuggestion';
import { TopicCard } from '../components/TopicSuggestion/TopicCard';

const { Text } = Typography;

interface ArticleSummary {
  id: string;
  title: string;
  status: string;
  platform: string;
  updatedAt: string;
}

interface Stats {
  drafts: number;
  pendingReview: number;
  pendingPublish: number;
  published: number;
}

export default function Workspace() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ drafts: 0, pendingReview: 0, pendingPublish: 0, published: 0 });
  const [recentArticles, setRecentArticles] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { topics, loading: topicsLoading, fetchHotTopics } = useHotTopicStore();
  const { domainGroups, loading: suggestionsLoading, fetchRecommendations } = useTopicSuggestionStore();

  useEffect(() => {
    fetchData();
    fetchRecommendations({ limit: 5 });
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/articles');
      const articles = res.data.articles || [];

      // 计算统计数据
      const drafts = articles.filter((a: any) => a.status === 'draft').length;
      const pendingReview = articles.filter((a: any) => a.aiReviewStatus === 'needs_revision').length;
      const pendingPublish = articles.filter((a: any) => a.status === 'draft' && a.aiReviewStatus === 'passed').length;
      const published = articles.filter((a: any) => a.status === 'published').length;

      setStats({ drafts, pendingReview, pendingPublish, published });
      setRecentArticles(articles.slice(0, 5));
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status: string, aiReviewStatus?: string) => {
    if (status === 'published') return <Tag color="green">已发布</Tag>;
    if (aiReviewStatus === 'needs_revision') return <Tag color="orange">待修改</Tag>;
    if (aiReviewStatus === 'passed') return <Tag color="blue">待发布</Tag>;
    return <Tag>草稿</Tag>;
  };

  return (
    <div style={{ padding: 24 }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/articles?status=draft')}>
            <Statistic
              title="草稿中"
              value={stats.drafts}
              prefix={<EditOutlined />}
              suffix="篇"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/articles?review=needs_revision')}>
            <Statistic
              title="待修改"
              value={stats.pendingReview}
              prefix={<ClockCircleOutlined />}
              suffix="篇"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/articles?review=passed')}>
            <Statistic
              title="待发布"
              value={stats.pendingPublish}
              prefix={<SendOutlined />}
              suffix="篇"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/articles?status=published')}>
            <Statistic
              title="已发布"
              value={stats.published}
              prefix={<CheckCircleOutlined />}
              suffix="篇"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 创作流程 */}
      <Card title="创作流程" style={{ marginBottom: 24 }}>
        <Row gutter={24} justify="center" align="middle">
          <Col>
            <Button
              type="primary"
              size="large"
              icon={<BulbOutlined />}
              onClick={() => navigate('/topic-suggestions')}
              style={{ height: 80, width: 120 }}
            >
              <div>智能选题</div>
            </Button>
          </Col>
          <Col><RightOutlined style={{ fontSize: 24, color: '#999' }} /></Col>
          <Col>
            <Button
              size="large"
              icon={<FormOutlined />}
              onClick={() => navigate('/articles')}
              style={{ height: 80, width: 120 }}
            >
              <div>文章创作</div>
            </Button>
          </Col>
          <Col><RightOutlined style={{ fontSize: 24, color: '#999' }} /></Col>
          <Col>
            <Button
              size="large"
              icon={<FileImageOutlined />}
              onClick={() => navigate('/posters')}
              style={{ height: 80, width: 120 }}
            >
              <div>海报生成</div>
            </Button>
          </Col>
          <Col><RightOutlined style={{ fontSize: 24, color: '#999' }} /></Col>
          <Col>
            <Button
              size="large"
              icon={<VideoCameraOutlined />}
              onClick={() => navigate('/editor')}
              style={{ height: 80, width: 120 }}
            >
              <div>视频制作</div>
            </Button>
          </Col>
          <Col><RightOutlined style={{ fontSize: 24, color: '#999' }} /></Col>
          <Col>
            <Button
              size="large"
              icon={<SendOutlined />}
              onClick={() => navigate('/publish')}
              style={{ height: 80, width: 120 }}
            >
              <div>发布分发</div>
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 最近项目 */}
      <Card
        title="最近文章"
        extra={<Button type="link" onClick={() => navigate('/articles')}>查看全部</Button>}
      >
        <List
          loading={loading}
          dataSource={recentArticles}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button type="link" onClick={() => navigate(`/articles/${item.id}/edit`)}>
                  编辑
                </Button>
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong>{item.title || '无标题'}</Text>
                    {getStatusTag(item.status, (item as any).aiReviewStatus)}
                  </Space>
                }
                description={
                  <Space>
                    <Tag>{item.platform === 'wechat' ? '公众号' : item.platform === 'xiaohongshu' ? '小红书' : '视频'}</Tag>
                    <Text type="secondary">
                      更新于 {new Date(item.updatedAt).toLocaleDateString()}
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: '暂无文章，点击上方开始创作' }}
        />
      </Card>
    </div>
  );
}
