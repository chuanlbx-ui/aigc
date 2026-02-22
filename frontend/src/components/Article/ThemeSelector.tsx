import { useEffect } from 'react';
import { Select, Space, Typography } from 'antd';
import { FormatPainterOutlined } from '@ant-design/icons';
import { MARKDOWN_THEMES, getAllThemeStyles, getThemeClassName } from './MarkdownThemes';

const { Text } = Typography;

interface ThemeSelectorProps {
  value?: string;
  onChange?: (themeId: string) => void;
}

export default function ThemeSelector({ value = 'default', onChange }: ThemeSelectorProps) {
  // 注入主题样式
  useEffect(() => {
    const styleId = 'md-theme-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = getAllThemeStyles();
      document.head.appendChild(style);
    }
  }, []);

  const currentTheme = MARKDOWN_THEMES.find(t => t.id === value);

  return (
    <Space>
      <FormatPainterOutlined />
      <Text>排版主题：</Text>
      <Select
        value={value}
        onChange={onChange}
        style={{ width: 140 }}
        options={MARKDOWN_THEMES.map(t => ({
          value: t.id,
          label: t.name,
        }))}
      />
      {currentTheme && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {currentTheme.description}
        </Text>
      )}
    </Space>
  );
}

// 导出工具函数
export { getThemeClassName, getAllThemeStyles };
