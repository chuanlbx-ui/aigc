/**
 * 数据统计页面
 */

import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Spin } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import axios from 'axios';

export default function Statistics() {
  const [loading, setLoading] = useState(true);
  const [aiStats, setAiStats] = useState<any>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/ai-stats/stats?days=30');
      setAiStats(res.data);
    } catch (error) {
      console.error('获取统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>数据统计</h2>
      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Card>
              <Statistic
                title="AI 调用次数"
                value={aiStats?.summary?.totalCalls || 0}
                prefix={<RobotOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Token 消耗"
                value={aiStats?.summary?.totalTokens || 0}
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
}
