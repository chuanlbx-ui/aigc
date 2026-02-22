import { useState } from 'react';
import { Card, Space, Tag, List, Typography, Alert, Button, message } from 'antd';
import { CheckCircleOutlined, WarningOutlined, ThunderboltOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

// 降AI味检查项（带自动修复规则）
const ANTI_AI_ITEMS = [
  { pattern: '在当今时代', action: '删除或替换为具体时间', replacement: '' },
  { pattern: '综上所述', action: '删除，直接给结论', replacement: '' },
  { pattern: '值得注意的是', action: '删除，直接说重点', replacement: '' },
  { pattern: '不是.*而是', action: '拆解为两个独立句子', replacement: null }, // 需要手动处理
  { pattern: '显著提升', action: '替换为具体数字', replacement: '提升' },
  { pattern: '充分利用', action: '替换为"用好"', replacement: '用好' },
  { pattern: '进行.*操作', action: '简化为动词', replacement: null }, // 需要手动处理
  { pattern: '相关.*工作', action: '具体说明是什么工作', replacement: null }, // 需要手动处理
];

interface AIReviewPanelProps {
  content: string;
  reviewResult: string;
  onApplyFix?: (fixedContent: string) => void;
}

export default function AIReviewPanel({
  content,
  reviewResult,
  onApplyFix
}: AIReviewPanelProps) {
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);

  // 检测内容中的AI味问题
  const detectIssues = () => {
    const issues: Array<{ pattern: string; action: string; found: string[] }> = [];

    ANTI_AI_ITEMS.forEach(item => {
      const regex = new RegExp(item.pattern, 'g');
      const matches = content.match(regex);
      if (matches && matches.length > 0) {
        issues.push({
          pattern: item.pattern,
          action: item.action,
          found: matches,
        });
      }
    });

    return issues;
  };

  const issues = detectIssues();

  const toggleCheck = (pattern: string) => {
    setCheckedItems(prev =>
      prev.includes(pattern)
        ? prev.filter(p => p !== pattern)
        : [...prev, pattern]
    );
  };

  // 一键应用所有可自动修复的问题
  const handleAutoFix = () => {
    if (!onApplyFix) {
      message.warning('未提供修复回调函数');
      return;
    }

    setApplying(true);
    let fixedContent = content;
    let fixCount = 0;

    // 遍历所有检测到的问题
    issues.forEach(issue => {
      const item = ANTI_AI_ITEMS.find(i => i.pattern === issue.pattern);
      if (item && item.replacement !== null) {
        // 可以自动修复的问题
        const regex = new RegExp(item.pattern, 'g');
        const beforeCount = (fixedContent.match(regex) || []).length;
        fixedContent = fixedContent.replace(regex, item.replacement);
        const afterCount = (fixedContent.match(regex) || []).length;
        fixCount += beforeCount - afterCount;
      }
    });

    setTimeout(() => {
      setApplying(false);
      if (fixCount > 0) {
        onApplyFix(fixedContent);
        message.success(`已自动修复 ${fixCount} 处问题`);
      } else {
        message.info('没有可自动修复的问题');
      }
    }, 500);
  };

  return (
    <Card title="降AI味检查" size="small">
      {issues.length === 0 ? (
        <Alert
          type="success"
          message="未检测到明显的AI味问题"
          icon={<CheckCircleOutlined />}
          showIcon
        />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Alert
              type="warning"
              message={`检测到 ${issues.length} 类问题`}
              showIcon
              style={{ flex: 1 }}
            />
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={handleAutoFix}
              loading={applying}
              disabled={!onApplyFix}
            >
              一键修复
            </Button>
          </Space>
          <List
            size="small"
            dataSource={issues}
            renderItem={item => (
              <List.Item
                style={{
                  background: checkedItems.includes(item.pattern) ? '#f6ffed' : '#fff',
                  padding: '8px 12px',
                  marginBottom: 4,
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
                onClick={() => toggleCheck(item.pattern)}
              >
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Space>
                    {checkedItems.includes(item.pattern) ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : (
                      <WarningOutlined style={{ color: '#faad14' }} />
                    )}
                    <Text code>{item.pattern}</Text>
                    <Tag color="orange">{item.found.length}处</Tag>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    建议：{item.action}
                  </Text>
                </Space>
              </List.Item>
            )}
          />
        </Space>
      )}

      {reviewResult && (
        <div style={{ marginTop: 16 }}>
          <Text strong>AI 审校结果：</Text>
          <Paragraph
            style={{
              background: '#fafafa',
              padding: 12,
              borderRadius: 4,
              marginTop: 8,
              whiteSpace: 'pre-wrap',
              maxHeight: 300,
              overflow: 'auto',
            }}
          >
            {reviewResult}
          </Paragraph>
        </div>
      )}
    </Card>
  );
}
