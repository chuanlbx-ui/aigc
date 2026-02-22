/**
 * 热点抓取器基类
 * 定义统一的抓取接口
 */

export interface RawTopic {
  title: string;
  description?: string;
  url?: string;
  hotScore: number;
  category?: string;
  tags?: string[];
}

export abstract class HotTopicFetcher {
  protected source: string;

  constructor(source: string) {
    this.source = source;
  }

  /**
   * 抓取热点数据
   */
  abstract fetchTopics(): Promise<RawTopic[]>;

  /**
   * 解析原始数据
   */
  protected abstract parseTopics(raw: any): RawTopic[];

  /**
   * 验证数据有效性
   */
  protected validateTopic(topic: RawTopic): boolean {
    return !!(topic.title && topic.hotScore > 0);
  }

  /**
   * 过滤无效数据
   */
  protected filterTopics(topics: RawTopic[]): RawTopic[] {
    return topics.filter(topic => this.validateTopic(topic));
  }
}
