/**
 * 邮件服务
 */

import nodemailer from 'nodemailer';

// 邮件配置
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.qq.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 发送邮件
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!process.env.SMTP_USER) {
    console.log('[Email] SMTP 未配置，跳过发送');
    console.log('[Email] To:', options.to);
    console.log('[Email] Subject:', options.subject);
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}

// 发送密码重置邮件
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

  await sendEmail({
    to: email,
    subject: '重置密码 - 内容创作平台',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>重置密码</h2>
        <p>您收到此邮件是因为您请求重置密码。</p>
        <p>请点击下方按钮重置密码（链接1小时内有效）：</p>
        <p style="margin: 30px 0;">
          <a href="${resetUrl}"
             style="background: #1890ff; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 4px;">
            重置密码
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          如果您没有请求重置密码，请忽略此邮件。
        </p>
      </div>
    `,
  });
}
