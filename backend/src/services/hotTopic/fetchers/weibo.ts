/**
 * 微博热搜抓取器
 * 使用第三方API获取微博热搜榜
 */

import { HotTopicFetcher, RawTopic } from './base.js';

export class WeiboFetcher extends HotTopicFetcher {
  private apiUrl: string;

  constructor() {
    super('weibo');
    // 使用免费的微博热搜API
    this.apiUrl = 'https://weibo.com/ajax/side/hotSearch';
  }

  async fetchTopics(): Promise<RawTopic[]> {
    try {
      const response = await fetch(this.apiUrl);
      if (!response.ok) {
        throw new Error(`微博API请求失败: ${response.status}`);
      }

      const data = await response.json();
      const topics = this.parseTopics(data);
      return this.filterTopics(topics);
    } catch (error) {
      console.error('微博热搜抓取失败:', error);
      return [];
    }
  }

  protected parseTopics(raw: any): RawTopic[] {
    if (!raw?.data?.realtime) {
      return [];
    }

    return raw.data.realtime.map((item: any, index: number) => ({
      title: item.word || item.note,
      description: item.word_scheme || undefined,
      url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word)}`,
      hotScore: item.num || (100 - index),
      category: item.category || '综合',
      tags: item.label_name ? [item.label_name] : [],
    }));
  }
}
