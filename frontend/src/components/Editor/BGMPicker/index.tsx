import { useState } from 'react';
import { Space, Typography, Button, Slider } from 'antd';
import { SoundOutlined, SwapOutlined } from '@ant-design/icons';
import { getPresetById, formatDuration } from '../../../bgm/presets';
import BGMModal from './BGMModal';

interface BGMConfig {
  type: 'preset' | 'asset' | 'none';
  presetId?: string;
  assetId: string | null;
  volume: number;
}

interface Props {
  config: BGMConfig;
  onChange: (config: BGMConfig) => void;
}

export default function BGMPicker({ config, onChange }: Props) {
  const [showModal, setShowModal] = useState(false);

  const currentPreset = config.presetId ? getPresetById(config.presetId) : null;

  const handleSelectPreset = (presetId: string) => {
    onChange({
      type: 'preset',
      presetId,
      assetId: null,
      volume: config.volume,
    });
  };

  const handleSelectAsset = (assetId: string) => {
    onChange({
      type: 'asset',
      presetId: undefined,
      assetId,
      volume: config.volume,
    });
  };

  const handleClear = () => {
    onChange({
      type: 'none',
      presetId: undefined,
      assetId: null,
      volume: config.volume,
    });
  };

  // 获取当前选中的音乐名称
  const getSelectedName = () => {
    if (config.type === 'preset' && currentPreset) {
      return currentPreset.name;
    }
    if (config.type === 'asset' && config.assetId) {
      return '素材库音乐';
    }
    return null;
  };

  const selectedName = getSelectedName();

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <div>
        <Typography.Text type="secondary">当前背景音乐</Typography.Text>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 8,
            background: selectedName
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <SoundOutlined
            style={{ fontSize: 24, color: selectedName ? '#fff' : '#999' }}
          />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 8 }}>
            <Typography.Text strong>
              {selectedName || '未选择音乐'}
            </Typography.Text>
            {currentPreset && (
              <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                {formatDuration(currentPreset.duration)}
              </Typography.Text>
            )}
          </div>
          <Space>
            <Button icon={<SwapOutlined />} onClick={() => setShowModal(true)}>
              {selectedName ? '更换音乐' : '选择音乐'}
            </Button>
            {selectedName && (
              <Button onClick={handleClear}>清除</Button>
            )}
          </Space>
        </div>
      </div>

      {(config.type === 'preset' || config.type === 'asset') && (
        <div>
          <Typography.Text type="secondary">
            音量: {Math.round(config.volume * 100)}%
          </Typography.Text>
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={config.volume}
            onChange={(value) => onChange({ ...config, volume: value })}
          />
        </div>
      )}

      <BGMModal
        open={showModal}
        selectedPresetId={config.presetId}
        selectedAssetId={config.assetId}
        onSelectPreset={handleSelectPreset}
        onSelectAsset={handleSelectAsset}
        onClose={() => setShowModal(false)}
      />
    </Space>
  );
}
