import { Card, Input, Tabs } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import WebSearchPanel from '../WebSearchPanel';

interface Props {
  materialsQuery: string;
  materialsResult: any[];
  loading: boolean;
  serviceId?: string;
  onQueryChange: (v: string) => void;
  onSearch: () => Promise<void>;
  onWebSearchComplete: (results: any[], content: string) => Promise<void>;
}

export default function StepMaterials({
  materialsQuery, materialsResult, loading, serviceId,
  onQueryChange, onSearch, onWebSearchComplete,
}: Props) {
  return (
    <Tabs
      defaultActiveKey="knowledge"
      items={[
        {
          key: 'knowledge',
          label: '知识库搜索',
          children: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Input.Search
                placeholder="搜索知识库素材"
                value={materialsQuery}
                onChange={e => onQueryChange(e.target.value)}
                onSearch={onSearch}
                enterButton="搜索"
                loading={loading}
              />
              {materialsResult.length > 0 && (
                <div style={{ maxHeight: 300, overflow: 'auto' }}>
                  {materialsResult.map((m, i) => (
                    <Card key={i} size="small" style={{ marginBottom: 8 }}>
                      <div style={{ fontWeight: 500 }}>{m.title}</div>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                        {m.excerpt?.substring(0, 200)}...
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ),
        },
        {
          key: 'web',
          label: <span><GlobalOutlined /> AI 联网搜索</span>,
          children: (
            <WebSearchPanel serviceId={serviceId} onResultsChange={onWebSearchComplete} />
          ),
        },
      ]}
    />
  );
}
