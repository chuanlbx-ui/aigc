/**
 * 今日头条热点抓取器
 * 使用头条API获取热点新闻
 */

import { HotTopicFetcher, RawTopic } from './base.js';

export class ToutiaoFetcher extends HotTopicFetcher {
  private apiUrl: string;

  constructor() {
    super('toutiao');
    // 使用头条热榜API
    this.apiUrl = 'https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc';
  }

  async fetchTopics(): Promise<RawTopic[]> {
    try {
      const response = await fetch(this.apiUrl);
      if (!response.ok) {
        throw new Error(`头条API请求失败: ${response.status}`);
      }

      const data = await response.json();
      const topics = this.parseTopics(data);
      return this.filterTopics(topics);
    } catch (error) {
      console.error('头条热点抓取失败:', error);
      return [];
    }
  }

  protected parseTopics(raw: any): RawTopic[] {
    if (!raw?.data) {
      return [];
    }

    return raw.data.map((item: any, index: number) => ({
      title: item.Title || item.title,
      description: item.Abstract || undefined,
      url: item.Url || item.url,
      hotScore: item.HotValue || item.hot_value || (100 - index),
      category: item.ClusterIdStr || '综合',
      tags: item.LabelUrl ? [item.LabelUrl] : [],
    }));
  }
}
