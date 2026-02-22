import { useState, useRef, useEffect } from 'react';
import { Form, Select, Slider, Button, message, Tabs, Card, Tag, Space, Tooltip, Empty, Modal, Upload, Input, Spin } from 'antd';
import {
  SoundOutlined,
  LoadingOutlined,
  PauseCircleOutlined,
  UserOutlined,
  CrownOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  UploadOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { api } from '../../api/client';

// 情感类型
type TTSEmotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'excited' | 'gentle';

interface TTSConfig {
  provider: 'edge' | 'openai' | 'azure';
  voice: string;
  rate: number;
  emotion?: TTSEmotion;
}

interface TTSPanelProps {
  config: TTSConfig;
  onChange: (config: TTSConfig) => void;
}

interface TTSProvider {
  id: string;
  name: string;
  category: 'free' | 'premium' | 'cloned';
  description: string;
  available: boolean;
  supportsEmotion: boolean;
  supportsCloning: boolean;
}

interface TTSVoice {
  id: string;
  name: string;
  gender: 'male' | 'female';
  category: string;
  description?: string;
  supportsEmotion?: boolean;
}

interface ClonedVoice {
  id: string;
  name: string;
  provider: string;
  status: 'pending' | 'ready' | 'failed';
  createdAt: string;
}

// 情感选项
const emotionOptions: { value: TTSEmotion; label: string; emoji: string }[] = [
  { value: 'neutral', label: '中性', emoji: '😐' },
  { value: 'happy', label: '开心', emoji: '😊' },
  { value: 'sad', label: '悲伤', emoji: '😢' },
  { value: 'angry', label: '愤怒', emoji: '😠' },
  { value: 'excited', label: '激动', emoji: '🤩' },
  { value: 'gentle', label: '温柔', emoji: '🥰' },
];

export default function TTSPanel({ config, onChange }: TTSPanelProps) {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [providers, setProviders] = useState<TTSProvider[]>([]);
  const [voices, setVoices] = useState<TTSVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('free');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 克隆声音相关状态
  const [cloneModalVisible, setCloneModalVisible] = useState(false);
  const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);
  const [loadingClonedVoices, setLoadingClonedVoices] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [cloneForm] = Form.useForm();
  const [audioFile, setAudioFile] = useState<File | null>(null);

  // 加载可用的 TTS 引擎
  useEffect(() => {
    loadProviders();
    loadClonedVoices();
  }, []);

  // 当引擎变化时加载音色列表
  useEffect(() => {
    if (config.provider) {
      loadVoices(config.provider);
    }
  }, [config.provider]);

  const loadProviders = async () => {
    try {
      const res = await api.get('/tts/providers');
      setProviders(res.data.providers || []);
    } catch {
      // 使用默认列表
      setProviders([
        { id: 'edge', name: 'Edge TTS', category: 'free', description: '微软免费语音', available: true, supportsEmotion: false, supportsCloning: false }
      ]);
    }
  };

  const loadVoices = async (provider: string) => {
    setLoadingVoices(true);
    try {
      const res = await api.get(`/tts/voices/${provider}`);
      setVoices(res.data.voices || []);
    } catch {
      setVoices([]);
    } finally {
      setLoadingVoices(false);
    }
  };

  // 加载克隆声音列表
  const loadClonedVoices = async () => {
    setLoadingClonedVoices(true);
    try {
      const res = await api.get('/voice-clone/list');
      setClonedVoices(res.data.voices || []);
    } catch {
      setClonedVoices([]);
    } finally {
      setLoadingClonedVoices(false);
    }
  };

  // 克隆声音
  const handleCloneVoice = async () => {
    if (!audioFile) {
      message.error('请上传参考音频');
      return;
    }

    try {
      await cloneForm.validateFields();
      const values = cloneForm.getFieldsValue();

      setCloning(true);
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('name', values.name);
      formData.append('provider', values.provider || 'elevenlabs');

      await api.post('/voice-clone/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      message.success('声音克隆已提交，请稍后查看结果');
      setCloneModalVisible(false);
      cloneForm.resetFields();
      setAudioFile(null);
      loadClonedVoices();
    } catch (err: any) {
      message.error(err.response?.data?.error || '克隆失败');
    } finally {
      setCloning(false);
    }
  };

  // 删除克隆声音
  const handleDeleteClonedVoice = async (voiceId: string) => {
    try {
      await api.delete(`/voice-clone/${voiceId}`);
      message.success('已删除');
      loadClonedVoices();
    } catch (err: any) {
      message.error(err.response?.data?.error || '删除失败');
    }
  };

  // 按类别分组引擎
  const freeProviders = providers.filter(p => p.category === 'free');
  const premiumProviders = providers.filter(p => p.category === 'premium');

  // 当前引擎是否支持情感
  const currentProvider = providers.find(p => p.id === config.provider);
  const supportsEmotion = currentProvider?.supportsEmotion || false;

  const handlePreview = async (voiceId?: string) => {
    const targetVoice = voiceId || config.voice;

    if (playing && playingVoiceId === targetVoice && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      setPlayingVoiceId(null);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/tts/preview', {
        provider: config.provider,
        voice: targetVoice,
        rate: config.rate,
        emotion: config.emotion,
      });

      const audioUrl = `/api/tts/preview/${res.data.audioId}`;

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setPlaying(false);
        setPlayingVoiceId(null);
      };
      audio.onerror = () => {
        message.error('音频播放失败');
        setPlaying(false);
        setPlayingVoiceId(null);
      };

      await audio.play();
      setPlaying(true);
      setPlayingVoiceId(targetVoice);
    } catch (err: any) {
      message.error(err.response?.data?.error || '试听生成失败');
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    onChange({
      ...config,
      provider: providerId as 'edge' | 'openai' | 'azure',
      voice: '',
      emotion: provider?.supportsEmotion ? 'neutral' : undefined
    });
  };

  const handleVoiceSelect = (voiceId: string) => {
    onChange({ ...config, voice: voiceId });
  };

  // 渲染音色卡片
  const renderVoiceCard = (voice: TTSVoice) => {
    const isSelected = config.voice === voice.id;
    const isPlaying = playing && playingVoiceId === voice.id;

    return (
      <Card
        key={voice.id}
        size="small"
        hoverable
        onClick={() => handleVoiceSelect(voice.id)}
        style={{
          marginBottom: 8,
          borderColor: isSelected ? '#1890ff' : undefined,
          backgroundColor: isSelected ? '#e6f7ff' : undefined,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: isSelected ? 600 : 400 }}>
              {voice.gender === 'female' ? '👩' : '👨'} {voice.name}
            </span>
            {voice.description && (
              <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                {voice.description}
              </div>
            )}
          </div>
          <Tooltip title="试听">
            <Button
              type="text"
              size="small"
              icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              loading={loading && playingVoiceId === voice.id}
              onClick={(e) => {
                e.stopPropagation();
                handlePreview(voice.id);
              }}
            />
          </Tooltip>
        </div>
      </Card>
    );
  };

  // 渲染引擎选择器
  const renderProviderSelector = (providerList: TTSProvider[]) => {
    if (providerList.length === 0) {
      return <Empty description="暂无可用引擎" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }

    return (
      <div style={{ marginBottom: 16 }}>
        {providerList.map(provider => (
          <Card
            key={provider.id}
            size="small"
            hoverable
            onClick={() => handleProviderChange(provider.id)}
            style={{
              marginBottom: 8,
              borderColor: config.provider === provider.id ? '#1890ff' : undefined,
              backgroundColor: config.provider === provider.id ? '#e6f7ff' : undefined,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: config.provider === provider.id ? 600 : 400 }}>
                  {provider.name}
                </span>
                <div style={{ fontSize: 12, color: '#666' }}>{provider.description}</div>
              </div>
              <Space size={4}>
                {provider.supportsEmotion && <Tag color="purple">情感</Tag>}
                {provider.supportsCloning && <Tag color="gold">克隆</Tag>}
              </Space>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const tabItems = [
    {
      key: 'free',
      label: (
        <span>
          <SoundOutlined /> 免费
        </span>
      ),
      children: (
        <>
          {renderProviderSelector(freeProviders)}
          {config.provider && freeProviders.some(p => p.id === config.provider) && (
            <>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>
                选择音色 {voices.length > 0 && <span style={{ color: '#999', fontWeight: 400 }}>({voices.length}个)</span>}
              </div>
              {loadingVoices ? (
                <div style={{ textAlign: 'center', padding: 20 }}><LoadingOutlined /></div>
              ) : (
                <div style={{
                  maxHeight: 240,
                  overflowY: 'auto',
                  paddingRight: 8,
                  marginRight: -8,
                }}>
                  {voices.map(renderVoiceCard)}
                </div>
              )}
            </>
          )}
        </>
      ),
    },
    {
      key: 'premium',
      label: (
        <span>
          <CrownOutlined /> 高品质
        </span>
      ),
      children: (
        <>
          {renderProviderSelector(premiumProviders)}
          {config.provider && premiumProviders.some(p => p.id === config.provider) && (
            <>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>
                选择音色 {voices.length > 0 && <span style={{ color: '#999', fontWeight: 400 }}>({voices.length}个)</span>}
              </div>
              {loadingVoices ? (
                <div style={{ textAlign: 'center', padding: 20 }}><LoadingOutlined /></div>
              ) : voices.length === 0 ? (
                <Empty description="暂无可用音色" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <div style={{
                  maxHeight: 240,
                  overflowY: 'auto',
                  paddingRight: 8,
                  marginRight: -8,
                }}>
                  {voices.map(renderVoiceCard)}
                </div>
              )}
            </>
          )}
        </>
      ),
    },
    {
      key: 'cloned',
      label: (
        <span>
          <UserOutlined /> 我的声音
        </span>
      ),
      children: (
        <div style={{ padding: '8px 0' }}>
          {loadingClonedVoices ? (
            <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
          ) : clonedVoices.length === 0 ? (
            <Empty
              description="暂无克隆声音"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCloneModalVisible(true)}
              >
                克隆我的声音
              </Button>
            </Empty>
          ) : (
            <>
              <div style={{ marginBottom: 12 }}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  size="small"
                  onClick={() => setCloneModalVisible(true)}
                >
                  添加新声音
                </Button>
              </div>
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {clonedVoices.map(voice => (
                  <Card
                    key={voice.id}
                    size="small"
                    hoverable
                    onClick={() => {
                      if (voice.status === 'ready') {
                        onChange({ ...config, provider: voice.provider as 'edge' | 'openai' | 'azure', voice: voice.id });
                      }
                    }}
                    style={{
                      marginBottom: 8,
                      borderColor: config.voice === voice.id ? '#1890ff' : undefined,
                      backgroundColor: config.voice === voice.id ? '#e6f7ff' : undefined,
                      opacity: voice.status !== 'ready' ? 0.6 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: config.voice === voice.id ? 600 : 400 }}>
                          🎤 {voice.name}
                        </span>
                        <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                          {voice.status === 'pending' && <Tag color="processing">处理中</Tag>}
                          {voice.status === 'ready' && <Tag color="success">可用</Tag>}
                          {voice.status === 'failed' && <Tag color="error">失败</Tag>}
                        </div>
                      </div>
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClonedVoice(voice.id);
                        }}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <Form layout="vertical">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="small"
      />

      {/* 情感选择器 - 仅高品质引擎显示 */}
      {supportsEmotion && (
        <Form.Item label="情感风格" style={{ marginTop: 16 }}>
          <Space wrap>
            {emotionOptions.map(opt => (
              <Tag
                key={opt.value}
                color={config.emotion === opt.value ? 'blue' : 'default'}
                style={{ cursor: 'pointer', padding: '4px 8px' }}
                onClick={() => onChange({ ...config, emotion: opt.value })}
              >
                {opt.emoji} {opt.label}
              </Tag>
            ))}
          </Space>
        </Form.Item>
      )}

      {/* 语速控制 */}
      <Form.Item label={`语速: ${config.rate}x`} style={{ marginTop: 16 }}>
        <Slider
          min={0.5}
          max={2}
          step={0.1}
          value={config.rate}
          onChange={(rate) => onChange({ ...config, rate })}
        />
      </Form.Item>

      {/* 试听按钮 */}
      <Form.Item>
        <Button
          type="primary"
          icon={loading ? <LoadingOutlined /> : playing ? <PauseCircleOutlined /> : <SoundOutlined />}
          onClick={() => handlePreview()}
          disabled={loading || !config.voice}
          block
        >
          {loading ? '生成中...' : playing ? '停止试听' : '试听当前设置'}
        </Button>
      </Form.Item>

      {/* 克隆声音弹窗 */}
      <Modal
        title="克隆我的声音"
        open={cloneModalVisible}
        onCancel={() => {
          setCloneModalVisible(false);
          cloneForm.resetFields();
          setAudioFile(null);
        }}
        onOk={handleCloneVoice}
        confirmLoading={cloning}
        okText="开始克隆"
        cancelText="取消"
      >
        <Form form={cloneForm} layout="vertical">
          <Form.Item
            name="name"
            label="声音名称"
            rules={[{ required: true, message: '请输入声音名称' }]}
          >
            <Input placeholder="例如：我的声音" />
          </Form.Item>

          <Form.Item
            name="provider"
            label="克隆引擎"
            initialValue="elevenlabs"
          >
            <Select
              options={[
                { value: 'elevenlabs', label: 'ElevenLabs（推荐）' },
                { value: 'fish-speech', label: 'Fish Speech' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="参考音频"
            required
            extra="上传 10-30 秒清晰的语音录音，MP3/WAV 格式"
          >
            <Upload
              accept=".mp3,.wav,.m4a"
              maxCount={1}
              beforeUpload={(file) => {
                setAudioFile(file);
                return false;
              }}
              onRemove={() => setAudioFile(null)}
              fileList={audioFile ? [{ uid: '-1', name: audioFile.name, status: 'done' }] : []}
            >
              <Button icon={<UploadOutlined />}>选择音频文件</Button>
            </Upload>
          </Form.Item>

          <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 6, fontSize: 12, color: '#666' }}>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>录音建议：</div>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              <li>使用安静环境录制</li>
              <li>保持正常语速和音量</li>
              <li>避免背景噪音和回声</li>
              <li>时长建议 10-30 秒</li>
            </ul>
          </div>
        </Form>
      </Modal>
    </Form>
  );
}
