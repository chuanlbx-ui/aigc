import { Space } from 'antd';
import WebSearchPanel from '../WebSearchPanel';

interface Props {
  serviceId?: string;
  onComplete: (content: string) => Promise<void>;
}

export default function StepSearch({ serviceId, onComplete }: Props) {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <WebSearchPanel
        serviceId={serviceId}
        onResultsChange={async (_results, content) => {
          await onComplete(content);
        }}
      />
    </Space>
  );
}
