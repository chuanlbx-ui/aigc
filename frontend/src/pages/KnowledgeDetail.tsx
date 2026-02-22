import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Space, Tag, Spin, Breadcrumb, Divider, message, Modal, Timeline } from 'antd';
import {
  EditOutlined, ArrowLeftOutlined, ClockCircleOutlined,
  TagOutlined, FolderOutlined, HistoryOutlined, RollbackOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useKnowledgeStore } from '../stores/knowledge';

export default function KnowledgeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    currentDoc, currentContent, versions,
    fetchDoc, fetchDocContent, fetchVersions, rollbackVersion
  } = useKnowledgeStore();

  const [showVersions, setShowVersions] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      console.log('KnowledgeDetail: 开始加载文档', id);
      setLoading(true);
      Promise.all([
        fetchDoc(id),
        fetchDocContent(id)
      ]).then(() => {
        console.log('KnowledgeDetail: 文档加载完成');
      }).catch((error) => {
        console.error('KnowledgeDetail: 文档加载失败', error);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [id, fetchDoc, fetchDocContent]);

  const handleShowVersions = async () => {
    if (id) {
      await fetchVersions(id);
      setShowVersions(true);
    }
  };

  const handleRollback = async (version: number) => {
    if (id) {
      await rollbackVersion(id, version);
      message.success(`已回滚到版本 ${version}`);
      setShowVersions(false);
    }
  };

  const parseTags = (tagsStr: string): string[] => {
    try {
      const parsed = JSON.parse(tagsStr || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  if (loading || !currentDoc) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" tip={loading ? "加载中..." : "文档不存在"} />
      </div>
    );
  }

  const tags = parseTags(currentDoc.tags);

  return (
    <div style={{ padding: 24 }}>
      {/* 面包屑导航 */}
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <a onClick={() => navigate('/knowledge')}>知识库</a>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{currentDoc.title}</Breadcrumb.Item>
      </Breadcrumb>

      {/* 文档信息卡片 */}
      <Card
        title={currentDoc.title}
        extra={
          <Space>
            <Button icon={<HistoryOutlined />} onClick={handleShowVersions}>
              版本历史
            </Button>
            <Button icon={<EditOutlined />} onClick={() => navigate(`/knowledge/${id}/edit`)}>
              编辑
            </Button>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/knowledge')}>
              返回
            </Button>
          </Space>
        }
      >
        {/* 元信息 */}
        <Space wrap style={{ marginBottom: 16 }}>
          {currentDoc.category && (
            <Tag icon={<FolderOutlined />} color={currentDoc.category.color || 'blue'}>
              {currentDoc.category.name}
            </Tag>
          )}
          {tags.map(tag => (
            <Tag key={tag} icon={<TagOutlined />}>{tag}</Tag>
          ))}
          <Tag icon={<ClockCircleOutlined />}>
            {currentDoc.wordCount} 字 · 约 {currentDoc.readTime} 分钟
          </Tag>
          <span style={{ color: '#999', fontSize: 12 }}>
            更新于 {new Date(currentDoc.updatedAt).toLocaleString('zh-CN')}
          </span>
        </Space>

        <Divider />

        {/* Markdown 内容 */}
        <div className="markdown-body" style={{ minHeight: 300 }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {currentContent}
          </ReactMarkdown>
        </div>
      </Card>

      {/* 版本历史弹窗 */}
      <Modal
        title="版本历史"
        open={showVersions}
        onCancel={() => setShowVersions(false)}
        footer={null}
        width={500}
      >
        {versions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
            暂无历史版本
          </div>
        ) : (
          <Timeline
            items={versions.map(v => ({
              children: (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div>版本 {v.version}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>
                      {new Date(v.createdAt).toLocaleString('zh-CN')}
                    </div>
                    {v.changeNote && <div style={{ fontSize: 12 }}>{v.changeNote}</div>}
                  </div>
                  <Button
                    size="small"
                    icon={<RollbackOutlined />}
                    onClick={() => handleRollback(v.version)}
                  >
                    回滚
                  </Button>
                </div>
              ),
            }))}
          />
        )}
      </Modal>
    </div>
  );
}
