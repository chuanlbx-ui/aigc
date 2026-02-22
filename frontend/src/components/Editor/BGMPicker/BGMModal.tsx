import { Modal, Tabs, Row, Col } from 'antd';
import { BGM_PRESETS, getPresetsByCategory } from '../../../bgm/presets';
import type { BGMCategory } from '../../../bgm/types';
import BGMPreview from './BGMPreview';
import AssetList from './AssetList';

interface TabItem {
  key: string;
  label: string;
  children: React.ReactNode;
}

interface Props {
  open: boolean;
  selectedPresetId?: string;
  selectedAssetId?: string | null;
  onSelectPreset: (presetId: string) => void;
  onSelectAsset: (assetId: string) => void;
  onClose: () => void;
}

const categories: BGMCategory[] = [
  '轻松愉快',
  '科技感',
  '励志激昂',
  '舒缓放松',
  '神秘悬疑',
  '活力动感',
];

export const BGMModal: React.FC<Props> = ({
  open,
  selectedPresetId,
  selectedAssetId,
  onSelectPreset,
  onSelectAsset,
  onClose,
}) => {
  const handleSelectPreset = (presetId: string) => {
    onSelectPreset(presetId);
    onClose();
  };

  const handleSelectAsset = (assetId: string) => {
    onSelectAsset(assetId);
    onClose();
  };

  // 预设音乐标签页
  const presetTabs: TabItem[] = categories.map((cat) => ({
    key: cat,
    label: cat,
    children: (
      <Row gutter={[12, 12]}>
        {getPresetsByCategory(cat).map((preset) => (
          <Col key={preset.id} span={12}>
            <BGMPreview
              preset={preset}
              selected={selectedPresetId === preset.id}
              onClick={() => handleSelectPreset(preset.id)}
            />
          </Col>
        ))}
      </Row>
    ),
  }));

  // 添加"全部预设"标签
  presetTabs.unshift({
    key: 'all',
    label: '全部预设',
    children: (
      <Row gutter={[12, 12]}>
        {BGM_PRESETS.map((preset) => (
          <Col key={preset.id} span={12}>
            <BGMPreview
              preset={preset}
              selected={selectedPresetId === preset.id}
              onClick={() => handleSelectPreset(preset.id)}
            />
          </Col>
        ))}
      </Row>
    ),
  });

  // 添加"素材库"标签
  presetTabs.push({
    key: 'assets',
    label: '素材库',
    children: (
      <AssetList
        selectedAssetId={selectedAssetId}
        onSelect={handleSelectAsset}
      />
    ),
  });

  return (
    <Modal
      title="选择背景音乐"
      open={open}
      onCancel={onClose}
      width={800}
      footer={null}
    >
      <Tabs items={presetTabs} />
    </Modal>
  );
};

export default BGMModal;
