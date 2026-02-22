/**
 * 认证 API 路由 - JWT 版本
 */

import { Router } from 'express';
import { registerUser, loginUser, logoutUser, validateToken, refreshAccessToken, createPasswordResetToken, resetPassword } from '../services/auth.js';
import { sendPasswordResetEmail } from '../services/email.js';

const router = Router();

// 注册
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码必填' });
    }

    const user = await registerUser({ email, password, name, phone });
    res.json({ success: true, user });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '邮箱已被注册' });
    }
    res.status(500).json({ error: error.message });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码必填' });
    }

    const result = await loginUser(email, password, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

// 登出
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      await logoutUser(token);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取当前用户
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: '未登录' });
    }

    const user = await validateToken(token);
    if (!user) {
      return res.status(401).json({ error: '登录已过期' });
    }

    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 刷新 Access Token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: '缺少刷新令牌' });
    }

    const result = await refreshAccessToken(refreshToken);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

// 忘记密码 - 发送重置邮件
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: '请输入邮箱' });
    }

    const resetToken = await createPasswordResetToken(email);
    await sendPasswordResetEmail(email, resetToken);

    res.json({ success: true, message: '重置邮件已发送' });
  } catch (error: any) {
    // 不暴露用户是否存在
    res.json({ success: true, message: '如果邮箱存在，重置邮件已发送' });
  }
});

// 重置密码
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: '参数不完整' });
    }

    await resetPassword(token, password);
    res.json({ success: true, message: '密码已重置' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
