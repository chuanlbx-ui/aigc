import React, { useState, useEffect } from 'react';
import { Switch, Tooltip, Space } from 'antd';
import { CloudOutlined, DesktopOutlined } from '@ant-design/icons';
import { getCurrentApiType, switchApiUrl } from '../api/config';

export const ApiSwitcher: React.FC = () => {
  const [apiType, setApiType] = useState<'local' | 'cloud'>(getCurrentApiType() as 'local' | 'cloud');

  useEffect(() => {
    setApiType(getCurrentApiType() as 'local' | 'cloud');
  }, []);

  const handleSwitch = (checked: boolean) => {
    const newType = checked ? 'cloud' : 'local';
    setApiType(newType);
    switchApiUrl(newType);
  };

  return (
    <Tooltip title={apiType === 'cloud' ? '使用云端 API (aicg-api.wenbita.cn)' : '使用本地 API (localhost:3001)'}>
      <Space size="small" style={{ cursor: 'pointer' }}>
        <DesktopOutlined style={{ color: apiType === 'local' ? '#1890ff' : '#999', fontSize: 14 }} />
        <Switch
          size="small"
          checked={apiType === 'cloud'}
          onChange={handleSwitch}
          checkedChildren={<CloudOutlined />}
          unCheckedChildren={<DesktopOutlined />}
        />
        <span style={{ fontSize: 12, color: '#666' }}>
          {apiType === 'cloud' ? '云端' : '本地'}
        </span>
      </Space>
    </Tooltip>
  );
};

export default ApiSwitcher;
