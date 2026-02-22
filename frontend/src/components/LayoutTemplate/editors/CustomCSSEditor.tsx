/**
 * 自定义 CSS 编辑器
 */

import React from 'react';
import { Input, Typography } from 'antd';

const { TextArea } = Input;
const { Text } = Typography;

interface CustomCSSEditorProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  themeId?: string;
}

export const CustomCSSEditor: React.FC<CustomCSSEditorProps> = ({
  value,
  onChange,
  themeId = 'preview'
}) => {
  return (
    <div>
      <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
        使用 <code>.md-theme-{themeId}</code> 作为选择器前缀
      </Text>
      <TextArea
        value={value || ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder={`/* 自定义 CSS */
.md-theme-${themeId} h1 {
  /* 自定义标题样式 */
}

.md-theme-${themeId} .custom-class {
  /* 自定义类样式 */
}`}
        rows={12}
        style={{ fontFamily: 'monospace', fontSize: 13 }}
      />
    </div>
  );
};

export default CustomCSSEditor;
