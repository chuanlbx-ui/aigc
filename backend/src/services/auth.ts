/**
 * 认证服务 - JWT 版本
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// JWT 配置
// 启动时检查 JWT_SECRET，未设置则拒绝启动
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET 环境变量未设置，请在 .env 文件中配置');
}
const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRES = '15m';  // 15分钟
const REFRESH_TOKEN_EXPIRES = '7d';  // 7天

// Token 类型
interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  tenantId?: string | null;
  type: 'access' | 'refresh';
}

// 密码强度验证
export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: '密码长度至少为8位' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: '密码必须包含至少一个大写字母' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: '密码必须包含至少一个小写字母' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: '密码必须包含至少一个数字' };
  }
  return { valid: true };
}

// 密码哈希
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// 验证密码
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// 生成 token
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// 生成 JWT Access Token
export function generateAccessToken(user: {
  id: string;
  email: string;
  role: string;
  tenantId?: string | null;
}): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    type: 'access',
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
}

// 生成 JWT Refresh Token
export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES }
  );
}

// 验证 JWT Token
export function verifyJwtToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// 用户注册
export async function registerUser(data: {
  email: string;
  password: string;
  name?: string;
  phone?: string;
}) {
  const hashedPassword = hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      phone: data.phone,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}

// 用户登录
export async function loginUser(email: string, password: string, meta?: { userAgent?: string; ip?: string }) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.isActive) {
    throw new Error('用户不存在或已禁用');
  }

  if (!verifyPassword(password, user.password)) {
    throw new Error('密码错误');
  }

  // 生成 JWT tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user.id);

  // 存储 refresh token 到 Session 表（用于黑名单和撤销）
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt,
      userAgent: meta?.userAgent,
      ip: meta?.ip,
    },
  });

  // 更新最后登录时间
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    },
  };
}

// 验证 JWT Access Token
export async function validateToken(token: string) {
  const payload = verifyJwtToken(token);

  if (!payload || payload.type !== 'access') {
    return null;
  }

  return {
    id: payload.userId,
    email: payload.email,
    role: payload.role,
    tenantId: payload.tenantId,
  };
}

// 刷新 Access Token
export async function refreshAccessToken(refreshToken: string) {
  // 验证 refresh token
  const payload = verifyJwtToken(refreshToken);
  if (!payload || payload.type !== 'refresh') {
    throw new Error('无效的刷新令牌');
  }

  // 检查 refresh token 是否在数据库中（未被撤销）
  const session = await prisma.session.findFirst({
    where: { token: refreshToken, expiresAt: { gt: new Date() } },
    include: { user: true },
  });

  if (!session || !session.user.isActive) {
    throw new Error('会话已过期或已撤销');
  }

  // 生成新的 access token
  const accessToken = generateAccessToken(session.user);

  return {
    accessToken,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      tenantId: session.user.tenantId,
    },
  };
}

// 登出
export async function logoutUser(token: string) {
  await prisma.session.deleteMany({
    where: { token },
  });
}

// 生成密码重置 Token
export async function createPasswordResetToken(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('用户不存在');
  }

  const resetToken = generateToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1小时

  // 存储重置 token（复用 Session 表）
  await prisma.session.create({
    data: {
      userId: user.id,
      token: `reset_${resetToken}`,
      expiresAt,
    },
  });

  return resetToken;
}

// 重置密码
export async function resetPassword(token: string, newPassword: string) {
  const session = await prisma.session.findFirst({
    where: {
      token: `reset_${token}`,
      expiresAt: { gt: new Date() },
    },
  });

  if (!session) {
    throw new Error('重置链接已过期或无效');
  }

  const hashedPassword = hashPassword(newPassword);

  await prisma.user.update({
    where: { id: session.userId },
    data: { password: hashedPassword },
  });

  // 删除重置 token
  await prisma.session.delete({ where: { id: session.id } });

  return true;
}
