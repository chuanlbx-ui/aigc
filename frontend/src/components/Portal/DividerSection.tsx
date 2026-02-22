import './DividerSection.css';

interface DividerSectionProps {
  config: {
    height?: number;
    color?: string;
    margin?: number;
  };
}

export default function DividerSection({ config }: DividerSectionProps) {
  const { height = 1, color = '#e8e8e8', margin = 16 } = config;

  return (
    <div
      className="divider-section"
      style={{
        height: `${height}px`,
        backgroundColor: color,
        margin: `${margin}px 0`,
      }}
    />
  );
}
