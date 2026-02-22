/**
 * 支付弹窗组件
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Spin, Result, message } from 'antd';
import { QrcodeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { api } from '../../api/client';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  plan: {
    name: string;
    displayName: string;
    price: number;
  };
}

type PaymentStatus = 'loading' | 'pending' | 'paid' | 'failed';

export default function PaymentModal({
  open,
  onClose,
  onSuccess,
  tenantId,
  plan,
}: PaymentModalProps) {
  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    if (open && plan) {
      createOrder();
    }
  }, [open, plan]);

  // 创建订单
  const createOrder = async () => {
    setStatus('loading');
    try {
      const res = await api.post('/payment/create-order', {
        tenantId,
        planName: plan.name,
        amount: plan.price * 100, // 转换为分
      });
      setOrderId(res.data.orderId);
      setQrCode(res.data.codeUrl);
      setStatus('pending');
      // 开始轮询订单状态
      pollOrderStatus(res.data.orderId);
    } catch {
      message.error('创建订单失败');
      setStatus('failed');
    }
  };

  // 轮询订单状态
  const pollOrderStatus = async (id: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 最多轮询60次，约5分钟

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setStatus('failed');
        return;
      }
      attempts++;

      try {
        const res = await api.get(`/payment/order/${id}`);
        if (res.data.status === 'paid') {
          setStatus('paid');
          setTimeout(() => onSuccess(), 1500);
          return;
        }
        if (res.data.status === 'failed') {
          setStatus('failed');
          return;
        }
        setTimeout(poll, 5000);
      } catch {
        setTimeout(poll, 5000);
      }
    };

    poll();
  };

  // 渲染内容
  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>正在创建订单...</p>
        </div>
      );
    }

    if (status === 'paid') {
      return (
        <Result
          status="success"
          icon={<CheckCircleOutlined />}
          title="支付成功"
          subTitle={`已成功升级到 ${plan.displayName}`}
        />
      );
    }

    if (status === 'failed') {
      return (
        <Result
          status="error"
          title="支付失败"
          subTitle="订单已过期或支付失败"
          extra={<Button onClick={createOrder}>重新创建订单</Button>}
        />
      );
    }

    return null;
  };

  // 待支付状态的二维码展示
  const renderPending = () => (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <h3>升级到 {plan.displayName}</h3>
      <p style={{ color: '#666', marginBottom: 20 }}>
        支付金额: <span style={{ fontSize: 24, color: '#f5222d' }}>¥{plan.price}</span>
      </p>
      <div style={{
        background: '#f5f5f5',
        padding: 20,
        borderRadius: 8,
        marginBottom: 16
      }}>
        <QrcodeOutlined style={{ fontSize: 120, color: '#1890ff' }} />
        <p style={{ marginTop: 12, color: '#666' }}>
          {qrCode ? '请使用微信扫码支付' : '二维码生成中...'}
        </p>
      </div>
      <p style={{ color: '#999', fontSize: 12 }}>
        订单号: {orderId}
      </p>
    </div>
  );

  return (
    <Modal
      title="支付"
      open={open}
      onCancel={onClose}
      footer={null}
      width={400}
      destroyOnClose
    >
      {status === 'pending' ? renderPending() : renderContent()}
    </Modal>
  );
}
