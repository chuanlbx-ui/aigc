/**
 * 密码重置页面
 */

import { useState } from 'react';
import { Form, Input, Button, Card, message, Result } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // 根据是否有 token 显示不同的表单
  if (token) {
    return <ResetPasswordForm token={token} />;
  }

  return <RequestResetForm />;
}

// 请求重置密码表单
function RequestResetForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onFinish = async (values: { email: string }) => {
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: values.email });
      setSent(true);
    } catch {
      message.error('发送失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
        <Result
          status="success"
          title="邮件已发送"
          subTitle="请检查您的邮箱，点击邮件中的链接重置密码"
          extra={<Link to="/login"><Button type="primary">返回登录</Button></Link>}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
      <Card title="找回密码" style={{ width: 400 }}>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="请输入注册邮箱" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              发送重置邮件
            </Button>
          </Form.Item>
          <Link to="/login"><ArrowLeftOutlined /> 返回登录</Link>
        </Form>
      </Card>
    </div>
  );
}

// 重置密码表单
function ResetPasswordForm({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const onFinish = async (values: { password: string }) => {
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        password: values.password
      });
      setSuccess(true);
    } catch {
      message.error('重置失败，链接可能已过期');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
        <Result
          status="success"
          title="密码重置成功"
          subTitle="请使用新密码登录"
          extra={<Link to="/login"><Button type="primary">去登录</Button></Link>}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
      <Card title="设置新密码" style={{ width: 400 }}>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item
            name="password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              重置密码
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
