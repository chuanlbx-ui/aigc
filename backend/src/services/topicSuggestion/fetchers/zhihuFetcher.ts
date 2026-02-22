import axios from 'axios';
import { RawTopic, HotTopicFetcher } from '../../hotTopic/fetchers/base.js';

export class ZhihuFetcher extends HotTopicFetcher {
  private apiUrl: string;

  constructor() {
    super('zhihu');
    this.apiUrl = 'https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total';
  }

  async fetchTopics(): Promise<RawTopic[]> {
    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          limit: 50,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.zhihu.com/hot',
        },
        timeout: 10000,
      });

      if (response.status !== 200) {
        throw new Error(`知乎API请求失败: ${response.status}`);
      }

      return this.parseTopics(response.data);
    } catch (error: any) {
      console.error('知乎热榜抓取失败:', error.message);
      // 返回空数组而不是抛出错误，避免阻塞其他数据源
      return [];
    }
  }

  protected parseTopics(raw: any): RawTopic[] {
    if (!raw.data || !Array.isArray(raw.data)) {
      console.error('知乎API返回数据格式错误');
      return [];
    }

    const topics: RawTopic[] = raw.data.map((item: any) => {
      const target = item.target || {};
      const title = target.title || item.title || '';
      const excerpt = target.excerpt || '';
      const hotScore = parseInt(item.detail_text?.replace(/[^0-9]/g, '') || '0');

      return {
        title,
        description: excerpt,
        url: `https://www.zhihu.com/question/${target.id}`,
        hotScore,
        category: item.type || '综合',
        tags: [],
      };
    });

    return this.filterTopics(topics);
  }
}

export const zhihuFetcher = new ZhihuFetcher();
