/**
 * 统一模板 API 路由
 */

import { Router } from 'express';
import { UnifiedTemplateService } from '../services/template/UnifiedTemplateService.js';
import { TemplateRecommender } from '../services/template/TemplateRecommender.js';
import { VersionManager } from '../services/template/VersionManager.js';
import { TemplateSharing } from '../services/template/TemplateSharing.js';
import { TemplateType } from '../services/template/types.js';

const router = Router();
const templateService = new UnifiedTemplateService();
const recommender = new TemplateRecommender();
const versionManager = new VersionManager();
const templateSharing = new TemplateSharing();

/**
 * 获取模板列表
 * GET /api/unified-templates
 */
router.get('/', async (req, res) => {
  try {
    const {
      type,
      category,
      platform,
      column,
      search,
      isSystem,
      page = '1',
      pageSize = '20',
    } = req.query;

    const filters = {
      type: type as TemplateType | undefined,
      category: category as 'system' | 'custom' | undefined,
      platform: platform as string | undefined,
      column: column as string | undefined,
      search: search as string | undefined,
      isSystem: isSystem === 'true' ? true : isSystem === 'false' ? false : undefined,
      userId: (req as any).user?.id,
    };

    const pagination = {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    };

    const result = await templateService.listTemplates(filters, pagination);
    res.json(result);
  } catch (error: any) {
    console.error('获取模板列表失败:', error);
    res.status(500).json({ error: error.message || '获取模板列表失败' });
  }
});

/**
 * 获取单个模板
 * GET /api/unified-templates/:type/:id
 */
router.get('/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const template = await templateService.getTemplate(type as TemplateType, id);

    if (!template) {
      return res.status(404).json({ error: '模板不存在' });
    }

    res.json(template);
  } catch (error: any) {
    console.error('获取模板失败:', error);
    res.status(500).json({ error: error.message || '获取模板失败' });
  }
});

/**
 * 创建模板
 * POST /api/unified-templates
 */
router.post('/', async (req, res) => {
  try {
    const { type, name, description, config, thumbnail, platform, column } = req.body;

    if (!type || !name) {
      return res.status(400).json({ error: '类型和名称不能为空' });
    }

    const userId = (req as any).user?.id;
    const template = await templateService.createTemplate(
      { type, name, description, config, thumbnail, platform, column },
      userId
    );

    res.json(template);
  } catch (error: any) {
    console.error('创建模板失败:', error);
    res.status(500).json({ error: error.message || '创建模板失败' });
  }
});

/**
 * 更新模板
 * PUT /api/unified-templates/:type/:id
 */
router.put('/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const data = req.body;

    const template = await templateService.updateTemplate(
      type as TemplateType,
      id,
      data
    );

    res.json(template);
  } catch (error: any) {
    console.error('更新模板失败:', error);
    res.status(500).json({ error: error.message || '更新模板失败' });
  }
});

/**
 * 删除模板
 * DELETE /api/unified-templates/:type/:id
 */
router.delete('/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    await templateService.deleteTemplate(type as TemplateType, id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('删除模板失败:', error);
    res.status(500).json({ error: error.message || '删除模板失败' });
  }
});

/**
 * 克隆模板
 * POST /api/unified-templates/:type/:id/clone
 */
router.post('/:type/:id/clone', async (req, res) => {
  try {
    const { type, id } = req.params;
    const userId = (req as any).user?.id;

    const template = await templateService.cloneTemplate(
      type as TemplateType,
      id,
      userId
    );

    res.json(template);
  } catch (error: any) {
    console.error('克隆模板失败:', error);
    res.status(500).json({ error: error.message || '克隆模板失败' });
  }
});

/**
 * 获取推荐模板
 * GET /api/unified-templates/recommend/:type
 */
router.get('/recommend/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { platform, column, contentType, limit = '5' } = req.query;

    const context = {
      platform: platform as string | undefined,
      column: column as string | undefined,
      contentType: contentType as string | undefined,
      userId: (req as any).user?.id,
    };

    const recommendations = await recommender.recommend(
      type as TemplateType,
      context,
      parseInt(limit as string, 10)
    );

    res.json({ recommendations });
  } catch (error: any) {
    console.error('获取推荐模板失败:', error);
    res.status(500).json({ error: error.message || '获取推荐模板失败' });
  }
});

// ========== 版本管理 API ==========

/**
 * 获取版本列表
 * GET /api/unified-templates/:type/:id/versions
 */
router.get('/:type/:id/versions', async (req, res) => {
  try {
    const { type, id } = req.params;
    const versions = await versionManager.listVersions(id, type as TemplateType);
    res.json({ versions });
  } catch (error: any) {
    console.error('获取版本列表失败:', error);
    res.status(500).json({ error: error.message || '获取版本列表失败' });
  }
});

/**
 * 获取特定版本
 * GET /api/unified-templates/:type/:id/versions/:version
 */
router.get('/:type/:id/versions/:version', async (req, res) => {
  try {
    const { type, id, version } = req.params;
    const v = await versionManager.getVersion(
      id,
      type as TemplateType,
      parseInt(version, 10)
    );

    if (!v) {
      return res.status(404).json({ error: '版本不存在' });
    }

    res.json(v);
  } catch (error: any) {
    console.error('获取版本失败:', error);
    res.status(500).json({ error: error.message || '获取版本失败' });
  }
});

// ========== 分享管理 API ==========

/**
 * 创建分享
 * POST /api/unified-templates/:type/:id/share
 */
router.post('/:type/:id/share', async (req, res) => {
  try {
    const { type, id } = req.params;
    const { permission, expiresInDays, maxUses } = req.body;
    const userId = (req as any).user?.id;

    const share = await templateSharing.createShare(
      id,
      type as TemplateType,
      { permission, expiresInDays, maxUses },
      userId
    );

    res.json(share);
  } catch (error: any) {
    console.error('创建分享失败:', error);
    res.status(500).json({ error: error.message || '创建分享失败' });
  }
});

/**
 * 获取模板的分享列表
 * GET /api/unified-templates/:type/:id/shares
 */
router.get('/:type/:id/shares', async (req, res) => {
  try {
    const { type, id } = req.params;
    const shares = await templateSharing.listShares(id, type as TemplateType);
    res.json({ shares });
  } catch (error: any) {
    console.error('获取分享列表失败:', error);
    res.status(500).json({ error: error.message || '获取分享列表失败' });
  }
});

/**
 * 通过分享码获取模板
 * GET /api/unified-templates/share/:code
 */
router.get('/share/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const shareInfo = await templateSharing.getByCode(code);

    if (!shareInfo) {
      return res.status(404).json({ error: '分享不存在' });
    }

    const isValid = await templateSharing.validateShare(code);
    if (!isValid) {
      return res.status(410).json({ error: '分享已过期或已达到使用上限' });
    }

    res.json(shareInfo);
  } catch (error: any) {
    console.error('获取分享失败:', error);
    res.status(500).json({ error: error.message || '获取分享失败' });
  }
});

/**
 * 使用分享码（克隆模板）
 * POST /api/unified-templates/share/:code/use
 */
router.post('/share/:code/use', async (req, res) => {
  try {
    const { code } = req.params;
    const userId = (req as any).user?.id;

    const shareInfo = await templateSharing.useShare(code);
    if (!shareInfo) {
      return res.status(410).json({ error: '分享无效或已过期' });
    }

    res.json({ success: true, shareInfo });
  } catch (error: any) {
    console.error('使用分享失败:', error);
    res.status(500).json({ error: error.message || '使用分享失败' });
  }
});

/**
 * 撤销分享
 * DELETE /api/unified-templates/share/:code
 */
router.delete('/share/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const success = await templateSharing.revokeShare(code);

    if (!success) {
      return res.status(404).json({ error: '分享不存在' });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('撤销分享失败:', error);
    res.status(500).json({ error: error.message || '撤销分享失败' });
  }
});

export default router;
