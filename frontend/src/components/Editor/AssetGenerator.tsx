import { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Radio,
  Select,
  InputNumber,
  Tag,
  Space,
  Progress,
  Alert,
  message,
} from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { api } from '../../api/client';

interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  supportedTypes: ('image' | 'video')[];
  requiresApiKey: boolean;
}

interface Keyword {
  chinese: string;
  english: string;
}

interface GeneratedAsset {
  id: string;
  name: string;
  type: string;
  path: string;
}

interface AssetGeneratorProps {
  text: string;
  projectName?: string;
  orientation: 'landscape' | 'portrait';
  onGenerated: (assets: GeneratedAsset[]) => void;
}

export default function AssetGenerator({
  text,
  projectName,
  orientation,
  onGenerated,
}: AssetGeneratorProps) {
  const [visible, setVisible] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [provider, setProvider] = useState<string>('');
  const [count, setCount] = useState<number>(5);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [suggestedCount, setSuggestedCount] = useState(5);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  // 获取生成服务列表
  useEffect(() => {
    if (visible) {
      fetchProviders();
      fetchAvailableProviders();
      if (text) {
        extractKeywords();
      }
    }
  }, [visible, text]);

  const fetchProviders = async () => {
    try {
      const res = await api.get('/assets/generators');
      setProviders(res.data);
    } catch {
      setProviders([]);
    }
  };

  const fetchAvailableProviders = async () => {
    try {
      const res = await api.get('/assets/generators/available');
      setAvailableProviders(res.data.map((p: ProviderInfo) => p.id));
    } catch {
      setAvailableProviders([]);
    }
  };

  const extractKeywords = async () => {
    try {
      const res = await api.post('/assets/extract-keywords', { text });
      setKeywords(res.data.keywords);
      setSuggestedCount(res.data.suggestedCount);
      setCount(res.data.suggestedCount);
    } catch {
      setKeywords([]);
    }
  };

  // 根据媒体类型筛选服务
  const filteredProviders = providers.filter(p =>
    p.supportedTypes.includes(mediaType)
  );

  // 开始生成
  const handleGenerate = async () => {
    if (!provider) {
      message.warning('请选择生成服务');
      return;
    }
    if (!text) {
      message.warning('请先输入口播文稿');
      return;
    }

    setGenerating(true);
    setProgress(0);

    // 模拟进度
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 1000);

    try {
      const res = await api.post('/assets/generate', {
        text,
        projectName,
        provider,
        mediaType,
        count,
        orientation,
      });

      clearInterval(progressInterval);
      setProgress(100);

      message.success(`成功生成 ${res.data.assets.length} 个素材`);
      onGenerated(res.data.assets);
      setVisible(false);
    } catch (error: any) {
      clearInterval(progressInterval);
      message.error(error.response?.data?.error || '生成失败');
    } finally {
      setGenerating(false);
      setProgress(0);
    }
  };

  return (
    <>
      <Button
        icon={<ThunderboltOutlined />}
        onClick={() => setVisible(true)}
        disabled={!text}
      >
        自动生成素材
      </Button>

      <Modal
        title="自动生成素材"
        open={visible}
        onCancel={() => !generating && setVisible(false)}
        width={600}
        footer={
          <Space>
            <Button onClick={() => setVisible(false)} disabled={generating}>
              取消
            </Button>
            <Button
              type="primary"
              onClick={handleGenerate}
              loading={generating}
            >
              开始生成
            </Button>
          </Space>
        }
      >
        {/* 生成类型 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>生成类型</div>
          <Radio.Group
            value={mediaType}
            onChange={e => {
              setMediaType(e.target.value);
              setProvider('');
            }}
          >
            <Radio.Button value="image">图片</Radio.Button>
            <Radio.Button value="video">视频</Radio.Button>
          </Radio.Group>
        </div>

        {/* 生成服务选择 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>
            {mediaType === 'image' ? '图片服务' : '视频服务'}
          </div>
          <Select
            style={{ width: '100%' }}
            placeholder="选择生成服务"
            value={provider || undefined}
            onChange={setProvider}
            options={filteredProviders.map(p => ({
              label: (
                <Space>
                  {p.name}
                  {!availableProviders.includes(p.id) && (
                    <Tag color="orange">未配置</Tag>
                  )}
                </Space>
              ),
              value: p.id,
              disabled: !availableProviders.includes(p.id),
            }))}
          />
          {provider && (
            <div style={{ marginTop: 4, color: '#666', fontSize: 12 }}>
              {filteredProviders.find(p => p.id === provider)?.description}
            </div>
          )}
        </div>

        {/* 生成数量 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>生成数量</div>
          <Space>
            <InputNumber
              min={1}
              max={10}
              value={count}
              onChange={v => setCount(v || 1)}
            />
            <span style={{ color: '#666' }}>
              建议: {suggestedCount} 个
            </span>
          </Space>
        </div>

        {/* 关键词预览 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>提取的关键词</div>
          <div
            style={{
              padding: 12,
              background: '#f5f5f5',
              borderRadius: 4,
              minHeight: 40,
            }}
          >
            {keywords.length > 0 ? (
              <Space wrap>
                {keywords.map((k, i) => (
                  <Tag key={i} color="blue">
                    {k.chinese}
                  </Tag>
                ))}
              </Space>
            ) : (
              <span style={{ color: '#999' }}>请先输入口播文稿</span>
            )}
          </div>
        </div>

        {/* 生成进度 */}
        {generating && (
          <div style={{ marginBottom: 16 }}>
            <Progress percent={progress} status="active" />
            <div style={{ textAlign: 'center', color: '#666', marginTop: 8 }}>
              正在生成素材，请稍候...
            </div>
          </div>
        )}

        {/* 提示信息 */}
        {!text && (
          <Alert
            type="warning"
            message="请先在上方输入口播文稿"
            showIcon
          />
        )}
      </Modal>
    </>
  );
}
