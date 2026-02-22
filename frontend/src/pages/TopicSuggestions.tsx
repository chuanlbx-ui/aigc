import React, { useEffect, useState } from 'react';
import { Card, Tabs, Row, Col, Button, Space, Spin, Empty, message } from 'antd';
import { ReloadOutlined, BulbOutlined } from '@ant-design/icons';
import { useTopicSuggestionStore } from '../stores/topicSuggestion';
import { TopicCard } from '../components/TopicSuggestion/TopicCard';
import AcceptTopicModal from '../components/TopicSuggestion/AcceptTopicModal';
import type { TopicSuggestion } from '../stores/topicSuggestion';
import './TopicSuggestions.css';

const { TabPane } = Tabs;

const TopicSuggestions: React.FC = () => {
  const {
    domainGroups,
    loading,
    fetchRecommendations,
    refreshTopics,
    generateFromKnowledge,
  } = useTopicSuggestionStore();

  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<TopicSuggestion | null>(null);

  useEffect(() => {
    // 页面加载时获取推荐选题,每个领域显示20条
    fetchRecommendations({ limit: 20 });
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshTopics();
      message.success('选题刷新成功');
    } catch (error) {
      message.error('选题刷新失败');
    } finally {
      setRefreshing(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateFromKnowledge({ limit: 10, topicsPerDoc: 3 });
      message.success('知识库选题生成成功');
    } catch (error) {
      message.error('知识库选题生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleAcceptTopic = (topic: TopicSuggestion) => {
    setSelectedTopic(topic);
    setModalVisible(true);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setSelectedTopic(null);
  };

  return (
    <div className="topic-suggestions-page">
      <Card
        title={
          <Space>
            <BulbOutlined style={{ fontSize: 20 }} />
            <span>智能选题推荐</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={refreshing}
            >
              刷新选题
            </Button>
            <Button
              type="primary"
              onClick={handleGenerate}
              loading={generating}
            >
              生成知识库选题
            </Button>
          </Space>
        }
      >
        <Spin spinning={loading}>
          {domainGroups.length === 0 ? (
            <Empty description="暂无推荐选题" />
          ) : (
            <Tabs defaultActiveKey={domainGroups[0]?.domain}>
              {domainGroups.map((group) => (
                <TabPane
                  tab={
                    <span>
                      {group.domainName} ({group.totalCount})
                    </span>
                  }
                  key={group.domain}
                >
                  {group.topics.length === 0 ? (
                    <Empty description={`暂无${group.domainName}选题`} />
                  ) : (
                    <Row gutter={[16, 16]}>
                      {group.topics.map((topic) => (
                        <Col span={24} key={topic.id}>
                          <TopicCard topic={topic} onAccept={handleAcceptTopic} />
                        </Col>
                      ))}
                    </Row>
                  )}
                </TabPane>
              ))}
            </Tabs>
          )}
        </Spin>
      </Card>

      <AcceptTopicModal
        visible={modalVisible}
        topic={selectedTopic}
        onCancel={handleModalCancel}
      />
    </div>
  );
};

export default TopicSuggestions;
