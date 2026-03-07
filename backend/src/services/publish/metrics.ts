/**
 * 发布后数据反馈服务
 * 负责采集、存储和展示内容效果数据
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 微信公众号 API 配置
const WECHAT_API = {
  // 获取文章数据
  getArticleSummary: 'https://api.weixin.qq.com/datacube/getarticlesummary',
  getArticleTotal: 'https://api.weixin.qq.com/datacube/getarticletotal',
  // 获取用户分析
  getUserSummary: 'https://api.weixin.qq.com/datacube/getusersummary',
};

export interface MetricsData {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  collectCount: number;
  avgReadTime?: number;
  readCompletion?: number;
  clickRate?: number;
  engagementRate?: number;
  followCount?: number;
  forwardCount?: number;
}

export interface PlatformMetricsConfig {
  platform: string;
  accessToken?: string;
  appId?: string;
  appSecret?: string;
}

/**
 * 获取微信公众号文章数据
 */
async function fetchWechatMetrics(
  accessToken: string,
  articleId: string,
  date: string
): Promise<MetricsData | null> {
  try {
    const response = await fetch(WECHAT_API.getArticleTotal, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        begin_date: date,
        end_date: date,
      }),
    });

    if (!response.ok) {
      console.error('WeChat API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    // 查找对应文章的数据
    const articleData = data.list?.find((item: any) => 
      item.ref_date === date && item.msg_data?.some((msg: any) => msg.msgid === articleId)
    );

    if (!articleData) return null;

    const msgData = articleData.msg_data?.find((msg: any) => msg.msgid === articleId);
    if (!msgData) return null;

    return {
      viewCount: msgData.int_page_read_count || 0,
      likeCount: msgData.like_count || 0,
      commentCount: msgData.comment_count || 0,
      shareCount: msgData.share_count || 0,
      collectCount: msgData.add_to_fav_count || 0,
      avgReadTime: msgData.int_page_read_user > 0 
        ? msgData.int_page_read_time / msgData.int_page_read_user 
        : undefined,
      engagementRate: msgData.int_page_read_count > 0
        ? (msgData.like_count + msgData.comment_count + msgData.share_count) / msgData.int_page_read_count
        : undefined,
    };
  } catch (error) {
    console.error('Fetch WeChat metrics error:', error);
    return null;
  }
}

/**
 * 获取小红书文章数据（通过爬虫或第三方API）
 */
async function fetchXiaohongshuMetrics(
  noteId: string,
  _config?: PlatformMetricsConfig
): Promise<MetricsData | null> {
  // 小红书没有官方API，需要通过浏览器扩展或第三方服务获取
  // 这里返回模拟数据，实际实现需要集成浏览器扩展
  console.log('Xiaohongshu metrics fetching not implemented for:', noteId);
  return null;
}

/**
 * 保存效果数据
 */
export async function saveMetrics(
  articleId: string,
  platform: string,
  platformPostId: string | null,
  data: MetricsData,
  metricsDate: Date = new Date()
): Promise<void> {
  await prisma.contentMetrics.upsert({
    where: {
      articleId_platform_metricsDate: {
        articleId,
        platform,
        metricsDate,
      },
    },
    create: {
      articleId,
      platform,
      platformPostId,
      ...data,
      metricsDate,
    },
    update: {
      ...data,
      fetchedAt: new Date(),
    },
  });
}

/**
 * 批量采集文章效果数据
 */
export async function fetchAndSaveMetrics(
  articleId: string,
  platform: string,
  platformPostId: string | null,
  config: PlatformMetricsConfig
): Promise<MetricsData | null> {
  const today = new Date().toISOString().split('T')[0];
  let metrics: MetricsData | null = null;

  switch (platform) {
    case 'wechat':
      if (config.accessToken) {
        metrics = await fetchWechatMetrics(config.accessToken, platformPostId || articleId, today);
      }
      break;
    case 'xiaohongshu':
      metrics = await fetchXiaohongshuMetrics(platformPostId || articleId, config);
      break;
    // 其他平台的实现
    default:
      console.log(`Platform ${platform} metrics fetching not implemented`);
  }

  if (metrics) {
    await saveMetrics(articleId, platform, platformPostId, metrics);
  }

  return metrics;
}

/**
 * 获取文章效果数据历史
 */
export async function getMetricsHistory(
  articleId: string,
  days: number = 30
): Promise<any[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return prisma.contentMetrics.findMany({
    where: {
      articleId,
      metricsDate: {
        gte: startDate,
      },
    },
    orderBy: {
      metricsDate: 'asc',
    },
  });
}

/**
 * 获取文章效果汇总
 */
export async function getMetricsSummary(articleId: string): Promise<{
  total: MetricsData;
  byPlatform: Record<string, MetricsData>;
  trend: Array<{ date: string; viewCount: number; engagementRate: number }>;
}> {
  const metrics = await prisma.contentMetrics.findMany({
    where: { articleId },
    orderBy: { metricsDate: 'desc' },
  });

  // 计算总计
  const total: MetricsData = {
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    collectCount: 0,
  };

  const byPlatform: Record<string, MetricsData> = {};

  for (const m of metrics) {
    total.viewCount += m.viewCount;
    total.likeCount += m.likeCount;
    total.commentCount += m.commentCount;
    total.shareCount += m.shareCount;
    total.collectCount += m.collectCount;

    if (!byPlatform[m.platform]) {
      byPlatform[m.platform] = {
        viewCount: 0,
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        collectCount: 0,
      };
    }
    byPlatform[m.platform].viewCount += m.viewCount;
    byPlatform[m.platform].likeCount += m.likeCount;
    byPlatform[m.platform].commentCount += m.commentCount;
    byPlatform[m.platform].shareCount += m.shareCount;
    byPlatform[m.platform].collectCount += m.collectCount;
  }

  // 计算互动率
  if (total.viewCount > 0) {
    total.engagementRate = (total.likeCount + total.commentCount + total.shareCount) / total.viewCount;
  }

  // 计算趋势（最近30天）
  const trend = metrics
    .slice(0, 30)
    .reverse()
    .map(m => ({
      date: m.metricsDate.toISOString().split('T')[0],
      viewCount: m.viewCount,
      engagementRate: m.engagementRate || 0,
    }));

  return { total, byPlatform, trend };
}

/**
 * 手动记录效果数据（用于浏览器扩展上报）
 */
export async function recordMetrics(
  articleId: string,
  platform: string,
  data: MetricsData,
  platformPostId?: string
): Promise<void> {
  await saveMetrics(articleId, platform, platformPostId || null, data);
}

/**
 * 获取高表现内容（用于分析）
 */
export async function getTopPerformingContent(
  platform?: string,
  limit: number = 10,
  days: number = 30
): Promise<any[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const where: any = {
    metricsDate: { gte: startDate },
  };
  if (platform) where.platform = platform;

  const results = await prisma.$queryRaw`
    SELECT 
      a.id, a.title, a.platform, a.column, a."publishedAt",
      SUM(m."viewCount") as total_views,
      SUM(m."likeCount") as total_likes,
      SUM(m."commentCount") as total_comments,
      SUM(m."shareCount") as total_shares,
      AVG(m."engagementRate") as avg_engagement
    FROM "ContentMetrics" m
    JOIN "Article" a ON m."articleId" = a.id
    WHERE m."metricsDate" >= ${startDate}
      ${platform ? prisma.Prisma.sql`AND m.platform = ${platform}` : prisma.Prisma.empty}
    GROUP BY a.id, a.title, a.platform, a.column, a."publishedAt"
    ORDER BY total_views DESC
    LIMIT ${limit}
  `;

  return results;
}
