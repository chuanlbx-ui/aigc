import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tag, Space, Spin, Typography, Divider, Button, message } from 'antd';
import {
  CalendarOutlined, EyeOutlined, ClockCircleOutlined,
  ArrowLeftOutlined, TagOutlined, PictureOutlined,
  ShareAltOutlined, WechatOutlined, CopyOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { api } from '../api/client';
import { PLATFORM_NAMES } from '../stores/article';
import ArticleReader, { FontSizeType, ThemeType } from '../components/Article/ArticleReader';
import { getThemeClassName, getAllThemeStyles } from '../components/Article/MarkdownThemes';
import PosterGeneratorModal from '../components/Article/PosterGeneratorModal';

const { Title, Text } = Typography;

// 字体大小映射
const FONT_SIZE_MAP: Record<FontSizeType, { body: number; title: number; lineHeight: number }> = {
  small: { body: 14, title: 22, lineHeight: 1.6 },
  medium: { body: 16, title: 26, lineHeight: 1.8 },
  large: { body: 18, title: 30, lineHeight: 2.0 },
  xlarge: { body: 22, title: 36, lineHeight: 2.2 },
};

// 主题样式映射
const THEME_MAP: Record<ThemeType, { bg: string; cardBg: string; text: string; secondaryText: string; border: string }> = {
  light: { bg: '#f5f5f5', cardBg: '#ffffff', text: '#000000', secondaryText: '#666666', border: '#f0f0f0' },
  dark: { bg: '#1a1a1a', cardBg: '#2d2d2d', text: '#e0e0e0', secondaryText: '#a0a0a0', border: '#404040' },
};

// 段落渲染组件（带高亮支持，基于文本内容匹配）
function ParagraphRenderer({
  content,
  highlightMatchText,
  paragraphRefs,
  fontSize,
  lineHeight,
  textColor,
  isDarkMode,
  layoutTheme,
}: {
  content: string;
  highlightMatchText: string | null;
  paragraphRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  fontSize: number;
  lineHeight: number;
  textColor: string;
  isDarkMode: boolean;
  layoutTheme?: string;
}) {
  // 清理文本用于匹配（移除 Markdown 语法）
  const cleanTextForMatch = (text: string): string => {
    return text
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
      .replace(/#{1,6}\s*/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/>\s*/g, '')
      .replace(/[-*+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      .trim();
  };

  // 检查段落是否应该高亮
  const shouldHighlight = (children: React.ReactNode): boolean => {
    if (!highlightMatchText) return false;
    // 提取段落的纯文本内容
    const textContent = extractTextFromChildren(children);
    const cleanedText = cleanTextForMatch(textContent);
    // 检查段落开头是否匹配
    return cleanedText.startsWith(highlightMatchText) ||
           highlightMatchText.startsWith(cleanedText.substring(0, 30));
  };

  // 从 React children 中提取纯文本
  const extractTextFromChildren = (children: React.ReactNode): string => {
    if (typeof children === 'string') return children;
    if (typeof children === 'number') return String(children);
    if (Array.isArray(children)) {
      return children.map(extractTextFromChildren).join('');
    }
    if (children && typeof children === 'object' && 'props' in children) {
      return extractTextFromChildren((children as any).props.children);
    }
    return '';
  };

  // 高亮样式（根据主题调整背景色）
  const highlightBg = isDarkMode ? '#4a4a00' : '#fffbe6';
  const highlightBorder = isDarkMode ? '#d4b106' : '#faad14';

  const getHighlightStyle = (isHighlighted: boolean) => ({
    backgroundColor: isHighlighted ? highlightBg : 'transparent',
    borderLeft: isHighlighted ? `3px solid ${highlightBorder}` : 'none',
    paddingLeft: isHighlighted ? '12px' : '0',
    marginLeft: isHighlighted ? '-12px' : '0',
    transition: 'all 0.3s',
    borderRadius: isHighlighted ? '4px' : '0',
    fontSize,
    lineHeight,
    color: textColor,
  });

  return (
    <div className={`article-content ${layoutTheme ? getThemeClassName(layoutTheme) : ''}`} style={{ overflow: 'hidden', color: textColor }}>
      <ReactMarkdown
        components={{
          // 基于文本内容匹配高亮
          p: ({ children }) => {
            const isHighlighted = shouldHighlight(children);
            const textContent = extractTextFromChildren(children);
            const refKey = cleanTextForMatch(textContent).substring(0, 30);
            return (
              <p
                ref={(el) => {
                  if (el && refKey) paragraphRefs.current.set(refKey, el);
                }}
                style={getHighlightStyle(isHighlighted)}
              >
                {children}
              </p>
            );
          },
          // 一级标题高亮
          h1: ({ children }) => {
            const isHighlighted = shouldHighlight(children);
            const textContent = extractTextFromChildren(children);
            const refKey = cleanTextForMatch(textContent).substring(0, 30);
            return (
              <h1
                ref={(el) => {
                  if (el && refKey) paragraphRefs.current.set(refKey, el);
                }}
                style={{ ...getHighlightStyle(isHighlighted), fontSize: fontSize * 1.5, fontWeight: 'bold' }}
              >
                {children}
              </h1>
            );
          },
          // 二级标题高亮
          h2: ({ children }) => {
            const isHighlighted = shouldHighlight(children);
            const textContent = extractTextFromChildren(children);
            const refKey = cleanTextForMatch(textContent).substring(0, 30);
            return (
              <h2
                ref={(el) => {
                  if (el && refKey) paragraphRefs.current.set(refKey, el);
                }}
                style={{ ...getHighlightStyle(isHighlighted), fontSize: fontSize * 1.3, fontWeight: 'bold' }}
              >
                {children}
              </h2>
            );
          },
          // 三级标题高亮
          h3: ({ children }) => {
            const isHighlighted = shouldHighlight(children);
            const textContent = extractTextFromChildren(children);
            const refKey = cleanTextForMatch(textContent).substring(0, 30);
            return (
              <h3
                ref={(el) => {
                  if (el && refKey) paragraphRefs.current.set(refKey, el);
                }}
                style={{ ...getHighlightStyle(isHighlighted), fontSize: fontSize * 1.15, fontWeight: 'bold' }}
              >
                {children}
              </h3>
            );
          },
          // 图片不参与高亮
          img: ({ node, ...props }) => (
            <img
              {...props}
              style={{
                maxWidth: '100%',
                height: 'auto',
                display: 'block',
                margin: '16px 0',
                borderRadius: 4,
              }}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

interface ArticleData {
  id: string;
  title: string;
  slug: string;
  summary: string;
  coverImage?: string;
  content: string;
  platform: string;
  column: string;
  tags: string;
  wordCount: number;
  readTime: number;
  viewCount: number;
  publishedAt: string;
  category?: { name: string; color: string };
  layoutTheme?: string;  // 排版主题
}

export default function ArticleRead() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [highlightMatchText, setHighlightMatchText] = useState<string | null>(null);
  const [showPosterModal, setShowPosterModal] = useState(false);
  const paragraphRefs = useRef<Map<string, HTMLElement>>(new Map());
  const titleRef = useRef<HTMLElement>(null);

  // 字体大小和主题状态（从 localStorage 读取）
  const [fontSize, setFontSize] = useState<FontSizeType>(() => {
    return (localStorage.getItem('article-font-size') as FontSizeType) || 'medium';
  });
  const [theme, setTheme] = useState<ThemeType>(() => {
    return (localStorage.getItem('article-theme') as ThemeType) || 'light';
  });

  // 保存设置到 localStorage
  const handleFontSizeChange = (size: FontSizeType) => {
    setFontSize(size);
    localStorage.setItem('article-font-size', size);
  };

  const handleThemeChange = (t: ThemeType) => {
    setTheme(t);
    localStorage.setItem('article-theme', t);
  };

  // 获取当前样式
  const fontStyles = FONT_SIZE_MAP[fontSize];
  const themeStyles = THEME_MAP[theme];

  // 注入排版主题样式
  useEffect(() => {
    const styleId = 'md-theme-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = getAllThemeStyles();
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    if (slug) {
      loadArticle(slug);
    }
  }, [slug]);

  // 动态设置页面标题
  useEffect(() => {
    if (article?.title) {
      document.title = `${article.title} - AI 内容生成平台`;
    } else {
      document.title = 'AI 内容生成平台';
    }
  }, [article?.title]);

  const loadArticle = async (articleSlug: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/articles/public/${articleSlug}`);
      setArticle(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || '文章不存在');
    } finally {
      setLoading(false);
    }
  };

  // 高亮处理：更新匹配文本并滚动到对应元素
  // index: -1=无高亮, 0=标题, >=1=正文段落
  // matchText: 用于匹配高亮的文本片段
  const handleHighlight = useCallback((index: number, matchText?: string) => {
    setHighlightIndex(index);
    setHighlightMatchText(matchText || null);

    if (index === 0 && titleRef.current) {
      // 高亮标题
      titleRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (index > 0 && matchText) {
      // 高亮正文段落（基于 matchText 查找元素）
      const el = paragraphRefs.current.get(matchText);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Title level={4}>{error || '文章不存在'}</Title>
        <Button onClick={() => navigate('/')}>返回首页</Button>
      </div>
    );
  }

  // 安全解析 tags（处理双重 JSON 编码的情况）
  let tags: string[] = [];
  try {
    if (typeof article.tags === 'string') {
      let parsed = JSON.parse(article.tags);
      // 处理双重编码：如果解析结果仍是字符串，再解析一次
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      tags = Array.isArray(parsed) ? parsed : [];
    } else if (Array.isArray(article.tags)) {
      tags = article.tags;
    }
  } catch {
    tags = [];
  }

  return (
    <div style={{
      maxWidth: 800,
      margin: '0 auto',
      padding: '24px 16px',
      minHeight: '100vh',
      background: themeStyles.bg,
      transition: 'background 0.3s',
    }}>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => {
          // 如果没有上一页，返回首页
          if (window.history.length <= 1) {
            navigate('/');
          } else {
            navigate(-1);
          }
        }}
        style={{ marginBottom: 16, padding: 0, color: themeStyles.text }}
      >
        返回
      </Button>

      <Card style={{ background: themeStyles.cardBg, borderColor: themeStyles.border }}>
        {/* 封面图片 - 隐藏顶部封面图，避免与正文第一张图重复 */}
        {/* {article.coverImage && (
          <div style={{
            marginBottom: 20,
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
          }}>
            <img
              src={article.coverImage}
              alt={article.title}
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: 400,
                objectFit: 'cover',
                display: 'block',
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )} */}

        {/* 文章头部 */}
        <Title
          level={2}
          ref={titleRef}
          style={{
            marginBottom: 16,
            fontSize: fontStyles.title,
            color: themeStyles.text,
            backgroundColor: highlightIndex === 0 ? (theme === 'dark' ? '#4a4a00' : '#fffbe6') : 'transparent',
            borderLeft: highlightIndex === 0 ? `3px solid ${theme === 'dark' ? '#d4b106' : '#faad14'}` : 'none',
            paddingLeft: highlightIndex === 0 ? '12px' : '0',
            marginLeft: highlightIndex === 0 ? '-12px' : '0',
            transition: 'all 0.3s',
            borderRadius: highlightIndex === 0 ? '4px' : '0',
            lineHeight: 1.4,
          }}
        >
          {article.title}
        </Title>

        <Space wrap style={{ marginBottom: 16 }}>
          <Tag color="blue">{PLATFORM_NAMES[article.platform] || article.platform}</Tag>
          <Tag>{article.column}</Tag>
          {article.category && (
            <Tag color={article.category.color}>{article.category.name}</Tag>
          )}
        </Space>

        {/* 文章元信息 - 移动端优化 */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px 16px',
          color: themeStyles.secondaryText,
          fontSize: 14,
          marginBottom: 16,
        }}>
          <span>
            <CalendarOutlined style={{ marginRight: 4 }} />
            {new Date(article.publishedAt).toLocaleDateString('zh-CN')}
          </span>
          <span>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {article.readTime} 分钟
          </span>
          <span>
            <EyeOutlined style={{ marginRight: 4 }} />
            {article.viewCount} 阅读
          </span>
          <span>{article.wordCount} 字</span>
        </div>

        {/* 简介区域 - 更醒目的样式 */}
        {article.summary && (
          <div style={{
            background: theme === 'dark' ? 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)' : 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
            padding: '16px 20px',
            borderRadius: 8,
            marginBottom: 20,
            borderLeft: `4px solid ${theme === 'dark' ? '#4299e1' : '#3182ce'}`,
          }}>
            <Text style={{ 
              color: themeStyles.secondaryText, 
              fontSize: fontStyles.body,
              lineHeight: 1.8,
              display: 'block',
            }}>
              {article.summary}
            </Text>
          </div>
        )}

        {/* 操作按钮栏 - 移动端优化换行 */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 16,
        }}>
          <Button
            icon={<PictureOutlined />}
            onClick={() => setShowPosterModal(true)}
            style={{ borderRadius: 20 }}
          >
            生成海报
          </Button>
          <Button
            icon={<ShareAltOutlined />}
            onClick={() => {
              const shareUrl = `${window.location.origin}/share/${article.slug}`;
              if (navigator.share) {
                navigator.share({
                  title: article.title,
                  text: article.summary || article.title,
                  url: shareUrl,
                }).catch(() => {});
              } else {
                navigator.clipboard.writeText(shareUrl);
                message.success('分享链接已复制');
              }
            }}
            style={{ borderRadius: 20 }}
          >
            分享
          </Button>
          <Button
            icon={<CopyOutlined />}
            onClick={() => {
              navigator.clipboard.writeText(article.content);
              message.success('文章内容已复制');
            }}
            style={{ borderRadius: 20 }}
          >
            复制内容
          </Button>
        </div>

        {/* 语音朗读播放器 */}
        <ArticleReader
          articleId={article.id}
          title={article.title}
          content={article.content}
          onHighlight={handleHighlight}
          fontSize={fontSize}
          theme={theme}
          onFontSizeChange={handleFontSizeChange}
          onThemeChange={handleThemeChange}
        />

        <Divider />

        {/* 文章内容 */}
        <ParagraphRenderer
          content={article.content}
          highlightMatchText={highlightMatchText}
          paragraphRefs={paragraphRefs}
          fontSize={fontStyles.body}
          lineHeight={fontStyles.lineHeight}
          textColor={themeStyles.text}
          isDarkMode={theme === 'dark'}
          layoutTheme={article.layoutTheme}
        />

        {/* 标签 */}
        {tags.length > 0 && (
          <>
            <Divider />
            <Space wrap>
              <TagOutlined style={{ color: themeStyles.secondaryText }} />
              {tags.map((tag: string) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>
          </>
        )}
      </Card>

      {/* 海报生成弹窗 */}
      <PosterGeneratorModal
        open={showPosterModal}
        onClose={() => setShowPosterModal(false)}
        articleTitle={article.title}
        articleContent={article.content}
        articleSlug={article.slug}
      />
    </div>
  );
}
