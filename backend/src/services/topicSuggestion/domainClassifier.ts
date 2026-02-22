import { aiService, ChatMessage } from '../ai/index.js';

// 领域枚举
export enum TopicDomain {
  TECH = 'tech',           // 科技/AI/编程
  FINANCE = 'finance',     // 财经/商业
  CULTURE = 'culture',     // 文化/教育
  LIFE = 'life',           // 生活/健康
}

// 领域配置
export const DOMAIN_CONFIG = {
  tech: {
    name: '科技/AI/编程',
    keywords: ['AI', '人工智能', '编程', '开发', '技术', '科技', '互联网', '软件', '硬件', '芯片', '算法', '机器学习', '深度学习', '云计算', '大数据', '区块链', '5G', '物联网', 'IoT', '智能', '数字化', '代码', 'GitHub', '开源'],
    color: '#1890ff',
    icon: 'CodeOutlined',
  },
  finance: {
    name: '财经/商业',
    keywords: ['财经', '商业', '经济', '金融', '投资', '创业', '市场', '股票', '基金', '理财', '银行', '保险', '房地产', '企业', '公司', '上市', 'IPO', '融资', '估值', '营收', '利润', '电商', '零售', '消费'],
    color: '#52c41a',
    icon: 'DollarOutlined',
  },
  culture: {
    name: '文化/教育',
    keywords: ['文化', '教育', '学习', '艺术', '历史', '哲学', '社会', '书籍', '阅读', '写作', '音乐', '电影', '戏剧', '绘画', '摄影', '设计', '文学', '诗歌', '考试', '升学', '培训', '课程', '知识'],
    color: '#722ed1',
    icon: 'BookOutlined',
  },
  life: {
    name: '生活/健康',
    keywords: ['生活', '健康', '养生', '美食', '旅游', '运动', '心理', '医疗', '疾病', '药品', '健身', '减肥', '营养', '饮食', '睡眠', '情感', '家庭', '育儿', '宠物', '时尚', '美妆', '穿搭'],
    color: '#fa8c16',
    icon: 'HeartOutlined',
  },
};

export interface ClassificationResult {
  domain: TopicDomain;
  confidence: number;  // 0-1
  method: 'keyword' | 'ai';
}

export class DomainClassifier {
  /**
   * 分类单个选题
   */
  async classify(title: string, description?: string): Promise<ClassificationResult> {
    // 先尝试关键词匹配(快速)
    const keywordResult = this.keywordMatch(title, description);

    if (keywordResult.confidence >= 0.8) {
      return keywordResult;
    }

    // 关键词匹配置信度低,使用AI分类(精确)
    try {
      const aiResult = await this.aiClassify(title, description);
      return aiResult;
    } catch (error) {
      console.error('AI分类失败,使用关键词匹配结果:', error);
      return keywordResult;
    }
  }

  /**
   * 批量分类
   */
  async classifyBatch(topics: Array<{ title: string; description?: string }>): Promise<ClassificationResult[]> {
    const results: ClassificationResult[] = [];

    for (const topic of topics) {
      const result = await this.classify(topic.title, topic.description);
      results.push(result);
    }

    return results;
  }

  /**
   * 关键词匹配(快速分类)
   */
  private keywordMatch(title: string, description?: string): ClassificationResult {
    const text = `${title} ${description || ''}`.toLowerCase();
    const scores: Record<string, number> = {
      tech: 0,
      finance: 0,
      culture: 0,
      life: 0,
    };

    // 计算每个领域的匹配分数
    for (const [domain, config] of Object.entries(DOMAIN_CONFIG)) {
      for (const keyword of config.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          scores[domain] += 1;
        }
      }
    }

    // 找出最高分
    let maxDomain = TopicDomain.TECH;
    let maxScore = scores.tech;

    for (const [domain, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        maxDomain = domain as TopicDomain;
      }
    }

    // 计算置信度(归一化到0-1)
    const totalMatches = Object.values(scores).reduce((a, b) => a + b, 0);
    const confidence = totalMatches > 0 ? maxScore / totalMatches : 0.25;

    return {
      domain: maxDomain,
      confidence: Math.min(confidence, 0.9), // 关键词匹配最高0.9
      method: 'keyword',
    };
  }

  /**
   * AI分类(精确分类)
   */
  private async aiClassify(title: string, description?: string): Promise<ClassificationResult> {
    const prompt = `请将以下选题分类到四个领域之一：tech(科技/AI/编程)、finance(财经/商业)、culture(文化/教育)、life(生活/健康)。

选题标题：${title}
${description ? `选题描述：${description}` : ''}

请直接返回JSON格式：
{
  "domain": "tech|finance|culture|life",
  "confidence": 0.95,
  "reason": "分类理由"
}`;

    const service = await aiService.getDefaultService();
    const messages: ChatMessage[] = [
      { role: 'user', content: prompt }
    ];

    const response = await service.chat(messages);

    try {
      const result = JSON.parse(response);
      return {
        domain: result.domain as TopicDomain,
        confidence: result.confidence,
        method: 'ai',
      };
    } catch (error) {
      console.error('AI分类响应解析失败:', response);
      throw error;
    }
  }
}

export const domainClassifier = new DomainClassifier();
