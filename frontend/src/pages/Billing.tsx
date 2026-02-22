/**
 * 订阅管理页面
 */

import { useState, useEffect } from 'react';
import { Card, Row, Col, Progress, Button, Statistic, Space, Modal, message, Spin } from 'antd';
import { CrownOutlined, ThunderboltOutlined, RocketOutlined } from '@ant-design/icons';
import { api } from '../api/client';
import PaymentModal from '../components/Billing/PaymentModal';

interface Plan {
  name: string;
  displayName: string;
  price: number;
  articleLimit: number;
  videoMinutes: number;
  aiCallLimit: number;
  storageGb: number;
}

interface Usage {
  article: number;
  video_minutes: number;
  ai_call: number;
  storage_mb: number;
}

interface QuotaData {
  plan: string;
  limits: {
    article: number;
    video_minutes: number;
    ai_call: number;
    storage_mb: number;
  } | null;
  usage: Usage;
}

export default function Billing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentModal, setPaymentModal] = useState(false);

  // 模拟租户ID（实际应从认证状态获取）
  const tenantId = 'demo-tenant';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [plansRes, quotaRes] = await Promise.all([
        api.get('/billing/plans'),
        api.get(`/tenants/${tenantId}/quota`),
      ]);
      setPlans(plansRes.data);
      setQuota(quotaRes.data);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanIcon = (name: string) => {
    switch (name) {
      case 'free': return <CrownOutlined />;
      case 'pro': return <ThunderboltOutlined />;
      case 'enterprise': return <RocketOutlined />;
      default: return <CrownOutlined />;
    }
  };

  const getPlanColor = (name: string) => {
    switch (name) {
      case 'free': return '#8c8c8c';
      case 'pro': return '#1890ff';
      case 'enterprise': return '#722ed1';
      default: return '#8c8c8c';
    }
  };

  const handleUpgrade = (planName: string) => {
    const plan = plans.find(p => p.name === planName);
    if (plan) {
      setSelectedPlan(plan);
      setUpgradeModal(true);
    }
  };

  const confirmUpgrade = async () => {
    setUpgradeModal(false);
    setPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setPaymentModal(false);
    message.success('升级成功');
    fetchData();
  };

  const getUsagePercent = (used: number, limit: number) => {
    if (limit === 0 || limit === -1) return 0;
    return Math.min(100, Math.round((used / limit) * 100));
  };

  const getProgressStatus = (percent: number) => {
    if (percent >= 100) return 'exception';
    if (percent >= 80) return 'active';
    return 'normal';
  };

  return (
    <Spin spinning={loading}>
    <div style={{ padding: 24 }}>
      <h2>订阅管理</h2>

      {/* 当前套餐和用量 */}
      {quota && (
        <Card title="当前用量" style={{ marginBottom: 24 }}>
          <Row gutter={[24, 24]}>
            <Col span={6}>
              <Statistic
                title="当前套餐"
                value={quota.plan}
                prefix={getPlanIcon(quota.plan)}
              />
            </Col>
          </Row>

          {quota.limits && (
            <Row gutter={[24, 16]} style={{ marginTop: 24 }}>
              <Col span={6}>
                <div>文章数</div>
                <Progress
                  percent={getUsagePercent(quota.usage.article, quota.limits.article)}
                  status={getProgressStatus(getUsagePercent(quota.usage.article, quota.limits.article))}
                  format={() => `${quota.usage.article}/${quota.limits!.article}`}
                />
              </Col>
              <Col span={6}>
                <div>视频时长(分钟)</div>
                <Progress
                  percent={getUsagePercent(quota.usage.video_minutes, quota.limits.video_minutes)}
                  status={getProgressStatus(getUsagePercent(quota.usage.video_minutes, quota.limits.video_minutes))}
                  format={() => `${quota.usage.video_minutes}/${quota.limits!.video_minutes}`}
                />
              </Col>
              <Col span={6}>
                <div>AI调用次数</div>
                <Progress
                  percent={getUsagePercent(quota.usage.ai_call, quota.limits.ai_call)}
                  status={getProgressStatus(getUsagePercent(quota.usage.ai_call, quota.limits.ai_call))}
                  format={() => `${quota.usage.ai_call}/${quota.limits!.ai_call}`}
                />
              </Col>
              <Col span={6}>
                <div>存储空间(MB)</div>
                <Progress
                  percent={getUsagePercent(quota.usage.storage_mb, quota.limits.storage_mb)}
                  status={getProgressStatus(getUsagePercent(quota.usage.storage_mb, quota.limits.storage_mb))}
                  format={() => `${quota.usage.storage_mb}/${quota.limits!.storage_mb}`}
                />
              </Col>
            </Row>
          )}
        </Card>
      )}

      {/* 套餐列表 */}
      <h3>选择套餐</h3>
      <Row gutter={[16, 16]}>
        {plans.map(plan => (
          <Col span={8} key={plan.name}>
            <Card
              hoverable
              style={{
                borderColor: quota?.plan === plan.name ? getPlanColor(plan.name) : undefined,
                borderWidth: quota?.plan === plan.name ? 2 : 1,
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, color: getPlanColor(plan.name) }}>
                    {getPlanIcon(plan.name)}
                  </div>
                  <h3>{plan.displayName}</h3>
                  <div style={{ fontSize: 24, fontWeight: 'bold' }}>
                    ¥{plan.price}
                    <span style={{ fontSize: 14, fontWeight: 'normal' }}>/月</span>
                  </div>
                </div>

                <div style={{ padding: '16px 0' }}>
                  <p>文章数: {plan.articleLimit === -1 ? '不限' : `${plan.articleLimit}篇/月`}</p>
                  <p>视频时长: {plan.videoMinutes === -1 ? '不限' : `${plan.videoMinutes}分钟/月`}</p>
                  <p>AI调用: {plan.aiCallLimit === -1 ? '不限' : `${plan.aiCallLimit}次/月`}</p>
                  <p>存储空间: {plan.storageGb === -1 ? '不限' : `${plan.storageGb}GB`}</p>
                </div>

                <Button
                  type={quota?.plan === plan.name ? 'default' : 'primary'}
                  block
                  disabled={quota?.plan === plan.name}
                  onClick={() => handleUpgrade(plan.name)}
                >
                  {quota?.plan === plan.name ? '当前套餐' : '升级'}
                </Button>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 升级确认弹窗 */}
      <Modal
        title="确认升级"
        open={upgradeModal}
        onOk={confirmUpgrade}
        onCancel={() => setUpgradeModal(false)}
      >
        <p>确定要升级到 {selectedPlan?.displayName} 套餐吗？</p>
        <p>价格: ¥{selectedPlan?.price}/月</p>
      </Modal>

      {/* 支付弹窗 */}
      {selectedPlan && (
        <PaymentModal
          open={paymentModal}
          onClose={() => setPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          tenantId={tenantId}
          plan={selectedPlan}
        />
      )}
    </div>
    </Spin>
  );
}
