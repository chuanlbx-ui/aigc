import { useState } from 'react';
import { Space, Typography, Button } from 'antd';
import { BgColorsOutlined, SwapOutlined } from '@ant-design/icons';
import { getPresetById } from '../../../backgrounds/presets';
import BackgroundPreview from './BackgroundPreview';
import BackgroundModal from './BackgroundModal';

interface BackgroundConfig {
  styleId: string;
}

interface Props {
  config: BackgroundConfig;
  onChange: (config: BackgroundConfig) => void;
}

export default function BackgroundPicker({ config, onChange }: Props) {
  const [showModal, setShowModal] = useState(false);
  const currentPreset = getPresetById(config.styleId);

  const handleSelect = (styleId: string) => {
    onChange({ styleId });
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <div>
        <Typography.Text type="secondary">当前背景样式</Typography.Text>
      </div>

      {/* 当前选中的背景预览 */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ width: 160 }}>
          {currentPreset ? (
            <BackgroundPreview preset={currentPreset} />
          ) : (
            <div
              style={{
                width: '100%',
                aspectRatio: '16/9',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BgColorsOutlined style={{ fontSize: 24, color: '#fff' }} />
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 8 }}>
            <Typography.Text strong>
              {currentPreset?.name || '默认背景'}
            </Typography.Text>
          </div>
          <Button
            icon={<SwapOutlined />}
            onClick={() => setShowModal(true)}
          >
            更换背景
          </Button>
        </div>
      </div>

      <BackgroundModal
        open={showModal}
        selectedId={config.styleId}
        onSelect={handleSelect}
        onClose={() => setShowModal(false)}
      />
    </Space>
  );
}
