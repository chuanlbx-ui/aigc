import React from 'react';
import { Modal, Tabs, Row, Col } from 'antd';
import { BACKGROUND_PRESETS, getPresetsByCategory } from '../../../backgrounds/presets';
import BackgroundPreview from './BackgroundPreview';

interface Props {
  open: boolean;
  selectedId: string;
  onSelect: (styleId: string) => void;
  onClose: () => void;
}

const categories = [
  { key: '纯色', label: '纯色' },
  { key: '渐变', label: '渐变' },
  { key: '动态', label: '动态' },
  { key: '科技', label: '科技' },
  { key: '图案', label: '图案' },
];

export const BackgroundModal: React.FC<Props> = ({ open, selectedId, onSelect, onClose }) => {
  const handleSelect = (styleId: string) => {
    onSelect(styleId);
    onClose();
  };

  const tabItems = categories.map(cat => ({
    key: cat.key,
    label: cat.label,
    children: (
      <Row gutter={[16, 16]}>
        {getPresetsByCategory(cat.key).map(preset => (
          <Col key={preset.id} span={6}>
            <BackgroundPreview
              preset={preset}
              selected={selectedId === preset.id}
              onClick={() => handleSelect(preset.id)}
            />
          </Col>
        ))}
      </Row>
    ),
  }));

  // 添加"全部"标签
  tabItems.unshift({
    key: 'all',
    label: '全部',
    children: (
      <Row gutter={[16, 16]}>
        {BACKGROUND_PRESETS.map(preset => (
          <Col key={preset.id} span={6}>
            <BackgroundPreview
              preset={preset}
              selected={selectedId === preset.id}
              onClick={() => handleSelect(preset.id)}
            />
          </Col>
        ))}
      </Row>
    ),
  });

  return (
    <Modal
      title="选择背景样式"
      open={open}
      onCancel={onClose}
      width={800}
      footer={null}
    >
      <Tabs items={tabItems} />
    </Modal>
  );
};

export default BackgroundModal;
