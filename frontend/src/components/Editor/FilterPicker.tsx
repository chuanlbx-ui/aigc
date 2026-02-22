import { Card, Checkbox, Row, Col, Typography } from 'antd';
import type { FilterConfig, FilterType } from '../../stores/editor';

const { Text } = Typography;

interface FilterPreset {
  type: FilterType;
  name: string;
  description: string;
  preview: string; // CSS filter 预览
}

const FILTER_PRESETS: FilterPreset[] = [
  { type: 'warm', name: '暖色调', description: '温暖柔和', preview: 'sepia(0.3) saturate(1.2)' },
  { type: 'cool', name: '冷色调', description: '清冷现代', preview: 'saturate(0.9) hue-rotate(10deg)' },
  { type: 'vintage', name: '复古', description: '怀旧风格', preview: 'sepia(0.4) contrast(1.1)' },
  { type: 'sharpen', name: '锐化', description: '清晰锐利', preview: 'contrast(1.2) brightness(1.05)' },
  { type: 'vignette', name: '暗角', description: '聚焦中心', preview: 'brightness(0.95)' },
  { type: 'grayscale', name: '黑白', description: '经典单色', preview: 'grayscale(1)' },
  { type: 'sepia', name: '褐色', description: '老照片', preview: 'sepia(0.8)' },
  { type: 'blur', name: '柔焦', description: '梦幻模糊', preview: 'blur(1px) brightness(1.05)' },
];

interface FilterPickerProps {
  filters?: FilterConfig[];
  onChange: (filters: FilterConfig[]) => void;
}

export default function FilterPicker({ filters = [], onChange }: FilterPickerProps) {
  const selectedTypes = filters.map(f => f.type);

  const handleToggle = (type: FilterType, checked: boolean) => {
    if (checked) {
      onChange([...filters, { type, intensity: 1 }]);
    } else {
      onChange(filters.filter(f => f.type !== type));
    }
  };

  return (
    <div>
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        选择要应用的滤镜效果（可多选）
      </Text>
      <Row gutter={[12, 12]}>
        {FILTER_PRESETS.map(preset => (
          <Col span={12} key={preset.type}>
            <Card
              size="small"
              hoverable
              style={{
                borderColor: selectedTypes.includes(preset.type) ? '#1890ff' : undefined,
                background: selectedTypes.includes(preset.type) ? '#e6f7ff' : undefined,
              }}
              bodyStyle={{ padding: 12 }}
              onClick={() => handleToggle(preset.type, !selectedTypes.includes(preset.type))}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Checkbox checked={selectedTypes.includes(preset.type)} />
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 6,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    filter: preset.preview,
                  }}
                />
                <div>
                  <div style={{ fontWeight: 500 }}>{preset.name}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>{preset.description}</Text>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
