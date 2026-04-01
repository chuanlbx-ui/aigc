import { Button, Card, Input, Select, Space, Tabs } from 'antd';
import { PLATFORM_NAMES } from '../../../stores/article';

interface Props {
  platform: string;
  column: string;
  styleTemplates: any[];
  selectedStyleId: string;
  styleUrl: string;
  styleContent: string;
  styleAnalysis: any;
  loading: boolean;
  onStyleIdChange: (v: string) => void;
  onStyleUrlChange: (v: string) => void;
  onStyleContentChange: (v: string) => void;
  onAnalyze: () => Promise<void>;
  onConfirmTemplate: () => Promise<void>;
  onConfirmDefault: () => Promise<void>;
  onSaveAnalysis: () => Promise<void>;
}

export default function StepStyle({
  platform, column, styleTemplates, selectedStyleId,
  styleUrl, styleContent, styleAnalysis, loading,
  onStyleIdChange, onStyleUrlChange, onStyleContentChange,
  onAnalyze, onConfirmTemplate, onConfirmDefault, onSaveAnalysis,
}: Props) {
  return (
    <Tabs
      defaultActiveKey="template"
      items={[
        {
          key: 'template',
          label: '选择风格模板',
          children: (
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>
                选择一个预设风格模板，AI 将按此风格生成文章
              </div>
              <Select
                style={{ width: '100%' }}
                placeholder="选择风格模板"
                value={selectedStyleId || undefined}
                onChange={onStyleIdChange}
              >
                {styleTemplates.map(t => (
                  <Select.Option key={t.id} value={t.id}>
                    <div>
                      <strong>{t.name}</strong>
                      <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>{t.description}</span>
                    </div>
                  </Select.Option>
                ))}
              </Select>
              {selectedStyleId && styleTemplates.find(t => t.id === selectedStyleId) && (
                <Card size="small" style={{ background: '#f6ffed', marginTop: 8 }}>
                  <div style={{ fontWeight: 500, marginBottom: 8 }}>
                    {styleTemplates.find(t => t.id === selectedStyleId)?.name} 风格特点：
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {styleTemplates.find(t => t.id === selectedStyleId)?.characteristics?.map((c: string, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </Card>
              )}
              <Button type="primary" disabled={!selectedStyleId} onClick={onConfirmTemplate}>
                确认选择
              </Button>
            </Space>
          ),
        },
        {
          key: 'learn',
          label: '从文章学习',
          children: (
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>
                输入文章链接或粘贴内容，AI 将分析其写作风格供你参考
              </div>
              <Input
                placeholder="输入文章链接（如公众号文章链接）"
                value={styleUrl}
                onChange={e => onStyleUrlChange(e.target.value)}
              />
              <div style={{ textAlign: 'center', color: '#999' }}>或</div>
              <Input.TextArea
                placeholder="直接粘贴文章内容..."
                value={styleContent}
                onChange={e => onStyleContentChange(e.target.value)}
                autoSize={{ minRows: 3, maxRows: 6 }}
              />
              <Button
                type="primary"
                onClick={onAnalyze}
                loading={loading}
                disabled={!styleUrl && !styleContent}
              >
                分析风格
              </Button>
              {styleAnalysis && (
                <Card size="small" style={{ background: '#f0f5ff', marginTop: 8 }}>
                  <div style={{ fontWeight: 500, marginBottom: 8 }}>风格分析结果：</div>
                  {styleAnalysis.raw ? (
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>{styleAnalysis.raw}</pre>
                  ) : (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div><strong>风格类型：</strong>{styleAnalysis.styleType}</div>
                      <div><strong>总结：</strong>{styleAnalysis.summary}</div>
                      {styleAnalysis.techniques?.length > 0 && (
                        <div>
                          <strong>写作技巧：</strong>
                          <ul style={{ margin: '4px 0 0 0', paddingLeft: 20 }}>
                            {styleAnalysis.techniques.map((t: string, i: number) => (
                              <li key={i}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </Space>
                  )}
                  <Button type="primary" size="small" style={{ marginTop: 12 }} onClick={onSaveAnalysis}>
                    使用此风格
                  </Button>
                </Card>
              )}
            </Space>
          ),
        },
        {
          key: 'default',
          label: '默认风格',
          children: (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Card size="small" style={{ background: '#f5f5f5' }}>
                <Space direction="vertical">
                  <div><strong>平台：</strong>{PLATFORM_NAMES[platform]}</div>
                  <div><strong>栏目：</strong>{column}</div>
                </Space>
              </Card>
              <div style={{ color: '#666', fontSize: 12 }}>使用平台和栏目的默认风格设置</div>
              <Button type="primary" onClick={onConfirmDefault}>确认并继续</Button>
            </Space>
          ),
        },
      ]}
    />
  );
}
