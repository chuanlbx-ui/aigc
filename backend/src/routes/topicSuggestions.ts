import express from 'express';
import { topicSuggestionService } from '../services/topicSuggestion/index.js';
import { TopicDomain } from '../services/topicSuggestion/domainClassifier.js';

const router = express.Router();

/**
 * GET /api/topic-suggestions
 * 获取推荐选题(按领域分组)
 */
router.get('/', async (req, res) => {
  try {
    const { domains, limit, minRelevance } = req.query;

    const options: any = {};

    if (domains) {
      options.domains = Array.isArray(domains) ? domains : [domains];
    }

    if (limit) {
      options.limit = parseInt(limit as string);
    }

    if (minRelevance) {
      options.minRelevance = parseFloat(minRelevance as string);
    }

    const result = await topicSuggestionService.getRecommendations(options);

    res.json(result);
  } catch (error: any) {
    console.error('获取推荐选题失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/topic-suggestions/refresh
 * 刷新选题数据
 */
router.post('/refresh', async (req, res) => {
  try {
    const { sources } = req.body;

    await topicSuggestionService.refreshTopics(sources);

    res.json({ message: '刷新成功' });
  } catch (error: any) {
    console.error('刷新选题失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/topic-suggestions/by-domain/:domain
 * 获取指定领域的选题
 */
router.get('/by-domain/:domain', async (req, res) => {
  try {
    const { domain } = req.params;
    const { limit } = req.query;

    const topics = await topicSuggestionService.getTopicsByDomain(
      domain as TopicDomain,
      limit ? parseInt(limit as string) : 10
    );

    res.json({ topics });
  } catch (error: any) {
    console.error('获取领域选题失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/topic-suggestions/generate-from-knowledge
 * 基于知识库生成选题
 */
router.post('/generate-from-knowledge', async (req, res) => {
  try {
    const { limit, topicsPerDoc } = req.body;

    await topicSuggestionService.generateFromKnowledge({
      limit,
      topicsPerDoc,
    });

    res.json({ message: '知识库选题生成成功' });
  } catch (error: any) {
    console.error('生成知识库选题失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/topic-suggestions/:id/accept
 * 接受选题并创建文章
 */
router.post('/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const { platform, column, userId, categoryId } = req.body;

    const article = await topicSuggestionService.acceptTopic(id, platform, column, userId, categoryId);

    res.json({ article });
  } catch (error: any) {
    console.error('接受选题失败:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
