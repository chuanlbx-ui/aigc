import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, Select, Button, Card, Space, message, Modal, Switch, Tabs, InputNumber, Slider } from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined, EditOutlined } from '@ant-design/icons';
import { api } from '../api/client';

interface Section {
  id: string;
  name: string;
  type: string;
  title?: string;
  showTitle: boolean;
  layoutConfig: string;
  filterConfig: string;
  sortOrder: number;
  isEnabled: boolean;
}

interface PageData {
  id?: string;
  name: string;
  slug: string;
  title: string;
  description?: string;
  template: string;
  status: string;
  sections: Section[];
}

interface Category {
  id: string;
  name: string;
}

// 区块类型定义
const SECTION_TYPES = [
  { value: 'banner', label: 'Banner轮播', hasContent: true },
  { value: 'card_list', label: '图文卡片', hasContent: true },
  { value: 'title_list', label: '标题列表', hasContent: true },
  { value: 'video_list', label: '视频列表', hasContent: true },
  { value: 'waterfall', label: '瀑布流', hasContent: true },
  { value: 'nav_bar', label: '导航栏', hasContent: false },
  { value: 'page_links', label: '页面链接', hasContent: false },
  { value: 'custom_html', label: '自定义内容', hasContent: false },
  { value: 'divider', label: '分隔线', hasContent: false },
];

const TEMPLATES = [
  { value: 'default', label: '标准首页' },
  { value: 'magazine', label: '杂志风格' },
  { value: 'minimal', label: '极简风格' },
];

export default function TopicPageEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionModal, setSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [sectionForm] = Form.useForm();
  const [categories, setCategories] = useState<Category[]>([]);
  const [allPages, setAllPages] = useState<{ id: string; title: string; slug: string }[]>([]);
  const [selectedType, setSelectedType] = useState<string>('card_list');

  const isNew = id === 'new';

  useEffect(() => {
    loadCategories();
    loadAllPages();
    if (!isNew && id) {
      loadPage(id);
    }
  }, [id, isNew]);

  const loadCategories = async () => {
    try {
      const res = await api.get('/portal/categories');
      setCategories(res.data || []);
    } catch (error) {
      console.error('加载分类失败', error);
    }
  };

  const loadAllPages = async () => {
    try {
      const res = await api.get('/topic-pages');
      setAllPages(res.data.pages || []);
    } catch (error) {
      console.error('加载页面列表失败', error);
    }
  };

  const loadPage = async (pageId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/topic-pages/${pageId}`);
      const data = res.data;
      form.setFieldsValue({
        name: data.name,
        slug: data.slug,
        title: data.title,
        description: data.description,
        template: data.template,
      });
      setSections(data.sections || []);
    } catch (error) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (publish = false) => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        ...values,
        status: publish ? 'published' : 'draft',
      };

      if (isNew) {
        const res = await api.post('/topic-pages', payload);
        message.success('创建成功');
        navigate(`/topic-pages/${res.data.id}/edit`);
      } else {
        await api.put(`/topic-pages/${id}`, payload);
        message.success(publish ? '发布成功' : '保存成功');
      }
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSection = () => {
    setEditingSection(null);
    sectionForm.resetFields();
    setSelectedType('card_list');
    setSectionModal(true);
  };

  const handleEditSection = (section: Section) => {
    setEditingSection(section);
    setSelectedType(section.type);

    // 解析 filterConfig 和 layoutConfig
    let filterConfig: any = {};
    let layoutConfig: any = {};
    try {
      filterConfig = JSON.parse(section.filterConfig || '{}');
    } catch {}
    try {
      layoutConfig = JSON.parse(section.layoutConfig || '{}');
    } catch {}

    sectionForm.setFieldsValue({
      name: section.name,
      type: section.type,
      title: section.title,
      showTitle: section.showTitle,
      // filterConfig 字段
      categoryIds: filterConfig.categoryIds || [],
      tags: filterConfig.tags || [],
      sortBy: filterConfig.sortBy || 'publishedAt',
      limit: filterConfig.limit || 10,
      excludePrevious: filterConfig.excludePrevious || false,
      // layoutConfig 字段
      ...layoutConfig,
      // 导航栏特殊处理：items -> navItems
      navItems: layoutConfig.items || [],
      navStyle: layoutConfig.style,
    });
    setSectionModal(true);
  };

  const handleSaveSection = async () => {
    try {
      const values = await sectionForm.validateFields();
      const sectionType = SECTION_TYPES.find(t => t.value === values.type);

      // 构建 filterConfig
      const filterConfig: any = {};
      if (sectionType?.hasContent) {
        if (values.categoryIds?.length) filterConfig.categoryIds = values.categoryIds;
        if (values.tags?.length) filterConfig.tags = values.tags;
        filterConfig.sortBy = values.sortBy || 'publishedAt';
        filterConfig.limit = values.limit || 10;
        filterConfig.excludePrevious = values.excludePrevious || false;
      }

      // 构建 layoutConfig
      const layoutConfig: any = {};
      if (values.type === 'banner') {
        layoutConfig.autoPlay = values.autoPlay ?? true;
        layoutConfig.interval = values.interval || 5000;
      } else if (values.type === 'card_list') {
        layoutConfig.columns = values.columns || 2;
        layoutConfig.cardStyle = values.cardStyle || 'default';
        layoutConfig.showCover = values.showCover ?? true;
        layoutConfig.showSummary = values.showSummary ?? true;
        layoutConfig.showMeta = values.showMeta ?? true;
      } else if (values.type === 'waterfall') {
        layoutConfig.columns = values.columns || 2;
        layoutConfig.showCover = values.showCover ?? true;
        layoutConfig.showSummary = values.showSummary ?? true;
      } else if (values.type === 'title_list') {
        layoutConfig.showIndex = values.showIndex ?? true;
        layoutConfig.showDate = values.showDate ?? true;
        layoutConfig.showCategory = values.showCategory ?? true;
      } else if (values.type === 'video_list') {
        layoutConfig.columns = values.columns || 2;
        layoutConfig.aspectRatio = values.aspectRatio || '16:9';
        layoutConfig.showDuration = values.showDuration ?? true;
      } else if (values.type === 'nav_bar') {
        layoutConfig.style = values.navStyle || 'both';
        layoutConfig.items = values.navItems || [];
      } else if (values.type === 'page_links') {
        layoutConfig.pageIds = values.pageIds || [];
        layoutConfig.style = values.linkStyle || 'card';
      } else if (values.type === 'custom_html') {
        layoutConfig.htmlContent = values.htmlContent || '';
        layoutConfig.cssStyle = values.cssStyle || '';
      } else if (values.type === 'divider') {
        layoutConfig.height = values.dividerHeight || 1;
        layoutConfig.margin = values.dividerMargin || 16;
      }

      const payload = {
        name: values.name,
        type: values.type,
        title: values.title,
        showTitle: values.showTitle,
        filterConfig,
        layoutConfig,
      };

      if (editingSection) {
        await api.put(`/topic-pages/${id}/sections/${editingSection.id}`, payload);
        message.success('更新成功');
      } else {
        await api.post(`/topic-pages/${id}/sections`, payload);
        message.success('添加成功');
      }
      setSectionModal(false);
      loadPage(id!);
    } catch (error) {
      message.error('保存失败');
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个区块吗？',
      onOk: async () => {
        try {
          await api.delete(`/topic-pages/${id}/sections/${sectionId}`);
          message.success('删除成功');
          loadPage(id!);
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleMoveSection = async (sectionId: string, direction: 'up' | 'down') => {
    const index = sections.findIndex(s => s.id === sectionId);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === sections.length - 1)) {
      return;
    }
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newSections = [...sections];
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];

    try {
      await api.put(`/topic-pages/${id}/sections/reorder`, {
        sectionIds: newSections.map(s => s.id),
      });
      setSections(newSections);
    } catch (error) {
      message.error('排序失败');
    }
  };

  // 根据区块类型渲染布局配置
  const renderLayoutConfig = () => {
    switch (selectedType) {
      case 'banner':
        return (
          <>
            <Form.Item name="autoPlay" label="自动播放" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            <Form.Item name="interval" label="轮播间隔(毫秒)" initialValue={5000}>
              <InputNumber min={1000} max={10000} step={500} />
            </Form.Item>
          </>
        );
      case 'card_list':
        return (
          <>
            <Form.Item name="columns" label="列数" initialValue={2}>
              <Select options={[
                { value: 1, label: '1列' },
                { value: 2, label: '2列' },
                { value: 3, label: '3列' },
              ]} />
            </Form.Item>
            <Form.Item name="cardStyle" label="卡片样式" initialValue="default">
              <Select options={[
                { value: 'default', label: '默认' },
                { value: 'compact', label: '紧凑' },
                { value: 'large', label: '大图' },
                { value: 'horizontal', label: '横向' },
              ]} />
            </Form.Item>
            <Form.Item name="showCover" label="显示封面" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            <Form.Item name="showSummary" label="显示摘要" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            <Form.Item name="showMeta" label="显示元信息" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
          </>
        );
      case 'waterfall':
        return (
          <>
            <Form.Item name="columns" label="列数" initialValue={2}>
              <Select options={[
                { value: 2, label: '2列' },
                { value: 3, label: '3列' },
              ]} />
            </Form.Item>
            <Form.Item name="showCover" label="显示封面" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            <Form.Item name="showSummary" label="显示摘要" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
          </>
        );
      case 'title_list':
        return (
          <>
            <Form.Item name="showIndex" label="显示序号" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            <Form.Item name="showDate" label="显示日期" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            <Form.Item name="showCategory" label="显示分类" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
          </>
        );
      case 'video_list':
        return (
          <>
            <Form.Item name="columns" label="列数" initialValue={2}>
              <Select options={[
                { value: 1, label: '1列' },
                { value: 2, label: '2列' },
              ]} />
            </Form.Item>
            <Form.Item name="aspectRatio" label="视频比例" initialValue="16:9">
              <Select options={[
                { value: '16:9', label: '16:9 横屏' },
                { value: '4:3', label: '4:3 标准' },
                { value: '1:1', label: '1:1 方形' },
              ]} />
            </Form.Item>
            <Form.Item name="showDuration" label="显示时长" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
          </>
        );
      case 'nav_bar':
        return (
          <>
            <Form.Item name="navStyle" label="导航样式" initialValue="both">
              <Select options={[
                { value: 'icon', label: '仅图标' },
                { value: 'text', label: '仅文字' },
                { value: 'both', label: '图标+文字' },
              ]} />
            </Form.Item>
            <Form.Item label="导航项">
              <Form.List name="navItems">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <Form.Item {...restField} name={[name, 'icon']} style={{ marginBottom: 0 }}>
                          <Input placeholder="图标(emoji)" style={{ width: 80 }} />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'label']} style={{ marginBottom: 0 }}>
                          <Input placeholder="标签名称" style={{ width: 100 }} />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'link']} style={{ marginBottom: 0 }}>
                          <Input placeholder="链接地址" style={{ width: 150 }} />
                        </Form.Item>
                        <DeleteOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                      </Space>
                    ))}
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      添加导航项
                    </Button>
                  </>
                )}
              </Form.List>
            </Form.Item>
            <Form.Item name="pageIds" label="或选择页面" tooltip="如果上面没有添加导航项，可以直接选择页面作为导航">
              <Select
                mode="multiple"
                placeholder="选择要链接的页面"
                options={allPages.map(p => ({ value: p.id, label: p.title }))}
                allowClear
              />
            </Form.Item>
          </>
        );
      case 'page_links':
        return (
          <>
            <Form.Item name="pageIds" label="选择页面">
              <Select
                mode="multiple"
                placeholder="选择要展示的页面"
                options={allPages.map(p => ({ value: p.id, label: p.title }))}
              />
            </Form.Item>
            <Form.Item name="linkStyle" label="展示样式" initialValue="card">
              <Select options={[
                { value: 'card', label: '卡片' },
                { value: 'list', label: '列表' },
              ]} />
            </Form.Item>
          </>
        );
      case 'custom_html':
        return (
          <>
            <Form.Item name="htmlContent" label="HTML内容" tooltip="支持标准HTML标签">
              <Input.TextArea rows={6} placeholder="<div class='my-content'>自定义内容</div>" />
            </Form.Item>
            <Form.Item name="cssStyle" label="CSS样式" tooltip="为自定义内容添加样式">
              <Input.TextArea rows={4} placeholder=".my-content { color: #333; padding: 16px; }" />
            </Form.Item>
          </>
        );
      case 'divider':
        return (
          <>
            <Form.Item name="dividerHeight" label="线条高度" initialValue={1}>
              <InputNumber min={1} max={10} />
            </Form.Item>
            <Form.Item name="dividerMargin" label="上下间距" initialValue={16}>
              <InputNumber min={0} max={100} />
            </Form.Item>
          </>
        );
      default:
        return <div style={{ color: '#999' }}>该区块类型无需额外配置</div>;
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>{isNew ? '新建专题页面' : '编辑专题页面'}</h2>
        <Space>
          <Button onClick={() => navigate('/topic-pages')}>返回</Button>
          <Button onClick={() => handleSave(false)} loading={saving}>保存草稿</Button>
          <Button type="primary" onClick={() => handleSave(true)} loading={saving}>发布</Button>
        </Space>
      </div>

      <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="管理名称" rules={[{ required: true }]}>
            <Input placeholder="用于后台识别" />
          </Form.Item>
          <Form.Item name="slug" label="URL标识" rules={[{ required: true }]}>
            <Input placeholder="用于访问地址，如 home" />
          </Form.Item>
          <Form.Item name="title" label="页面标题" rules={[{ required: true }]}>
            <Input placeholder="显示给用户的标题" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="template" label="页面模板" initialValue="default">
            <Select options={TEMPLATES} />
          </Form.Item>
        </Form>
      </Card>

      {!isNew && (
        <Card
          title="页面区块"
          extra={<Button icon={<PlusOutlined />} onClick={handleAddSection}>添加区块</Button>}
        >
          {sections.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
              暂无区块，点击上方按钮添加
            </div>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              {sections.map((section, index) => (
                <Card
                  key={section.id}
                  size="small"
                  title={`${section.name} (${SECTION_TYPES.find(t => t.value === section.type)?.label})`}
                  extra={
                    <Space>
                      <Button size="small" icon={<ArrowUpOutlined />} disabled={index === 0}
                        onClick={() => handleMoveSection(section.id, 'up')} />
                      <Button size="small" icon={<ArrowDownOutlined />} disabled={index === sections.length - 1}
                        onClick={() => handleMoveSection(section.id, 'down')} />
                      <Button size="small" onClick={() => handleEditSection(section)}>编辑</Button>
                      <Button size="small" danger icon={<DeleteOutlined />}
                        onClick={() => handleDeleteSection(section.id)} />
                    </Space>
                  }
                >
                  <div>标题: {section.title || '(无)'}</div>
                  <div>显示标题: {section.showTitle ? '是' : '否'}</div>
                </Card>
              ))}
            </Space>
          )}
        </Card>
      )}

      <Modal
        title={editingSection ? '编辑区块' : '添加区块'}
        open={sectionModal}
        onOk={handleSaveSection}
        onCancel={() => setSectionModal(false)}
        width={600}
      >
        <Form form={sectionForm} layout="vertical">
          <Tabs defaultActiveKey="basic" items={[
            {
              key: 'basic',
              label: '基本信息',
              children: (
                <>
                  <Form.Item name="name" label="区块名称" rules={[{ required: true }]}>
                    <Input placeholder="如：热门文章" />
                  </Form.Item>
                  <Form.Item name="type" label="区块类型" rules={[{ required: true }]}>
                    <Select
                      options={SECTION_TYPES.map(t => ({ value: t.value, label: t.label }))}
                      onChange={(v) => setSelectedType(v)}
                    />
                  </Form.Item>
                  <Form.Item name="title" label="显示标题">
                    <Input placeholder="显示在区块上方的标题" />
                  </Form.Item>
                  <Form.Item name="showTitle" label="显示标题" valuePropName="checked" initialValue={true}>
                    <Switch />
                  </Form.Item>
                </>
              ),
            },
            {
              key: 'content',
              label: '内容来源',
              disabled: !SECTION_TYPES.find(t => t.value === selectedType)?.hasContent,
              children: (
                <>
                  <Form.Item name="categoryIds" label="分类筛选">
                    <Select
                      mode="multiple"
                      placeholder="选择分类（可多选）"
                      options={categories.map(c => ({ value: c.id, label: c.name }))}
                      allowClear
                    />
                  </Form.Item>
                  <Form.Item name="sortBy" label="排序方式" initialValue="publishedAt">
                    <Select options={[
                      { value: 'publishedAt', label: '发布时间' },
                      { value: 'viewCount', label: '浏览量' },
                      { value: 'createdAt', label: '创建时间' },
                    ]} />
                  </Form.Item>
                  <Form.Item name="limit" label="显示数量" initialValue={10}>
                    <Slider min={1} max={50} marks={{ 1: '1', 10: '10', 20: '20', 50: '50' }} />
                  </Form.Item>
                  <Form.Item name="excludePrevious" label="排除前面区块内容" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </>
              ),
            },
            {
              key: 'layout',
              label: '布局配置',
              children: renderLayoutConfig(),
            },
          ]} />
        </Form>
      </Modal>
    </div>
  );
}
