import { useState, useEffect } from 'react';
import {
  Modal, Input, Select, Button, Space, Spin,
  message, InputNumber, Radio, Tag, Alert,
} from 'antd';
import { RobotOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { api } from '../../api/client';

interface ProviderInfo {
  id: string;
  name: string;
  supportedTypes: Array<'image' | 'video'>;
  apiKeyEnvVar: string;
}

interface AssetGenerateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AssetGenerateModal({
  open,
  onClose,
  onSuccess,
}: AssetGenerateModalProps) {
  // 生成器列表
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  // 表单状态
  const [text, setText] = useState('');
  const [projectName, setProjectName] = useState('');
  const [provider, setProvider] = useState<string>('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [count, setCount] = useState(3);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');

  // 关键词预览
  const [keywords, setKeywords] = useState<Array<{ chinese: string; english: string }>>([]);
  const [suggestedCount, setSuggestedCount] = useState(3);
  void suggestedCount; // 保留用于未来扩展

  // 生成状态
  const [generating, setGenerating] = useState(false);

  // 加载生成器列表
  useEffect(() => {
    if (open) {
      loadProviders();
    }
  }, [open]);

  const loadProviders = async () => {
    setLoadingProviders(true);
    try {
      const [allRes, availableRes] = await Promise.all([
        api.get('/assets/generators'),
        api.get('/assets/generators/available'),
      ]);
      setProviders(allRes.data || []);
      setAvailableProviders((availableRes.data || []).map((p: ProviderInfo) => p.id));

      // 默认选择第一个可用的生成器
      const available = availableRes.data || [];
      if (available.length > 0) {
        setProvider(available[0].id);
      }
    } catch {
      message.error('加载生成器列表失败');
    } finally {
      setLoadingProviders(false);
    }
  };

  // 提取关键词预览
  const extractKeywords = async () => {
    if (!text.trim()) {
      setKeywords([]);
      return;
    }
    try {
      const res = await api.post('/assets/extract-keywords', { text });
      setKeywords(res.data.keywords || []);
      setSuggestedCount(res.data.suggestedCount || 3);
      setCount(res.data.suggestedCount || 3);
    } catch {
      // 忽略错误
    }
  };

  // 文本变化时提取关键词（防抖）
  useEffect(() => {
    const timer = setTimeout(extractKeywords, 500);
    return () => clearTimeout(timer);
  }, [text]);

  // 执行生成
  const handleGenerate = async () => {
    if (!text.trim()) {
      message.warning('请输入文稿内容');
      return;
    }
    if (!provider) {
      message.warning('请选择生成服务');
      return;
    }

    setGenerating(true);
    try {
      const res = await api.post('/assets/generate', {
        text,
        projectName,
        provider,
        mediaType,
        count,
        orientation,
      });
      message.success(`成功生成 ${res.data.assets?.length || 0} 个素材`);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      message.error(err.response?.data?.error || '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  // 获取当前选中生成器支持的类型
  const currentProvider = providers.find(p => p.id === provider);
  void currentProvider; // 保留用于未来扩展

  // 按类型筛选生成器
  const filteredProviders = providers.filter(p =>
    p.supportedTypes.includes(mediaType)
  );

  return (
    <Modal
      title={<><RobotOutlined /> AI 生成素材</>}
      open={open}
      onCancel={onClose}
      width={600}
      footer={null}
      destroyOnClose
    >
      <Spin spinning={loadingProviders}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* 项目名称 */}
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>项目名称</div>
            <Input
              placeholder="用于素材分类命名"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>

          {/* 文稿内容 */}
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>文稿内容</div>
            <Input.TextArea
              rows={4}
              placeholder="输入文稿内容，系统将自动提取关键词生成素材..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {/* 关键词预览 */}
          {keywords.length > 0 && (
            <div>
              <div style={{ marginBottom: 4, color: '#666', fontSize: 12 }}>
                提取的关键词：
              </div>
              <Space wrap>
                {keywords.map((k, i) => (
                  <Tag key={i} color="blue">
                    {k.chinese} ({k.english})
                  </Tag>
                ))}
              </Space>
            </div>
          )}

          {/* 媒体类型 */}
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>媒体类型</div>
            <Radio.Group
              value={mediaType}
              onChange={(e) => {
                setMediaType(e.target.value);
                // 切换类型时重新选择生成器
                const available = providers.filter(p =>
                  p.supportedTypes.includes(e.target.value) &&
                  availableProviders.includes(p.id)
                );
                if (available.length > 0) {
                  setProvider(available[0].id);
                } else {
                  setProvider('');
                }
              }}
            >
              <Radio.Button value="image">图片</Radio.Button>
              <Radio.Button value="video">视频</Radio.Button>
            </Radio.Group>
          </div>

          {/* 生成服务 */}
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>生成服务</div>
            <Select
              style={{ width: '100%' }}
              placeholder="选择 AI 生成服务"
              value={provider}
              onChange={setProvider}
              options={filteredProviders.map(p => ({
                value: p.id,
                label: (
                  <span>
                    {p.name}
                    {!availableProviders.includes(p.id) && (
                      <Tag color="orange" style={{ marginLeft: 8 }}>未配置</Tag>
                    )}
                  </span>
                ),
                disabled: !availableProviders.includes(p.id),
              }))}
            />
          </div>

          {/* 生成数量和方向 */}
          <Space>
            <div>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>生成数量</div>
              <InputNumber
                min={1}
                max={10}
                value={count}
                onChange={(v) => setCount(v || 1)}
              />
            </div>
            <div>
              <div style={{ marginBottom: 4, fontWeight: 500 }}>画面方向</div>
              <Radio.Group
                value={orientation}
                onChange={(e) => setOrientation(e.target.value)}
              >
                <Radio.Button value="landscape">横屏</Radio.Button>
                <Radio.Button value="portrait">竖屏</Radio.Button>
              </Radio.Group>
            </div>
          </Space>

          {/* 提示信息 */}
          {availableProviders.length === 0 && (
            <Alert
              type="warning"
              message="未配置任何 AI 生成服务"
              description="请在后端 .env 文件中配置相应的 API Key"
              showIcon
            />
          )}

          {/* 生成按钮 */}
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={handleGenerate}
            loading={generating}
            disabled={!provider || !text.trim()}
            block
            size="large"
          >
            {generating ? '生成中...' : `生成 ${count} 个${mediaType === 'image' ? '图片' : '视频'}`}
          </Button>
        </Space>
      </Spin>
    </Modal>
  );
}
