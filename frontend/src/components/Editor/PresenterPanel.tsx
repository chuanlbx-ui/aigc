import { useState } from 'react';
import { Tabs, Switch, Select, Slider, Button, Space, Typography, Row, Col, ColorPicker, Alert } from 'antd';
import { UserOutlined, VideoCameraOutlined, RobotOutlined } from '@ant-design/icons';
import type {
  PresenterConfig,
  GreenScreenConfig,
  DigitalHumanConfig,
  PresenterPosition,
  EnterAnimation,
  ChromaKeyColor,
  AvatarStyle,
} from '../../stores/editor';
import AssetSelectorModal from './AssetSelectorModal';

const { Text } = Typography;

// 位置选项
const POSITION_OPTIONS: { value: PresenterPosition; label: string }[] = [
  { value: 'top-left', label: '左上' },
  { value: 'top-center', label: '上中' },
  { value: 'top-right', label: '右上' },
  { value: 'center-left', label: '左中' },
  { value: 'center', label: '居中' },
  { value: 'center-right', label: '右中' },
  { value: 'bottom-left', label: '左下' },
  { value: 'bottom-center', label: '下中' },
  { value: 'bottom-right', label: '右下' },
];

// 入场动画选项
const ANIMATION_OPTIONS: { value: EnterAnimation; label: string }[] = [
  { value: 'none', label: '无动画' },
  { value: 'fade', label: '淡入' },
  { value: 'scale', label: '缩放' },
  { value: 'slideUp', label: '上滑入' },
  { value: 'slideDown', label: '下滑入' },
  { value: 'slideLeft', label: '左滑入' },
  { value: 'slideRight', label: '右滑入' },
  { value: 'bounce', label: '弹跳' },
];

interface PresenterPanelProps {
  presenter?: PresenterConfig;
  greenScreen?: GreenScreenConfig;
  digitalHuman?: DigitalHumanConfig;
  onPresenterChange: (config: PresenterConfig | undefined) => void;
  onGreenScreenChange: (config: GreenScreenConfig | undefined) => void;
  onDigitalHumanChange: (config: DigitalHumanConfig | undefined) => void;
}

// ========== 绿幕颜色选项 ==========
const CHROMA_COLOR_OPTIONS: { value: ChromaKeyColor; label: string }[] = [
  { value: 'green', label: '绿幕' },
  { value: 'blue', label: '蓝幕' },
  { value: 'custom', label: '自定义颜色' },
];

// ========== 数字人头像风格选项 ==========
const AVATAR_STYLE_OPTIONS: { value: AvatarStyle; label: string }[] = [
  { value: 'normal', label: '普通' },
  { value: 'circle', label: '圆形' },
  { value: 'closeUp', label: '特写' },
];

// ========== 数字人语音选项 ==========
const VOICE_OPTIONS = [
  { value: 'zh-CN-XiaoxiaoNeural', label: '晓晓（女声）' },
  { value: 'zh-CN-YunxiNeural', label: '云希（男声）' },
  { value: 'zh-CN-YunjianNeural', label: '云健（男声）' },
  { value: 'zh-CN-XiaoyiNeural', label: '晓伊（女声）' },
  { value: 'zh-CN-YunyangNeural', label: '云扬（男声）' },
];

// ========== 预设头像选项 ==========
const AVATAR_OPTIONS = [
  { value: 'Angela-inblackskirt-20220820', label: 'Angela（黑裙）' },
  { value: 'Daisy-inskirtalicev4-20220721', label: 'Daisy（裙装）' },
  { value: 'josh_lite3_20230714', label: 'Josh（男性）' },
];

// ========== 真人叠加 Tab ==========
interface PresenterTabProps {
  config: PresenterConfig;
  onChange: (config: PresenterConfig | undefined) => void;
  onSelectAsset: () => void;
}

function PresenterTab({ config, onChange, onSelectAsset }: PresenterTabProps) {
  const handleChange = (partial: Partial<PresenterConfig>) => {
    onChange({ ...config, ...partial });
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Row align="middle" justify="space-between">
        <Col><Text strong>启用真人叠加</Text></Col>
        <Col>
          <Switch
            checked={config.enabled}
            onChange={(enabled) => handleChange({ enabled })}
          />
        </Col>
      </Row>

      {config.enabled && (
        <>
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>素材选择</Text>
            <Button onClick={onSelectAsset} block>
              {config.assetUrl ? '更换素材' : '选择素材'}
            </Button>
            {config.assetUrl && (
              <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                已选择: {config.assetUrl.split('/').pop()}
              </Text>
            )}
          </div>

          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>位置</Text>
            <Select
              value={config.position}
              onChange={(position) => handleChange({ position })}
              options={POSITION_OPTIONS}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              缩放比例: {Math.round(config.scale * 100)}%
            </Text>
            <Slider
              min={10}
              max={100}
              value={config.scale * 100}
              onChange={(v) => handleChange({ scale: v / 100 })}
            />
          </div>

          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>入场动画</Text>
            <Select
              value={config.entranceAnimation}
              onChange={(entranceAnimation) => handleChange({ entranceAnimation })}
              options={ANIMATION_OPTIONS}
              style={{ width: '100%' }}
            />
          </div>
        </>
      )}
    </Space>
  );
}

// ========== 绿幕视频 Tab ==========
interface GreenScreenTabProps {
  config: GreenScreenConfig;
  onChange: (config: GreenScreenConfig | undefined) => void;
  onSelectAsset: () => void;
}

function GreenScreenTab({ config, onChange, onSelectAsset }: GreenScreenTabProps) {
  const handleChange = (partial: Partial<GreenScreenConfig>) => {
    onChange({ ...config, ...partial });
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Row align="middle" justify="space-between">
        <Col><Text strong>启用绿幕抠图</Text></Col>
        <Col>
          <Switch
            checked={config.enabled}
            onChange={(enabled) => handleChange({ enabled })}
          />
        </Col>
      </Row>

      {config.enabled && (
        <>
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>绿幕视频</Text>
            <Button onClick={onSelectAsset} block>
              {config.assetUrl ? '更换视频' : '选择视频'}
            </Button>
            {config.assetUrl && (
              <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                已选择: {config.assetUrl.split('/').pop()}
              </Text>
            )}
          </div>

          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>抠图颜色</Text>
            <Select
              value={config.chromaColor}
              onChange={(chromaColor) => handleChange({ chromaColor })}
              options={CHROMA_COLOR_OPTIONS}
              style={{ width: '100%' }}
            />
          </div>

          {config.chromaColor === 'custom' && (
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>自定义颜色</Text>
              <ColorPicker
                value={config.customColor || '#00ff00'}
                onChange={(color) => handleChange({ customColor: color.toHexString() })}
              />
            </div>
          )}

          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              容差: {Math.round(config.tolerance * 100)}%
            </Text>
            <Slider
              min={10}
              max={100}
              value={config.tolerance * 100}
              onChange={(v) => handleChange({ tolerance: v / 100 })}
            />
          </div>

          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>位置</Text>
            <Select
              value={config.position}
              onChange={(position) => handleChange({ position })}
              options={POSITION_OPTIONS}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              缩放比例: {Math.round(config.scale * 100)}%
            </Text>
            <Slider
              min={10}
              max={100}
              value={config.scale * 100}
              onChange={(v) => handleChange({ scale: v / 100 })}
            />
          </div>
        </>
      )}
    </Space>
  );
}

// ========== AI数字人 Tab ==========
interface DigitalHumanTabProps {
  config: DigitalHumanConfig;
  onChange: (config: DigitalHumanConfig | undefined) => void;
}

function DigitalHumanTab({ config, onChange }: DigitalHumanTabProps) {
  const handleChange = (partial: Partial<DigitalHumanConfig>) => {
    onChange({ ...config, ...partial });
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Alert
        message="AI数字人功能"
        description="使用 HeyGen API 生成 AI 数字人视频，需要配置 HEYGEN_API_KEY 环境变量。"
        type="info"
        showIcon
      />

      <Row align="middle" justify="space-between">
        <Col><Text strong>启用AI数字人</Text></Col>
        <Col>
          <Switch
            checked={config.enabled}
            onChange={(enabled) => handleChange({ enabled })}
          />
        </Col>
      </Row>

      {config.enabled && (
        <>
          {/* 头像选择 */}
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              数字人头像
            </Text>
            <Select
              value={config.avatarId}
              onChange={(avatarId) => handleChange({ avatarId })}
              placeholder="选择头像"
              allowClear
              style={{ width: '100%' }}
              options={AVATAR_OPTIONS}
            />
          </div>

          {/* 头像风格 */}
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              头像风格
            </Text>
            <Select
              value={config.avatarStyle || 'normal'}
              onChange={(avatarStyle) => handleChange({ avatarStyle })}
              style={{ width: '100%' }}
              options={AVATAR_STYLE_OPTIONS}
            />
          </div>

          {/* 语音选择 */}
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              语音
            </Text>
            <Select
              value={config.voiceId || 'zh-CN-XiaoxiaoNeural'}
              onChange={(voiceId) => handleChange({ voiceId })}
              style={{ width: '100%' }}
              options={VOICE_OPTIONS}
            />
          </div>

          {/* 语速调节 */}
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              语速: {(config.voiceSpeed || 1.0).toFixed(1)}x
            </Text>
            <Slider
              min={0.5}
              max={1.5}
              step={0.1}
              value={config.voiceSpeed || 1.0}
              onChange={(voiceSpeed) => handleChange({ voiceSpeed })}
              marks={{ 0.5: '0.5x', 1: '1x', 1.5: '1.5x' }}
            />
          </div>

          {/* 背景设置 */}
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              背景
            </Text>
            <Select
              value={config.backgroundType || 'transparent'}
              onChange={(backgroundType) => handleChange({ backgroundType })}
              style={{ width: '100%' }}
              options={[
                { value: 'transparent', label: '透明背景' },
                { value: 'color', label: '纯色背景' },
              ]}
            />
          </div>

          {/* 背景颜色 */}
          {config.backgroundType === 'color' && (
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                背景颜色
              </Text>
              <ColorPicker
                value={config.backgroundColor || '#00ff00'}
                onChange={(color) => handleChange({ backgroundColor: color.toHexString() })}
              />
            </div>
          )}
        </>
      )}
    </Space>
  );
}

export default function PresenterPanel({
  presenter,
  greenScreen,
  digitalHuman,
  onPresenterChange,
  onGreenScreenChange,
  onDigitalHumanChange,
}: PresenterPanelProps) {
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [assetModalTarget, setAssetModalTarget] = useState<'presenter' | 'greenScreen'>('presenter');

  // 默认配置
  const defaultPresenter: PresenterConfig = {
    enabled: false,
    position: 'bottom-right',
    scale: 0.3,
    entranceAnimation: 'fade',
  };

  const defaultGreenScreen: GreenScreenConfig = {
    enabled: false,
    chromaColor: 'green',
    tolerance: 0.4,
    position: 'bottom-right',
    scale: 0.4,
  };

  const defaultDigitalHuman: DigitalHumanConfig = {
    enabled: false,
  };

  const currentPresenter = presenter || defaultPresenter;
  const currentGreenScreen = greenScreen || defaultGreenScreen;
  const currentDigitalHuman = digitalHuman || defaultDigitalHuman;

  // 素材选择回调
  const handleAssetSelect = (asset: { id: string; path: string }) => {
    // 使用 API URL 而不是本地路径
    const assetUrl = `/api/assets/file/${asset.id}`;
    if (assetModalTarget === 'presenter') {
      onPresenterChange({
        ...currentPresenter,
        assetId: asset.id,
        assetUrl,
      });
    } else {
      onGreenScreenChange({
        ...currentGreenScreen,
        assetId: asset.id,
        assetUrl,
      });
    }
    setAssetModalOpen(false);
  };

  return (
    <>
      <Tabs
        defaultActiveKey="presenter"
        items={[
          {
            key: 'presenter',
            label: <span><UserOutlined /> 真人叠加</span>,
            children: (
              <PresenterTab
                config={currentPresenter}
                onChange={onPresenterChange}
                onSelectAsset={() => { setAssetModalTarget('presenter'); setAssetModalOpen(true); }}
              />
            ),
          },
          {
            key: 'greenScreen',
            label: <span><VideoCameraOutlined /> 绿幕视频</span>,
            children: (
              <GreenScreenTab
                config={currentGreenScreen}
                onChange={onGreenScreenChange}
                onSelectAsset={() => { setAssetModalTarget('greenScreen'); setAssetModalOpen(true); }}
              />
            ),
          },
          {
            key: 'digitalHuman',
            label: <span><RobotOutlined /> AI数字人</span>,
            children: (
              <DigitalHumanTab
                config={currentDigitalHuman}
                onChange={onDigitalHumanChange}
              />
            ),
          },
        ]}
      />

      <AssetSelectorModal
        open={assetModalOpen}
        onCancel={() => setAssetModalOpen(false)}
        onSelect={handleAssetSelect}
        filterType="video"
        title={assetModalTarget === 'presenter' ? '选择真人视频' : '选择绿幕视频'}
      />
    </>
  );
}
