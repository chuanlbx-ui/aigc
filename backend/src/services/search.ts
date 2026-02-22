import * as cheerio from 'cheerio';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
}

export interface SearchService {
  search(query: string, limit?: number): Promise<SearchResult[]>;
  fetchContent(url: string): Promise<string>;
}

// 使用 DuckDuckGo HTML 搜索（无需 API Key）
export class WebSearchService implements SearchService {
  async search(query: string, limit: number = 5): Promise<SearchResult[]> {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`搜索请求失败: ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const results: SearchResult[] = [];

      $('.result').each((i, el) => {
        if (i >= limit) return false;
        const $el = $(el);
        const title = $el.find('.result__title').text().trim();
        const href = $el.find('.result__url').attr('href') || '';
        const snippet = $el.find('.result__snippet').text().trim();

        if (title && href) {
          results.push({ title, url: href, snippet });
        }
      });

      return results;
    } catch (error: any) {
      console.error('搜索失败:', error.message);
      return [];
    }
  }

  async fetchContent(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`抓取失败: ${response.status}`);
      }

      const html = await response.text();
      return this.extractMainContent(html);
    } catch (error: any) {
      console.error('抓取内容失败:', error.message);
      throw error;
    }
  }

  private extractMainContent(html: string): string {
    const $ = cheerio.load(html);

    // 移除不需要的元素
    $('script, style, nav, header, footer, aside, .sidebar, .menu, .ad, .advertisement').remove();

    // 尝试获取主要内容区域
    let content = '';
    const selectors = ['article', 'main', '.content', '.post', '.article', '#content', '#main'];

    for (const selector of selectors) {
      const el = $(selector);
      if (el.length > 0) {
        content = el.text();
        break;
      }
    }

    // 如果没找到特定区域，使用 body
    if (!content) {
      content = $('body').text();
    }

    // 清理文本
    return content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim()
      .substring(0, 20000); // 限制长度
  }
}

export const searchService = new WebSearchService();
