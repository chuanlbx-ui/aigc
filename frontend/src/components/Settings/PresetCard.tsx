/**
 * 预设模板卡片组件
 */

import React, { useState } from 'react';
import { Card, Tag, Button, message } from 'antd';
import { DownloadOutlined, CheckCircleOutlined } from '@ant-design/icons';

interface PresetTemplate {
  id: string;
  name: string;
  description: string;
  platform: string;
  column: string;
}

interface PresetCardProps {
  preset: PresetTemplate;
  onInstall: () => void;
}

const PresetCard: React.FC<PresetCardProps> = ({ preset, onInstall }) => {
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const response = await fetch(`/api/workflow-templates/presets/${preset.id}/install`, {
        method: 'POST',
      });
      if (response.ok) {
        message.success('安装成功');
        setInstalled(true);
        onInstall();
      } else {
        message.error('安装失败');
      }
    } catch (error) {
      message.error('安装失败');
    } finally {
      setInstalling(false);
    }
  };

  return (
    <Card
      hoverable
      style={{ height: '100%' }}
      actions={[
        <Button
          type={installed ? 'default' : 'primary'}
          icon={installed ? <CheckCircleOutlined /> : <DownloadOutlined />}
          size="small"
          loading={installing}
          onClick={handleInstall}
          disabled={installed}
        >
          {installed ? '已安装' : '安装'}
        </Button>,
      ]}
    >
      <h4 style={{ marginBottom: '8px' }}>{preset.name}</h4>
      <p style={{ color: '#666', fontSize: '12px', marginBottom: '12px' }}>
        {preset.description}
      </p>
      <div>
        <Tag color="blue">{preset.platform}</Tag>
        <Tag color="green">{preset.column}</Tag>
      </div>
    </Card>
  );
};

export default PresetCard;
