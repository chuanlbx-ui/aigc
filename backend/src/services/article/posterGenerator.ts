import { createCanvas, registerFont, CanvasRenderingContext2D } from 'canvas';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';

// 海报配置接口
export interface PosterOptions {
  title: string;
  quote: string;  // 精句（大字报主体）
  qrUrl: string;
  theme: 'light' | 'dark' | 'elegant' | 'tech' | 'nature' | 'warm' | 'minimal';
  brandText?: string;
}

// 主题配色（大字报风格）
const THEMES = {
  light: {
    bgGradient: ['#FDF6F0', '#F5E6D3'],  // 暖色渐变
    title: '#5D4E37',
    quote: '#2D2016',      // 精句深色
    accent: '#C4A77D',     // 金色点缀
    highlight: '#E8D5B7',  // 高光色
    line: '#D4C4A8',       // 装饰线
    qrText: '#8B7355',
    brand: '#A69076',
  },
  dark: {
    bgGradient: ['#1A1A2E', '#16213E'],  // 深蓝渐变
    title: '#E8E8E8',
    quote: '#FFFFFF',
    accent: '#74B9FF',
    highlight: '#2D3A5A',
    line: '#3D4A6A',
    qrText: '#A0A0A0',
    brand: '#707070',
  },
  elegant: {
    bgGradient: ['#FAF8F5', '#F0EBE3'],  // 米白渐变
    title: '#4A3728',
    quote: '#2C1810',
    accent: '#B8860B',      // 金色
    highlight: '#E8DCC8',
    line: '#D4C4A8',
    qrText: '#6B5344',
    brand: '#8B7355',
  },
  tech: {
    bgGradient: ['#0F0F23', '#1A1A3E'],  // 深紫蓝渐变
    title: '#00D4FF',       // 霓虹蓝
    quote: '#FFFFFF',
    accent: '#00D4FF',
    highlight: '#1E3A5F',
    line: '#2D4A6A',
    qrText: '#00D4FF',
    brand: '#6B8CAE',
  },
  nature: {
    bgGradient: ['#F0F7F4', '#E8F5E9'],  // 浅绿渐变
    title: '#2E5A3C',
    quote: '#1B3D2F',
    accent: '#4CAF50',      // 绿色
    highlight: '#C8E6C9',
    line: '#A5D6A7',
    qrText: '#558B2F',
    brand: '#689F38',
  },
  warm: {
    bgGradient: ['#FFF8E7', '#FFE4B5'],  // 橙黄渐变
    title: '#8B4513',
    quote: '#5D3A1A',
    accent: '#FF8C00',      // 橙色
    highlight: '#FFD699',
    line: '#DEB887',
    qrText: '#A0522D',
    brand: '#CD853F',
  },
  minimal: {
    bgGradient: ['#FFFFFF', '#FAFAFA'],  // 纯白渐变
    title: '#333333',
    quote: '#000000',
    accent: '#666666',
    highlight: '#F5F5F5',
    line: '#E0E0E0',
    qrText: '#666666',
    brand: '#999999',
  },
};

// 文字自动换行（用于精句大字）
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  let currentLine = '';

  for (const char of text) {
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

// 绘制随机装饰元素（高光、线条）
function drawDecorations(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colors: typeof THEMES.light
) {
  ctx.save();

  // 随机高光圆
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = 100 + Math.random() * 200;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, colors.highlight + '40');
    gradient.addColorStop(1, colors.highlight + '00');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 随机装饰线条
  ctx.strokeStyle = colors.line + '60';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const startX = Math.random() * width;
    const startY = Math.random() * height;
    const length = 100 + Math.random() * 300;
    const angle = Math.random() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + Math.cos(angle) * length, startY + Math.sin(angle) * length);
    ctx.stroke();
  }

  // 角落装饰
  ctx.strokeStyle = colors.accent + '30';
  ctx.lineWidth = 2;
  const cornerSize = 60;
  // 左上角
  ctx.beginPath();
  ctx.moveTo(40, 40 + cornerSize);
  ctx.lineTo(40, 40);
  ctx.lineTo(40 + cornerSize, 40);
  ctx.stroke();
  // 右下角
  ctx.beginPath();
  ctx.moveTo(width - 40, height - 40 - cornerSize);
  ctx.lineTo(width - 40, height - 40);
  ctx.lineTo(width - 40 - cornerSize, height - 40);
  ctx.stroke();

  ctx.restore();
}

// 生成海报（大字报风格）
export async function generatePoster(options: PosterOptions): Promise<Buffer> {
  const { title, quote, qrUrl, theme, brandText } = options;
  const colors = THEMES[theme];

  // 画布尺寸（小红书竖版 3:4）
  const width = 1080;
  const height = 1440;
  const padding = 80;
  const contentWidth = width - padding * 2;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 绘制渐变背景
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, colors.bgGradient[0]);
  bgGradient.addColorStop(1, colors.bgGradient[1]);
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // 绘制装饰元素
  drawDecorations(ctx, width, height, colors);

  // 绘制标题（单行，自动缩放）
  ctx.fillStyle = colors.title;
  let titleFontSize = 42;
  ctx.font = `bold ${titleFontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  while (ctx.measureText(title).width > contentWidth && titleFontSize > 24) {
    titleFontSize -= 2;
    ctx.font = `bold ${titleFontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  }
  const titleText = ctx.measureText(title).width > contentWidth
    ? title.substring(0, Math.floor(title.length * contentWidth / ctx.measureText(title).width) - 2) + '...'
    : title;
  const titleX = (width - ctx.measureText(titleText).width) / 2;
  ctx.fillText(titleText, titleX, 140);

  // 标题下装饰线
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 60, 170);
  ctx.lineTo(width / 2 + 60, 170);
  ctx.stroke();

  // 绘制精句（大字报风格，居中显示）
  // 使用较大字号，模拟行书效果
  const quoteAreaTop = 220;
  const quoteAreaBottom = height - 380;
  const quoteAreaHeight = quoteAreaBottom - quoteAreaTop;

  // 根据精句长度动态调整字号
  let quoteFontSize = 72;
  const maxQuoteWidth = contentWidth - 40;
  ctx.font = `bold ${quoteFontSize}px "KaiTi", "STKaiti", "Microsoft YaHei", sans-serif`;

  // 计算换行
  let quoteLines = wrapText(ctx, quote, maxQuoteWidth);
  const lineHeight = quoteFontSize * 1.6;

  // 如果行数太多，缩小字号
  while (quoteLines.length * lineHeight > quoteAreaHeight && quoteFontSize > 36) {
    quoteFontSize -= 4;
    ctx.font = `bold ${quoteFontSize}px "KaiTi", "STKaiti", "Microsoft YaHei", sans-serif`;
    quoteLines = wrapText(ctx, quote, maxQuoteWidth);
  }

  // 计算垂直居中位置
  const totalQuoteHeight = quoteLines.length * quoteFontSize * 1.6;
  let quoteY = quoteAreaTop + (quoteAreaHeight - totalQuoteHeight) / 2 + quoteFontSize;

  // 绘制精句文字
  ctx.fillStyle = colors.quote;
  ctx.font = `bold ${quoteFontSize}px "KaiTi", "STKaiti", "Microsoft YaHei", sans-serif`;

  for (const line of quoteLines) {
    const lineWidth = ctx.measureText(line).width;
    const lineX = (width - lineWidth) / 2;
    ctx.fillText(line, lineX, quoteY);
    quoteY += quoteFontSize * 1.6;
  }

  // 精句下方装饰
  ctx.fillStyle = colors.accent;
  ctx.font = '28px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  const decoText = '◆';
  const decoWidth = ctx.measureText(decoText).width;
  ctx.fillText(decoText, (width - decoWidth) / 2, quoteAreaBottom + 30);

  // 生成二维码
  const qrSize = 160;
  // 深色主题使用白色二维码，浅色主题使用深色二维码
  const isDarkTheme = ['dark', 'tech'].includes(theme);
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    width: qrSize,
    margin: 1,
    color: {
      dark: isDarkTheme ? '#FFFFFF' : '#2D2016',
      light: '#00000000',
    },
  });

  // 绘制二维码（底部居中）
  const qrY = height - 280;
  const qrX = (width - qrSize) / 2;
  const { loadImage } = await import('canvas');
  const qrImage = await loadImage(qrDataUrl);
  ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

  // 绘制扫码提示
  ctx.fillStyle = colors.qrText;
  ctx.font = '24px "Microsoft YaHei", "PingFang SC", sans-serif';
  const scanText = '扫码阅读全文';
  const scanTextWidth = ctx.measureText(scanText).width;
  ctx.fillText(scanText, (width - scanTextWidth) / 2, qrY + qrSize + 35);

  // 绘制品牌信息（底部）
  if (brandText) {
    ctx.fillStyle = colors.brand;
    ctx.font = '22px "Microsoft YaHei", "PingFang SC", sans-serif';
    const brandWidth = ctx.measureText(brandText).width;
    ctx.fillText(brandText, (width - brandWidth) / 2, height - 50);
  }

  return canvas.toBuffer('image/png');
}

// 确保海报目录存在
export function ensurePosterDir(): string {
  const posterDir = './uploads/posters';
  if (!fs.existsSync(posterDir)) {
    fs.mkdirSync(posterDir, { recursive: true });
  }
  return posterDir;
}
