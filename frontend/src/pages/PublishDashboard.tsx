import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Button, List, Tag, Space, Typography, Avatar } from 'antd';
import {
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WechatOutlined,
  PlusOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Text } = Typography;

interface Stats {
  pending: number;
  processing: number;
  published: number;
  failed: number;
}

interface Platform {
  id: string;
  name: string;
  displayName: string;
  accountName?: string;
  isEnabled: boolean;
}

interface PublishRecord {
  id: string;
  contentTitle: string;
  platformName: string;
  status: string;
  createdAt: string;
}

const statusMap: Record<string, { color: string; text: string }> = {
  pending: { color: 'default', text: '等待中' },
  processing: { color: 'processing', text: '处理中' },
  published: { color: 'success', text: '已发布' },
  failed: { color: 'error', text: '失败' },
};

export default function PublishDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ pending: 0, processing: 0, published: 0, failed: 0 });
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [records, setRecords] = useState<PublishRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, platformsRes, recordsRes] = await Promise.all([
        axios.get('/api/publish/stats'),
        axios.get('/api/publish/platforms'),
        axios.get('/api/publish/records', { params: { pageSize: 5 } }),
      ]);
      setStats(statsRes.data);
      setPlatforms(platformsRes.data);
      setRecords(recordsRes.data.records || []);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/publish/records?status=pending')}>
            <Statistic
              title="待发布"
              value={stats.pending}
              prefix={<ClockCircleOutlined />}
              suffix="条"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/publish/records?status=processing')}>
            <Statistic
              title="发布中"
              value={stats.processing}
              prefix={<SyncOutlined spin={stats.processing > 0} />}
              suffix="条"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/publish/records?status=published')}>
            <Statistic
              title="已发布"
              value={stats.published}
              prefix={<CheckCircleOutlined />}
              suffix="条"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card hoverable onClick={() => navigate('/publish/records?status=failed')}>
            <Statistic
              title="发布失败"
              value={stats.failed}
              prefix={<CloseCircleOutlined />}
              suffix="条"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={24}>
        {/* 已配置平台 */}
        <Col span={8}>
          <Card
            title="已配置平台"
            extra={
              <Button type="link" icon={<SettingOutlined />} onClick={() => navigate('/publish/platforms')}>
                管理
              </Button>
            }
          >
            {platforms.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Text type="secondary">暂无配置平台</Text>
                <br />
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  style={{ marginTop: 12 }}
                  onClick={() => navigate('/publish/platforms')}
                >
                  添加平台
                </Button>
              </div>
            ) : (
              <List
                dataSource={platforms}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<WechatOutlined />} style={{ backgroundColor: '#07c160' }} />}
                      title={item.displayName}
                      description={item.accountName || '未绑定账号'}
                    />
                    <Tag color={item.isEnabled ? 'green' : 'default'}>
                      {item.isEnabled ? '已启用' : '已禁用'}
                    </Tag>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        {/* 最近发布记录 */}
        <Col span={16}>
          <Card
            title="最近发布记录"
            extra={<Button type="link" onClick={() => navigate('/publish/records')}>查看全部</Button>}
          >
            <List
              loading={loading}
              dataSource={records}
              locale={{ emptyText: '暂无发布记录' }}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space>
                        <Text strong>{item.contentTitle}</Text>
                        <Tag color={statusMap[item.status]?.color || 'default'}>
                          {statusMap[item.status]?.text || item.status}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space>
                        <Tag>{item.platformName}</Tag>
                        <Text type="secondary">
                          {new Date(item.createdAt).toLocaleString('zh-CN')}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
