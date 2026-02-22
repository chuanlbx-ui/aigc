import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Space, Input, Select, Form, message, Breadcrumb, Row, Col } from 'antd';
import { SaveOutlined, ArrowLeftOutlined, EyeOutlined } from '@ant-design/icons';
import MDEditor from '@uiw/react-md-editor';
import { useKnowledgeStore } from '../stores/knowledge';

export default function KnowledgeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const {
    currentDoc, currentContent, categories,
    fetchDoc, fetchDocContent, fetchCategories,
    createDoc, updateDoc, updateDocContent
  } = useKnowledgeStore();

  const [form] = Form.useForm();
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    fetchCategories();
    if (!isNew && id) {
      fetchDoc(id);
      fetchDocContent(id);
    }
  }, [id]);

  useEffect(() => {
    if (!isNew && currentDoc) {
      form.setFieldsValue({
        title: currentDoc.title,
        summary: currentDoc.summary,
        categoryId: currentDoc.categoryId,
      });
      try {
        const parsedTags = JSON.parse(currentDoc.tags || '[]');
        setTags(Array.isArray(parsedTags) ? parsedTags : []);
      } catch {
        setTags([]);
      }
    }
    if (!isNew && currentContent) {
      setContent(currentContent);
    }
  }, [currentDoc, currentContent, isNew]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      if (isNew) {
        const doc = await createDoc({
          title: values.title,
          content,
          summary: values.summary,
          categoryId: values.categoryId,
          tags,
        });
        message.success('文档创建成功');
        navigate(`/knowledge/${doc.id}`);
      } else if (id) {
        await updateDoc(id, {
          title: values.title,
          summary: values.summary,
          categoryId: values.categoryId,
          tags,
        } as any);
        await updateDocContent(id, content);
        message.success('文档保存成功');
      }
    } catch (err) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <a onClick={() => navigate('/knowledge')}>知识库</a>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{isNew ? '新建文档' : '编辑文档'}</Breadcrumb.Item>
      </Breadcrumb>

      <Card
        title={isNew ? '新建文档' : '编辑文档'}
        extra={
          <Space>
            {!isNew && (
              <Button icon={<EyeOutlined />} onClick={() => navigate(`/knowledge/${id}`)}>
                预览
              </Button>
            )}
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
              保存
            </Button>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/knowledge')}>
              返回
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
                <Input placeholder="请输入文档标题" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="categoryId" label="分类">
                <Select
                  placeholder="选择分类"
                  allowClear
                  options={categories.map(c => ({ label: c.name, value: c.id }))}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="标签">
                <Select
                  mode="tags"
                  placeholder="输入标签，按回车添加"
                  value={tags}
                  onChange={setTags}
                  style={{ width: '100%' }}
                  tokenSeparators={[',']}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="summary" label="摘要">
            <Input.TextArea rows={2} placeholder="文档摘要（可选）" />
          </Form.Item>
        </Form>

        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>内容</div>
          <MDEditor
            value={content}
            onChange={(val) => setContent(val || '')}
            height={500}
            preview="live"
          />
        </div>
      </Card>
    </div>
  );
}
