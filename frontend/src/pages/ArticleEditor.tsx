import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Input, Select, Button, Space, Tag, message,
  Spin, Drawer, Form, Popconfirm
} from 'antd';
import {
  SaveOutlined, SendOutlined, ArrowLeftOutlined,
  SettingOutlined, EyeOutlined, RobotOutlined,
  DownloadOutlined, DatabaseOutlined, CopyOutlined,
  FileImageOutlined, VideoCameraOutlined
} from '@ant-design/icons';
import MDEditor from '@uiw/react-md-editor';
import {
  useArticleStore, PLATFORM_COLUMNS, PLATFORM_NAMES
} from '../stores/article';
import { useTopicSuggestionStore } from '../stores/topicSuggestion';
import { useAutoSave } from '../hooks/useAutoSave';
import { api } from '../api/client';
import WorkflowPanel from '../components/Article/WorkflowPanel';
import LayoutThemeSelector, { getLayoutThemeClassName } from '../components/Article/LayoutThemeSelector';
import VersionManager from '../components/Article/VersionManager';

export default function ArticleEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentArticle, currentContent, categories,
    fetchArticle, fetchArticleContent, fetchCategories,
    updateArticle, updateArticleContent, publishArticle
  } = useArticleStore();
  const { acceptedTopicData, clearAcceptedTopicData } = useTopicSuggestionStore();

  const [content, setContent] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('default');
  const [settingsForm] = Form.useForm();
  const selectedPlatform = Form.useWatch('platform', settingsForm);

  // 注入主题样式
  // 样式由 LayoutThemeSelector 组件自动注入

  // 加载文章数据
  useEffect(() => {
    if (id) {
      fetchArticle(id);
      fetchArticleContent(id);
      fetchCategories();
    }
  }, [id, fetchArticle, fetchArticleContent, fetchCategories]);

  // 同步内容
  useEffect(() => {
    setContent(currentContent);
  }, [currentContent]);

  // 同步设置表单和排版主题
  useEffect(() => {
    if (currentArticle) {
      settingsForm.setFieldsValue({
        title: currentArticle.title,
        platform: currentArticle.platform,
        column: currentArticle.column,
        categoryId: currentArticle.categoryId,
        tags: JSON.parse(currentArticle.tags || '[]'),
        summary: currentArticle.summary,
      });
      // 从文章数据加载排版主题
      if (currentArticle.layoutTheme) {
        setCurrentTheme(currentArticle.layoutTheme);
      }
    }
  }, [currentArticle]);

  // 检测是否从选题页面跳转,自动触发选题讨论
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const fromTopic = searchParams.get('fromTopic');

    if (fromTopic === 'true' && currentArticle && acceptedTopicData) {
      // 自动打开AI助手面板
      setShowAIPanel(true);

      // 延迟触发,等待面板渲染完成
      setTimeout(() => {
        message.info('正在自动分析选题...');
      }, 500);

      // 清除全局状态
      clearAcceptedTopicData();
    }
  }, [currentArticle, location.search, acceptedTopicData, clearAcceptedTopicData]);

  // 保存内容（供自动保存使用）
  const doSave = useCallback(async () => {
    if (!id) return;
    await updateArticleContent(id, content);
    message.success('自动保存成功');
  }, [id, content, updateArticleContent]);

  // 带变更说明的保存（供 AI 操作使用，立即创建版本）
  const doSaveWithNote = useCallback(async (newContent: string, changeNote: string) => {
    if (!id) return;
    await updateArticleContent(id, newContent, changeNote);
  }, [id, updateArticleContent]);

  // 自动保存 Hook（60秒倒计时）
  const { saving, save: handleSave, getSaveButtonText } = useAutoSave({
    interval: 60,
    onSave: doSave,
    enabled: !!id && !!currentArticle, // 有文章数据时才启用
  });

  // 保存设置
  const handleSaveSettings = async () => {
    if (!id) return;
    const values = await settingsForm.validateFields();
    await updateArticle(id, {
      ...values,
      tags: JSON.stringify(values.tags || []),
      layoutTheme: currentTheme,  // 保存排版主题
    });
    message.success('设置已保存');
    setShowSettings(false);
  };

  // 排版主题变化时自动保存
  const handleThemeChange = async (themeId: string) => {
    setCurrentTheme(themeId);
    if (id) {
      try {
        await updateArticle(id, { layoutTheme: themeId });
      } catch (error) {
        console.error('保存排版主题失败:', error);
      }
    }
  };

  // 发布
  const handlePublish = async () => {
    if (!id) return;
    await handleSave();
    await publishArticle(id);
    message.success('发布成功');
  };

  // 导出 MD 文件
  const handleExport = () => {
    if (!currentArticle || !content) return;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentArticle.title}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success('文章已导出');
  };

  // 一键复制排版内容
  const handleCopyFormatted = async () => {
    if (!content) return;

    // 获取当前域名作为图片基础URL
    const baseUrl = window.location.origin;

    // 获取预览区域的 HTML 内容
    const previewEl = document.querySelector('.wmde-markdown');
    if (!previewEl) {
      message.error('请先切换到预览模式');
      return;
    }

    // 克隆预览内容
    const clone = previewEl.cloneNode(true) as HTMLElement;

    // 移除标题中的锚点链接（链接符号）
    clone.querySelectorAll('a.anchor').forEach(a => a.remove());
    clone.querySelectorAll('h1 a, h2 a, h3 a, h4 a, h5 a, h6 a').forEach(a => {
      const href = a.getAttribute('href');
      if (href && href.startsWith('#')) {
        a.remove();
      }
    });

    // 处理图片地址
    clone.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src');
      if (src && src.startsWith('/api/')) {
        img.setAttribute('src', `${baseUrl}${src}`);
      }
      img.style.maxWidth = '100%';
    });

    // 获取主题内联样式
    const inlineStyles = getInlineStyles(currentTheme);

    // 为每个元素应用内联样式
    applyInlineStyles(clone, inlineStyles);

    try {
      const blob = new Blob([clone.innerHTML], { type: 'text/html' });
      const clipboardItem = new ClipboardItem({
        'text/html': blob,
      });
      await navigator.clipboard.write([clipboardItem]);
      message.success('已复制排版内容，可直接粘贴到公众号');
    } catch (err) {
      // 降级：使用 execCommand
      const textarea = document.createElement('div');
      textarea.innerHTML = clone.innerHTML;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      const range = document.createRange();
      range.selectNodeContents(textarea);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.execCommand('copy');
      document.body.removeChild(textarea);
      message.success('已复制排版内容');
    }
  };

  // 获取主题的内联样式映射
  const getInlineStyles = (themeId: string): Record<string, string> => {
    const themes: Record<string, Record<string, string>> = {
      'default': {
        'section': 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 15px; line-height: 1.8; color: #333;',
        'h1': 'font-size: 24px; font-weight: bold; margin: 24px 0 16px; border-bottom: 1px solid #eee; padding-bottom: 8px;',
        'h2': 'font-size: 20px; font-weight: bold; margin: 20px 0 12px;',
        'h3': 'font-size: 17px; font-weight: bold; margin: 16px 0 8px;',
        'p': 'margin: 12px 0; line-height: 1.8;',
        'blockquote': 'border-left: 4px solid #ddd; padding-left: 16px; color: #666; margin: 16px 0;',
        'code': 'background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 14px;',
        'pre': 'background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto;',
        'a': 'color: #1890ff; text-decoration: none;',
        'ul': 'padding-left: 24px; margin: 12px 0;',
        'ol': 'padding-left: 24px; margin: 12px 0;',
        'li': 'margin: 6px 0;',
        'strong': 'font-weight: bold;',
      },
      'wechat-elegant': {
        'section': 'font-family: "PingFang SC", "Microsoft YaHei", sans-serif; font-size: 16px; line-height: 2; color: #3f3f3f; letter-spacing: 0.5px;',
        'h1': 'font-size: 22px; font-weight: bold; text-align: center; margin: 32px 0 24px; color: #1a1a1a;',
        'h2': 'font-size: 18px; font-weight: bold; margin: 28px 0 16px; padding-left: 12px; border-left: 4px solid #07c160; color: #1a1a1a;',
        'h3': 'font-size: 16px; font-weight: bold; margin: 20px 0 12px; color: #07c160;',
        'p': 'margin: 16px 0; text-align: justify; line-height: 2;',
        'blockquote': 'background: #f7f7f7; border-left: 4px solid #07c160; padding: 12px 16px; margin: 20px 0; color: #666;',
        'code': 'background: #fff5f5; color: #ff502c; padding: 2px 6px; border-radius: 3px; font-size: 14px;',
        'pre': 'background: #282c34; color: #abb2bf; padding: 16px; border-radius: 8px; overflow-x: auto;',
        'a': 'color: #07c160; text-decoration: none; border-bottom: 1px solid #07c160;',
        'ul': 'padding-left: 24px; margin: 16px 0;',
        'ol': 'padding-left: 24px; margin: 16px 0;',
        'li': 'margin: 8px 0;',
        'strong': 'color: #07c160; font-weight: bold;',
      },
      'xiaohongshu': {
        'section': 'font-family: "PingFang SC", "Microsoft YaHei", sans-serif; font-size: 15px; line-height: 2; color: #333;',
        'h1': 'font-size: 20px; font-weight: bold; text-align: center; margin: 24px 0 16px; color: #ff2442;',
        'h2': 'font-size: 17px; font-weight: bold; margin: 20px 0 12px; color: #ff2442; display: inline-block; background: linear-gradient(to bottom, transparent 60%, #ffe4e8 60%);',
        'h3': 'font-size: 15px; font-weight: bold; margin: 16px 0 8px; color: #ff6b81;',
        'p': 'margin: 12px 0; line-height: 2;',
        'blockquote': 'background: #fff5f6; border-left: 4px solid #ff2442; padding: 12px 16px; margin: 16px 0; color: #666; border-radius: 0 8px 8px 0;',
        'code': 'background: #ffe4e8; color: #ff2442; padding: 2px 6px; border-radius: 4px; font-size: 14px;',
        'pre': 'background: #fff5f6; padding: 16px; border-radius: 12px; overflow-x: auto;',
        'a': 'color: #ff2442; text-decoration: none;',
        'ul': 'padding-left: 20px; margin: 12px 0;',
        'ol': 'padding-left: 20px; margin: 12px 0;',
        'li': 'margin: 8px 0;',
        'strong': 'color: #ff2442; font-weight: bold;',
      },
    };
    return themes[themeId] || themes['default'];
  };

  // 应用内联样式到元素
  const applyInlineStyles = (el: HTMLElement, styles: Record<string, string>) => {
    // 应用容器样式
    if (styles['section']) {
      el.setAttribute('style', styles['section']);
    }

    // 遍历所有子元素应用样式
    const tagMap: Record<string, string> = {
      'H1': 'h1', 'H2': 'h2', 'H3': 'h3', 'H4': 'h3',
      'P': 'p', 'BLOCKQUOTE': 'blockquote',
      'CODE': 'code', 'PRE': 'pre',
      'A': 'a', 'UL': 'ul', 'OL': 'ol', 'LI': 'li',
      'STRONG': 'strong', 'B': 'strong',
    };

    el.querySelectorAll('*').forEach(child => {
      const tag = child.tagName;
      const styleKey = tagMap[tag];
      if (styleKey && styles[styleKey]) {
        (child as HTMLElement).setAttribute('style', styles[styleKey]);
      }
    });
  };

  // 存入知识库
  const handleSaveToKnowledge = async () => {
    if (!currentArticle || !content) return;
    try {
      await api.post('/knowledge/docs', {
        title: currentArticle.title,
        content,
        summary: currentArticle.summary || content.substring(0, 200),
        source: 'article',
        tags: JSON.parse(currentArticle.tags || '[]'),
      });
      message.success('已存入知识库');
    } catch (error: any) {
      message.error(error.response?.data?.error || '存入知识库失败');
    }
  };

  // 状态标签
  const getStatusTag = () => {
    if (!currentArticle) return null;
    const map: Record<string, { color: string; text: string }> = {
      draft: { color: 'default', text: '草稿' },
      published: { color: 'green', text: '已发布' },
      archived: { color: 'orange', text: '已归档' },
    };
    const item = map[currentArticle.status] || { color: 'default', text: currentArticle.status };
    return <Tag color={item.color}>{item.text}</Tag>;
  };

  if (!currentArticle) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部工具栏 */}
      <div style={{
        padding: '12px 24px',
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/articles')}>
            返回
          </Button>
          <span style={{ fontSize: 16, fontWeight: 500 }}>{currentArticle.title}</span>
          {getStatusTag()}
          <Tag color="blue">{PLATFORM_NAMES[currentArticle.platform]}</Tag>
          <Tag>{currentArticle.column}</Tag>
        </Space>
        <Space>
          <span style={{ color: '#666', fontSize: 12 }}>
            {currentArticle.wordCount} 字 · 约 {currentArticle.readTime} 分钟
          </span>
          <Button icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
            {getSaveButtonText()}
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出
          </Button>
          <Button icon={<DatabaseOutlined />} onClick={handleSaveToKnowledge}>
            存入知识库
          </Button>
          <Button
            icon={<FileImageOutlined />}
            onClick={() => navigate(`/posters/new?articleId=${id}`)}
          >
            生成海报
          </Button>
          <Button
            icon={<VideoCameraOutlined />}
            onClick={() => navigate(`/editor/new?articleId=${id}`)}
          >
            生成视频
          </Button>
          {currentArticle.status !== 'published' && (
            <Popconfirm title="确定发布文章？" onConfirm={handlePublish}>
              <Button type="primary" icon={<SendOutlined />}>发布</Button>
            </Popconfirm>
          )}
          {currentArticle.status === 'published' && (
            <Button
              icon={<EyeOutlined />}
              onClick={() => window.open(`/read/${currentArticle.slug}`, '_blank')}
            >
              预览
            </Button>
          )}
        </Space>
      </div>

      {/* 排版主题选择栏 */}
      <div style={{
        padding: '8px 24px',
        background: '#fafafa',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Space>
          <LayoutThemeSelector value={currentTheme} onChange={handleThemeChange} />
          <Button icon={<CopyOutlined />} onClick={handleCopyFormatted}>
            一键复制
          </Button>
        </Space>
        <Space>
          <VersionManager
            articleId={id!}
            currentVersion={currentArticle.version}
            currentContent={content}
            onRollback={setContent}
          />
          <Button
            icon={<RobotOutlined />}
            type={showAIPanel ? 'primary' : 'default'}
            onClick={() => setShowAIPanel(!showAIPanel)}
          >
            AI 助手
          </Button>
          <Button icon={<SettingOutlined />} onClick={() => setShowSettings(true)}>
            设置
          </Button>
        </Space>
      </div>

      {/* 编辑器区域 */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {/* 主编辑器 */}
        <div style={{ flex: 1, overflow: 'hidden' }} data-color-mode="light">
          <MDEditor
            value={content}
            onChange={(val) => setContent(val || '')}
            height="100%"
            preview="live"
            previewOptions={{
              className: getLayoutThemeClassName(currentTheme),
            }}
          />
        </div>

        {/* AI 助手面板 */}
        {showAIPanel && (
          <div style={{ width: 380, borderLeft: '1px solid #f0f0f0', overflow: 'auto', background: '#fafafa' }}>
            <WorkflowPanel
              article={currentArticle}
              content={content}
              onContentChange={setContent}
              onSave={handleSave}
              onSaveWithNote={doSaveWithNote}
            />
          </div>
        )}
      </div>

      {/* 设置抽屉 */}
      <Drawer
        title="文章设置"
        open={showSettings}
        onClose={() => setShowSettings(false)}
        width={400}
        extra={
          <Button type="primary" onClick={handleSaveSettings}>
            保存设置
          </Button>
        }
      >
        <Form form={settingsForm} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="platform" label="平台" rules={[{ required: true }]}>
            <Select>
              {Object.entries(PLATFORM_NAMES).map(([k, v]) => (
                <Select.Option key={k} value={k}>{v}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="column" label="栏目" rules={[{ required: true }]}>
            <Select>
              {selectedPlatform && PLATFORM_COLUMNS[selectedPlatform]?.map(col => (
                <Select.Option key={col} value={col}>{col}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="categoryId" label="分类">
            <Select allowClear placeholder="选择分类">
              {categories.map(c => (
                <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="输入标签" />
          </Form.Item>
          <Form.Item name="summary" label="摘要">
            <Input.TextArea rows={3} placeholder="文章摘要" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
