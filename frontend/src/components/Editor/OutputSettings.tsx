import { Form, Radio, Select } from 'antd';

interface OutputSettingsProps {
  orientation: 'landscape' | 'portrait';
  resolution: '1080p' | '720p';
  onChange: (settings: Partial<OutputSettingsProps>) => void;
}

export default function OutputSettings({ orientation, resolution, onChange }: OutputSettingsProps) {
  return (
    <Form layout="vertical">
      <Form.Item label="视频方向">
        <Radio.Group
          value={orientation}
          onChange={(e) => onChange({ orientation: e.target.value })}
        >
          <Radio.Button value="landscape">横屏 (16:9)</Radio.Button>
          <Radio.Button value="portrait">竖屏 (9:16)</Radio.Button>
        </Radio.Group>
      </Form.Item>
      <Form.Item label="分辨率">
        <Select
          value={resolution}
          onChange={(value) => onChange({ resolution: value })}
          options={[
            { value: '1080p', label: '1080p (1920x1080)' },
            { value: '720p', label: '720p (1280x720)' },
          ]}
        />
      </Form.Item>
    </Form>
  );
}
