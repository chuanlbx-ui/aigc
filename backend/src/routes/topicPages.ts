import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const prisma = new PrismaClient();
export const topicPagesRouter = Router();

// 所有专题页面管理路由都需要登录
topicPagesRouter.use(requireAuth);

// 生成 slug
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
}

// 预设模板配置
const PAGE_TEMPLATES = {
  default: {
    name: '标准首页',
    sections: [
      { name: 'Banner轮播', type: 'banner', showTitle: false, layoutConfig: { autoPlay: true, interval: 5000 }, filterConfig: { limit: 5, sortBy: 'publishedAt' } },
      { name: '最新文章', type: 'card_list', showTitle: true, layoutConfig: { columns: 2, showCover: true, showSummary: true }, filterConfig: { limit: 6, sortBy: 'publishedAt', excludePrevious: true } },
      { name: '热门文章', type: 'title_list', showTitle: true, layoutConfig: { showIndex: true, showDate: true }, filterConfig: { limit: 10, sortBy: 'viewCount', excludePrevious: true } },
    ]
  },
  magazine: {
    name: '杂志风格',
    sections: [
      { name: '头条推荐', type: 'banner', showTitle: false, layoutConfig: { height: 300 }, filterConfig: { limit: 1, sortBy: 'publishedAt' } },
      { name: '精选内容', type: 'card_list', showTitle: true, layoutConfig: { columns: 2, cardStyle: 'large' }, filterConfig: { limit: 8, sortBy: 'viewCount', excludePrevious: true } },
    ]
  },
  minimal: {
    name: '极简风格',
    sections: [
      { name: '文章列表', type: 'title_list', showTitle: true, layoutConfig: { showDate: true, showCategory: true }, filterConfig: { limit: 20, sortBy: 'publishedAt' } },
    ]
  }
};

// ========== 专题页面 CRUD ==========

// 获取专题页面列表
topicPagesRouter.get('/', async (req, res) => {
  try {
    const { status, search, page = '1', pageSize = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { title: { contains: search as string } },
      ];
    }

    const [pages, total] = await Promise.all([
      prisma.topicPage.findMany({
        where,
        include: { sections: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { sortOrder: 'asc' },
        skip,
        take,
      }),
      prisma.topicPage.count({ where }),
    ]);

    res.json({ pages, total, page: parseInt(page as string), pageSize: take });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个专题页面
topicPagesRouter.get('/:id', async (req, res) => {
  try {
    const page = await prisma.topicPage.findUnique({
      where: { id: req.params.id },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!page) {
      return res.status(404).json({ error: '页面不存在' });
    }
    res.json(page);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 创建专题页面
topicPagesRouter.post('/', async (req, res) => {
  try {
    const { name, title, description, template = 'default', coverImage } = req.body;

    if (!name || !title) {
      return res.status(400).json({ error: '名称和标题不能为空' });
    }

    const slug = generateSlug(title);
    const templateConfig = PAGE_TEMPLATES[template as keyof typeof PAGE_TEMPLATES] || PAGE_TEMPLATES.default;

    // 创建页面和默认区块
    const page = await prisma.topicPage.create({
      data: {
        name,
        slug,
        title,
        description,
        template,
        coverImage,
        sections: {
          create: templateConfig.sections.map((section, index) => ({
            name: section.name,
            type: section.type,
            title: section.name,
            layoutConfig: JSON.stringify(section.layoutConfig),
            filterConfig: JSON.stringify(section.filterConfig),
            sortOrder: index,
          })),
        },
      },
      include: { sections: true },
    });

    res.status(201).json(page);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 更新专题页面
topicPagesRouter.put('/:id', async (req, res) => {
  try {
    const { name, title, description, coverImage, config, sortOrder, status } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (config) updateData.config = JSON.stringify(config);
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (status) {
      updateData.status = status;
      if (status === 'published') {
        updateData.publishedAt = new Date();
      }
    }

    const page = await prisma.topicPage.update({
      where: { id: req.params.id },
      data: updateData,
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
    });

    res.json(page);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 删除专题页面
topicPagesRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.topicPage.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 发布专题页面
topicPagesRouter.post('/:id/publish', async (req, res) => {
  try {
    const page = await prisma.topicPage.update({
      where: { id: req.params.id },
      data: { status: 'published', publishedAt: new Date() },
    });
    res.json(page);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 取消发布
topicPagesRouter.post('/:id/unpublish', async (req, res) => {
  try {
    const page = await prisma.topicPage.update({
      where: { id: req.params.id },
      data: { status: 'draft', publishedAt: null },
    });
    res.json(page);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 区块管理 ==========

// 区块排序 - 必须放在 /:id/sections/:sectionId 之前
topicPagesRouter.put('/:id/sections/reorder', async (req, res) => {
  try {
    const { sectionIds } = req.body;
    await Promise.all(
      sectionIds.map((id: string, index: number) =>
        prisma.topicPageSection.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 添加区块
topicPagesRouter.post('/:id/sections', async (req, res) => {
  try {
    const { name, type, title, showTitle, layoutConfig, filterConfig } = req.body;

    // 获取当前最大排序
    const maxSection = await prisma.topicPageSection.findFirst({
      where: { pageId: req.params.id },
      orderBy: { sortOrder: 'desc' },
    });

    const section = await prisma.topicPageSection.create({
      data: {
        pageId: req.params.id,
        name,
        type,
        title,
        showTitle: showTitle ?? true,
        layoutConfig: JSON.stringify(layoutConfig || {}),
        filterConfig: JSON.stringify(filterConfig || {}),
        sortOrder: (maxSection?.sortOrder ?? -1) + 1,
      },
    });

    res.status(201).json(section);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 更新区块
topicPagesRouter.put('/:id/sections/:sectionId', async (req, res) => {
  try {
    const { name, type, title, showTitle, layoutConfig, filterConfig, manualContentIds, isEnabled } = req.body;

    const section = await prisma.topicPageSection.update({
      where: { id: req.params.sectionId },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(title !== undefined && { title }),
        ...(showTitle !== undefined && { showTitle }),
        ...(layoutConfig && { layoutConfig: JSON.stringify(layoutConfig) }),
        ...(filterConfig && { filterConfig: JSON.stringify(filterConfig) }),
        ...(manualContentIds && { manualContentIds: JSON.stringify(manualContentIds) }),
        ...(isEnabled !== undefined && { isEnabled }),
      },
    });

    res.json(section);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 删除区块
topicPagesRouter.delete('/:id/sections/:sectionId', async (req, res) => {
  try {
    await prisma.topicPageSection.delete({ where: { id: req.params.sectionId } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
