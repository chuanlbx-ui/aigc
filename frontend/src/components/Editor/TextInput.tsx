import { Input } from 'antd';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function TextInput({ value, onChange }: TextInputProps) {
  return (
    <Input.TextArea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="请输入口播文字内容..."
      rows={6}
      showCount
      maxLength={5000}
    />
  );
}
