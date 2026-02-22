import { useState, useEffect } from 'react';
import {
  Button, Modal, Tag, Space, message, Popconfirm, Spin, Typography
} from 'antd';
import {
  HistoryOutlined, RollbackOutlined,
  PlusOutlined, MinusOutlined
} from '@ant-design/icons';
import { api } from '../../api/client';
import { computeDiff, DiffResult, DiffLine as DiffLineType } from './diffUtils';

const { Text } = Typography;

interface Version {
  id: string;
  version: number;
  changeNote: string | null;
  createdAt: string;
}

interface VersionManagerProps {
  articleId: string;
  currentVersion: number;
  currentContent?: string;
  onRollback: (content: string) => void;
}

export default function VersionManager({
  articleId,
  currentVersion,
  currentContent = '',
  onRollback,
}: VersionManagerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);

  // 加载版本列表
  const loadVersions = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/articles/${articleId}/versions`);
      setVersions(res.data.versions);
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取版本列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadVersions();
      setSelectedVersion(null);
      setPreviewContent(null);
      setDiffResult(null);
    }
  }, [open, articleId]);

  // 预览版本并计算差异
  const handlePreview = async (version: Version, index: number) => {
    try {
      const res = await api.get(`/articles/${articleId}/versions/${version.id}/content`);
      const content = res.data.content;
      setPreviewContent(content);
      setSelectedVersion(version);

      // 获取下一个版本（更新的版本）的内容用于对比
      let nextContent = currentContent;
      if (index > 0) {
        // 如果不是最新的历史版本，获取下一个版本内容
        const nextVersion = versions[index - 1];
        const nextRes = await api.get(`/articles/${articleId}/versions/${nextVersion.id}/content`);
        nextContent = nextRes.data.content;
      }

      const diff = computeDiff(content, nextContent);
      setDiffResult(diff);
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取版本内容失败');
    }
  };

  // 回滚版本
  const handleRollback = async (versionId: string) => {
    try {
      const res = await api.post(`/articles/${articleId}/versions/${versionId}/rollback`);
      message.success(`已回滚到版本 v${res.data.rolledBackTo}`);
      const contentRes = await api.get(`/articles/${articleId}/content`);
      onRollback(contentRes.data.content);
      setOpen(false);
    } catch (error: any) {
      message.error(error.response?.data?.error || '版本回滚失败');
    }
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Button icon={<HistoryOutlined />} onClick={() => setOpen(true)}>
        版本管理
      </Button>

      <Modal
        title={`版本管理 (当前: v${currentVersion})`}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={1000}
        styles={{ body: { padding: '16px 24px' } }}
      >
        <div style={{ display: 'flex', gap: 16, minHeight: 500 }}>
          {/* 左侧版本列表 */}
          <VersionList
            versions={versions}
            loading={loading}
            selectedVersion={selectedVersion}
            onPreview={handlePreview}
            onRollback={handleRollback}
            formatTime={formatTime}
          />

          {/* 右侧预览区域 */}
          <DiffPreview
            selectedVersion={selectedVersion}
            diffResult={diffResult}
            previewContent={previewContent}
          />
        </div>
      </Modal>
    </>
  );
}

// 版本列表组件
interface VersionListProps {
  versions: Version[];
  loading: boolean;
  selectedVersion: Version | null;
  onPreview: (version: Version, index: number) => void;
  onRollback: (versionId: string) => void;
  formatTime: (dateStr: string) => string;
}

function VersionList({
  versions, loading, selectedVersion, onPreview, onRollback, formatTime
}: VersionListProps) {
  if (loading) {
    return (
      <div style={{ width: 200, textAlign: 'center', paddingTop: 100 }}>
        <Spin />
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div style={{ width: 200, textAlign: 'center', paddingTop: 100, color: '#999' }}>
        暂无历史版本
      </div>
    );
  }

  return (
    <div style={{ width: 200, borderRight: '1px solid #f0f0f0', paddingRight: 12 }}>
      <div style={{ marginBottom: 8, fontWeight: 500, fontSize: 13 }}>历史版本</div>
      <div style={{ maxHeight: 460, overflow: 'auto' }}>
        {versions.map((item, index) => (
          <div
            key={item.id}
            style={{
              padding: '8px 10px',
              marginBottom: 4,
              borderRadius: 4,
              cursor: 'pointer',
              background: selectedVersion?.id === item.id ? '#e6f7ff' : '#fafafa',
              border: selectedVersion?.id === item.id ? '1px solid #91d5ff' : '1px solid transparent',
            }}
            onClick={() => onPreview(item, index)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>v{item.version}</Tag>
              <Text type="secondary" style={{ fontSize: 11 }}>{formatTime(item.createdAt)}</Text>
            </div>
            {item.changeNote && (
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }} ellipsis>
                {item.changeNote}
              </Text>
            )}
            {selectedVersion?.id === item.id && (
              <Popconfirm
                title={`确定回滚到 v${item.version}？`}
                description="当前内容将被保存为新版本"
                onConfirm={(e) => { e?.stopPropagation(); onRollback(item.id); }}
                onCancel={(e) => e?.stopPropagation()}
              >
                <Button
                  type="primary"
                  size="small"
                  icon={<RollbackOutlined />}
                  style={{ marginTop: 6, width: '100%' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  回滚到此版本
                </Button>
              </Popconfirm>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// 差异预览组件
interface DiffPreviewProps {
  selectedVersion: Version | null;
  diffResult: DiffResult | null;
  previewContent: string | null;
}

function DiffPreview({ selectedVersion, diffResult, previewContent }: DiffPreviewProps) {
  if (!selectedVersion || !previewContent) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
        点击左侧版本查看差异对比
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* 头部信息 */}
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Tag color="blue">v{selectedVersion.version}</Tag>
          <Text>与下一版本的差异</Text>
        </Space>
        {diffResult && (
          <Space size={16}>
            <span style={{ color: '#52c41a', fontSize: 13 }}>
              <PlusOutlined /> 新增 {diffResult.stats.added} 行
            </span>
            <span style={{ color: '#ff4d4f', fontSize: 13 }}>
              <MinusOutlined /> 删除 {diffResult.stats.deleted} 行
            </span>
            <span style={{ color: '#999', fontSize: 13 }}>
              未变 {diffResult.stats.unchanged} 行
            </span>
          </Space>
        )}
      </div>

      {/* 差异内容 */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        background: '#1e1e1e',
        borderRadius: 6,
        padding: 0,
        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
        fontSize: 13,
        lineHeight: 1.6,
      }}>
        {diffResult?.lines.map((line, idx) => (
          <DiffLine key={idx} line={line} />
        ))}
      </div>
    </div>
  );
}

// 差异行组件
interface DiffLineProps {
  line: DiffLineType;
}

function DiffLine({ line }: DiffLineProps) {
  const styles: Record<string, React.CSSProperties> = {
    add: {
      background: 'rgba(46, 160, 67, 0.15)',
      borderLeft: '3px solid #52c41a',
    },
    delete: {
      background: 'rgba(248, 81, 73, 0.15)',
      borderLeft: '3px solid #ff4d4f',
    },
    unchanged: {
      background: 'transparent',
      borderLeft: '3px solid transparent',
    },
  };

  const prefixMap = { add: '+', delete: '-', unchanged: ' ' };
  const colorMap = { add: '#52c41a', delete: '#ff4d4f', unchanged: '#d4d4d4' };

  return (
    <div style={{
      ...styles[line.type],
      padding: '2px 12px 2px 8px',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-all',
      color: colorMap[line.type],
      minHeight: 22,
    }}>
      <span style={{
        display: 'inline-block',
        width: 16,
        color: colorMap[line.type],
        fontWeight: 500,
      }}>
        {prefixMap[line.type]}
      </span>
      {line.content || ' '}
    </div>
  );
}
