import { useState } from 'react';
import { Card, Button, Input, Space, message, Alert, Typography, Select, Segmented } from 'antd';
import {
  SoundOutlined, SyncOutlined, EditOutlined,
  CheckCircleOutlined, LinkOutlined
} from '@ant-design/icons';
import { api } from '../../api/client';
import AIModelSelector from '../common/AIModelSelector';

const { TextArea } = Input;
const { Text } = Typography;

// 长度选项
const LENGTH_OPTIONS = [
  { value: 'short', label: '短篇', desc: '200-400字 / 30秒-1分钟' },
  { value: 'medium', label: '中篇', desc: '400-800字 / 1-2分钟' },
  { value: 'long', label: '长篇', desc: '800-1500字 / 3-5分钟' },
];

// 风格选项
const STYLE_OPTIONS = [
  { value: 'professional', label: '专业严谨' },
  { value: 'casual', label: '轻松随意' },
  { value: 'storytelling', label: '故事叙述' },
  { value: 'tutorial', label: '教程讲解' },
];

// 语气选项
const TONE_OPTIONS = [
  { value: 'enthusiastic', label: '热情激昂' },
  { value: 'calm', label: '沉稳平和' },
  { value: 'humorous', label: '幽默风趣' },
  { value: 'sincere', label: '真诚走心' },
];

interface ScriptPanelProps {
  articleId: string;
  title: string;
  content: string;
  platform: string;
}

export default function ScriptPanel({
  articleId,
  title,
  content,
  platform,
}: ScriptPanelProps) {
  const [script, setScript] = useState('');
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncedProject, setSyncedProject] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // 新增：长度、风格、语气状态
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [style, setStyle] = useState<string>('casual');
  const [tone, setTone] = useState<string>('enthusiastic');
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>();

  // 生成口播文案
  const handleGenerate = async () => {
    if (!content.trim()) {
      message.warning('请先编写文章内容');
      return;
    }

    setGenerating(true);
    try {
      const res = await api.post('/articles/ai/generate-script', {
        content,
        platform,
        title,
        length,
        style,
        tone,
        serviceId: selectedServiceId,
      });
      setScript(res.data.script);
      setSyncedProject(null);
      message.success('口播文案生成成功');
    } catch (error: any) {
      message.error(error.response?.data?.error || '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  // 同步到项目
  const handleSync = async () => {
    if (!script.trim()) {
      message.warning('请先生成或编辑口播文案');
      return;
    }

    setSyncing(true);
    try {
      const res = await api.post('/articles/ai/sync-to-project', {
        articleId,
        title,
        script,
      });
      setSyncedProject({
        id: res.data.projectId,
        name: res.data.projectName,
      });
      message.success('已同步到项目管理');
    } catch (error: any) {
      message.error(error.response?.data?.error || '同步失败');
    } finally {
      setSyncing(false);
    }
  };

  // 跳转到项目编辑
  const handleGoToProject = () => {
    if (syncedProject) {
      window.open(`/editor/${syncedProject.id}/edit`, '_blank');
    }
  };

  return (
    <Card
      title={<span><SoundOutlined /> 口播文案</span>}
      size="small"
      extra={
        <Button
          size="small"
          type="primary"
          icon={<EditOutlined />}
          onClick={handleGenerate}
          loading={generating}
        >
          生成文案
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          基于文章内容生成适合视频口播的文案，可调节长度、风格和语气
        </Text>

        {/* AI 模型选择 */}
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
            AI 模型
          </Text>
          <AIModelSelector
            value={selectedServiceId}
            onChange={setSelectedServiceId}
            showWebSearchTag={false}
            size="small"
          />
        </div>

        {/* 长度选择 */}
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
            文案长度
          </Text>
          <Segmented
            block
            value={length}
            onChange={(v) => setLength(v as 'short' | 'medium' | 'long')}
            options={LENGTH_OPTIONS.map(opt => ({
              value: opt.value,
              label: (
                <div style={{ padding: '4px 0' }}>
                  <div>{opt.label}</div>
                  <div style={{ fontSize: 10, color: '#999' }}>{opt.desc}</div>
                </div>
              ),
            }))}
          />
        </div>

        {/* 风格和语气选择 */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              风格
            </Text>
            <Select
              value={style}
              onChange={setStyle}
              style={{ width: '100%' }}
              options={STYLE_OPTIONS}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              语气
            </Text>
            <Select
              value={tone}
              onChange={setTone}
              style={{ width: '100%' }}
              options={TONE_OPTIONS}
            />
          </div>
        </div>

        <TextArea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="点击「生成文案」自动提炼口播文案，或直接编辑..."
          rows={8}
          style={{ fontSize: 14 }}
        />

        {script && (
          <div style={{ textAlign: 'right', color: '#666', fontSize: 12 }}>
            字数：{script.length}
          </div>
        )}

        {syncedProject ? (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message={
              <Space>
                <span>已同步到项目：{syncedProject.name}</span>
                <Button
                  type="link"
                  size="small"
                  icon={<LinkOutlined />}
                  onClick={handleGoToProject}
                >
                  去编辑
                </Button>
              </Space>
            }
          />
        ) : (
          <Button
            type="primary"
            block
            icon={<SyncOutlined />}
            onClick={handleSync}
            loading={syncing}
            disabled={!script.trim()}
          >
            同步到项目管理
          </Button>
        )}
      </Space>
    </Card>
  );
}
