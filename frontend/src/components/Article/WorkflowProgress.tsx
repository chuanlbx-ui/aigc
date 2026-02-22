import { Steps, Card, Modal, Typography } from 'antd';
import { CheckCircleOutlined, LoadingOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useState } from 'react';

const { Paragraph } = Typography;

interface WorkflowProgressProps {
  currentStep: number; // 0-8
  completedSteps: number[]; // 已完成的步骤索引
  onStepClick?: (step: number) => void; // 点击步骤回调
}

// 工作流步骤定义（与后端保持一致）
const WORKFLOW_STEPS = [
  {
    title: '理解需求',
    key: 'understand',
    required: false,
    description: '明确写作目标和受众',
    detail: '分析文章的目标读者、写作目的和预期效果。明确平台特点和栏目要求。'
  },
  {
    title: '选题讨论',
    key: 'topic',
    required: true,
    description: '确定切入角度',
    detail: '⭐ 必做步骤。分析选题的价值、角度和可行性。确定文章的核心观点和论述方向。'
  },
  {
    title: '信息搜索',
    key: 'search',
    required: false,
    description: '搜索相关资料',
    detail: '通过联网搜索获取最新信息、数据和案例。确保信息的时效性和准确性。'
  },
  {
    title: '协作文档',
    key: 'collaborate',
    required: false,
    description: '整理素材和要点',
    detail: '生成文章大纲，整理关键论点和素材。为创作初稿做好准备。'
  },
  {
    title: '学习风格',
    key: 'style',
    required: false,
    description: '加载栏目风格指南',
    detail: '学习目标平台和栏目的写作风格、语言特点和格式要求。'
  },
  {
    title: '素材库',
    key: 'materials',
    required: true,
    description: '选择知识库素材',
    detail: '⭐ 必做步骤。从知识库中选择相关素材，确保内容的专业性和深度。'
  },
  {
    title: '等待数据',
    key: 'waiting',
    required: false,
    description: '等待必要数据',
    detail: '等待用户提供必要的数据、案例或其他补充信息。'
  },
  {
    title: '创作初稿',
    key: 'draft',
    required: false,
    description: 'AI 辅助生成初稿',
    detail: '基于前期准备，使用 AI 辅助生成文章初稿。'
  },
  {
    title: '三遍审校',
    key: 'review',
    required: true,
    description: '降AI味审校',
    detail: '⭐ 必做步骤。三遍审校：降AI味 → 逻辑事实 → 可读性。确保文章真诚、准确、易读。'
  },
];

export default function WorkflowProgress({ currentStep, completedSteps, onStepClick }: WorkflowProgressProps) {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

  // 点击步骤标题查看详情
  const handleStepTitleClick = (index: number) => {
    setSelectedStepIndex(index);
    setShowDetailModal(true);
  };

  const items = WORKFLOW_STEPS.map((step, index) => {
    const isCompleted = completedSteps.includes(index);
    const isCurrent = currentStep === index;
    const isRequired = step.required;

    let status: 'wait' | 'process' | 'finish' | 'error' = 'wait';
    if (isCompleted) {
      status = 'finish';
    } else if (isCurrent) {
      status = 'process';
    }

    return {
      title: (
        <span
          onClick={(e) => {
            e.stopPropagation();
            handleStepTitleClick(index);
          }}
          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          {step.title}
          {isRequired && <span style={{ color: '#ff4d4f' }}>⭐</span>}
          <QuestionCircleOutlined style={{ fontSize: 12, color: '#999' }} />
        </span>
      ),
      description: step.description,
      status,
      icon: isCompleted ? <CheckCircleOutlined /> : isCurrent ? <LoadingOutlined /> : undefined,
    };
  });

  // 当前步骤信息
  const currentStepInfo = WORKFLOW_STEPS[currentStep];

  return (
    <div style={{ marginBottom: 16 }}>
      {/* 当前步骤说明卡片 - 更紧凑 */}
      {currentStepInfo && (
        <Card
          size="small"
          style={{
            marginBottom: 12,
            background: '#e6f7ff',
            borderColor: '#91d5ff',
            cursor: 'pointer'
          }}
          onClick={() => handleStepTitleClick(currentStep)}
          bodyStyle={{ padding: '8px 12px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 500 }}>
                当前步骤：{currentStepInfo.title}
                {currentStepInfo.required && <span style={{ color: '#ff4d4f', marginLeft: 4 }}>⭐ 必做</span>}
              </span>
              <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                {currentStepInfo.description}
              </div>
            </div>
            <QuestionCircleOutlined style={{ fontSize: 16, color: '#1890ff' }} />
          </div>
        </Card>
      )}

      {/* 进度条 - 更紧凑 */}
      <div style={{ padding: '12px 0', background: '#fafafa', borderRadius: 8 }}>
        <Steps
          current={currentStep}
          items={items}
          size="small"
          style={{ maxWidth: 1200, margin: '0 auto' }}
          onChange={onStepClick}
        />
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: '#666' }}>
          进度：{completedSteps.length}/{WORKFLOW_STEPS.length} 步骤
          {' | '}
          必做步骤：{completedSteps.filter(i => WORKFLOW_STEPS[i]?.required).length}/
          {WORKFLOW_STEPS.filter(s => s.required).length}
        </div>
      </div>

      {/* 步骤详情弹窗 */}
      <Modal
        title={selectedStepIndex !== null ? WORKFLOW_STEPS[selectedStepIndex]?.title : ''}
        open={showDetailModal}
        onCancel={() => setShowDetailModal(false)}
        footer={null}
        width={500}
      >
        {selectedStepIndex !== null && WORKFLOW_STEPS[selectedStepIndex] && (
          <div>
            <Paragraph>
              <strong>步骤说明：</strong>
              {WORKFLOW_STEPS[selectedStepIndex].description}
            </Paragraph>
            <Paragraph>
              {WORKFLOW_STEPS[selectedStepIndex].detail}
            </Paragraph>
            {WORKFLOW_STEPS[selectedStepIndex].required && (
              <Paragraph style={{ color: '#ff4d4f', marginTop: 12 }}>
                ⭐ 这是必做步骤，不可跳过
              </Paragraph>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
