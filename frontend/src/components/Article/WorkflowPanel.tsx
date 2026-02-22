import { useState, useCallback, useEffect } from 'react';
import {
  Card, Button, Space, Input, message,
  Collapse, Tag, Divider, Tabs, Tooltip, Modal, Select
} from 'antd';
import {
  CheckCircleOutlined, SaveOutlined,
  RocketOutlined, SearchOutlined, EditOutlined, PictureOutlined,
  SoundOutlined, GlobalOutlined,
  BulbOutlined, ReadOutlined, SwapOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { api } from '../../api/client';
import { Article, PLATFORM_NAMES } from '../../stores/article';
import SmartImagePanel from './SmartImagePanel';
import ScriptPanel from './ScriptPanel';
import EditableResult from './EditableResult';
import AIModelSelector from '../common/AIModelSelector';
import WebSearchPanel from './WebSearchPanel';
import { useWorkflowState } from '../../hooks/useWorkflowState';

const { TextArea } = Input;
void TextArea; // 保留，可能在模板中使用

interface WorkflowPanelProps {
  article: Article;
  content: string;
  onContentChange: (content: string) => void;
  onSave: () => Promise<void>;
  onSaveWithNote?: (content: string, changeNote: string) => Promise<void>;
  onCoverChange?: (coverUrl: string) => void;
  onTemplateChange?: (templateId: string) => void;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'system' | 'custom';
  platform?: string;
  column?: string;
}

// 统一的步骤配置（按正确顺序，共8步）
const WORKFLOW_STEPS = [
  { key: 'understand', stepNum: 1, label: '理解需求', icon: BulbOutlined, description: '明确写作目标、受众和关键点', required: false },
  { key: 'search', stepNum: 2, label: '信息搜索', icon: GlobalOutlined, description: '使用 AI 联网搜索获取最新信息', required: false },
  { key: 'topic', stepNum: 3, label: '选题讨论', icon: RocketOutlined, description: '确定切入角度和选题方向', required: true },
  { key: 'outline', stepNum: 4, label: '大纲生成', icon: EditOutlined, description: '生成文章结构大纲', required: false },
  { key: 'style', stepNum: 5, label: '学习风格', icon: ReadOutlined, description: '确认平台和栏目写作风格', required: false },
  { key: 'materials', stepNum: 6, label: '素材搜索', icon: SearchOutlined, description: '搜索知识库和网络素材', required: false },
  { key: 'draft', stepNum: 7, label: '生成初稿', icon: EditOutlined, description: '基于大纲和素材生成文章', required: true },
  { key: 'review', stepNum: 8, label: 'AI 审校', icon: CheckCircleOutlined, description: '降AI味、逻辑事实、可读性审校', required: true },
];

// 步骤 key 到索引的映射
const STEP_KEY_TO_INDEX: Record<string, number> = {};
WORKFLOW_STEPS.forEach((step, index) => {
  STEP_KEY_TO_INDEX[step.key] = index;
});

export default function WorkflowPanel({
  article, content, onContentChange, onSave: _onSave, onSaveWithNote, onCoverChange, onTemplateChange
}: WorkflowPanelProps) {
  void _onSave; // 保留接口

  // 每个步骤独立的 loading 状态
  const [loadingSteps, setLoadingSteps] = useState<Record<string, boolean>>({});
  const setStepLoading = (step: string, loading: boolean) => {
    setLoadingSteps(prev => ({ ...prev, [step]: loading }));
  };

  // 折叠面板当前展开的 key
  const [activeCollapseKey, setActiveCollapseKey] = useState<string | string[]>(['topic']);

  // 模板相关状态
  const [currentTemplate, setCurrentTemplate] = useState<WorkflowTemplate | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<WorkflowTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(article.templateId);

  // AI 服务选择
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>();

  // 使用工作流状态 Hook
  const {
    completedSteps,
    workflowData,
    setCurrentStep,
    markStepCompleted,
    saveWorkflow,
  } = useWorkflowState(article.id);

  // 各步骤数据（从 workflowData 初始化）
  const [topicInput, setTopicInput] = useState(workflowData.topicDiscussion?.input || article.title);
  const [topicResult, setTopicResult] = useState(workflowData.topicDiscussion?.analysis || '');
  const [outlineResult, setOutlineResult] = useState(workflowData.collaboration?.outline || '');
  const [materialsQuery, setMaterialsQuery] = useState('');
  const [materialsResult, setMaterialsResult] = useState<any[]>(workflowData.materials?.knowledgeResults || []);
  const [webSearchContent, setWebSearchContent] = useState(workflowData.materials?.webSearchContent || '');
  const [reviewResult, setReviewResult] = useState(workflowData.review?.reviewResult || '');
  const [hkrResult, setHkrResult] = useState<any>(workflowData.review?.hkrScore || null);
  const [improving, setImproving] = useState(false);
  const [optimizeInstruction, setOptimizeInstruction] = useState('');
  const [optimizing, setOptimizing] = useState(false);

  // 新增步骤的状态
  const [understandingNotes, setUnderstandingNotes] = useState(workflowData.understanding?.notes || '');
  const [searchInfo, setSearchInfo] = useState(workflowData.search?.content || '');
  void searchInfo; // 用于保存工作流状态

  // 风格学习相关状态
  const [styleTemplates, setStyleTemplates] = useState<any[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string>(workflowData.style?.templateId || '');
  const [styleUrl, setStyleUrl] = useState('');
  const [styleContent, setStyleContent] = useState('');
  const [styleAnalysis, setStyleAnalysis] = useState<any>(workflowData.style?.analysis || null);

  // 保存详情弹窗状态
  const [showSaveDetail, setShowSaveDetail] = useState(false);
  const [savedSteps, setSavedSteps] = useState<string[]>([]);

  // 加载当前模板和可用模板列表
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        // 加载可用模板列表
        const res = await api.get('/workflow-templates', {
          params: { platform: article.platform }
        });
        setAvailableTemplates(res.data.templates || []);

        // 如果文章有关联模板，加载模板详情
        if (article.templateId) {
          const templateRes = await api.get(`/workflow-templates/${article.templateId}`);
          setCurrentTemplate(templateRes.data);
        }
      } catch (error) {
        console.error('加载模板失败:', error);
      }
    };
    loadTemplates();
  }, [article.templateId, article.platform]);

  // 加载风格模板列表
  useEffect(() => {
    const loadStyleTemplates = async () => {
      try {
        const res = await api.get('/articles/ai/style-templates');
        setStyleTemplates(res.data.templates || []);
      } catch (error) {
        console.error('加载风格模板失败:', error);
      }
    };
    loadStyleTemplates();
  }, []);

  // 风格分析（从链接或内容）
  const handleStyleAnalysis = async () => {
    if (!styleUrl && !styleContent) {
      message.warning('请输入文章链接或粘贴文章内容');
      return;
    }
    setStepLoading('style', true);
    try {
      const res = await api.post('/articles/ai/analyze-style', {
        url: styleUrl || undefined,
        content: styleContent || undefined,
        serviceId: selectedServiceId,
      });
      setStyleAnalysis(res.data.analysis);
      message.success('风格分析完成');
    } catch (error: any) {
      message.error(error.response?.data?.error || '分析失败');
    } finally {
      setStepLoading('style', false);
    }
  };

  // 选题讨论
  const handleTopicDiscussion = async () => {
    setStepLoading('topic', true);
    setCurrentStep(2); // 选题讨论是第3步（索引2）
    try {
      const res = await api.post('/articles/ai/topic-discussion', {
        topic: topicInput,
        platform: article.platform,
        column: article.column,
        serviceId: selectedServiceId,
        templateId: article.templateId,
      });
      setTopicResult(res.data.analysis);

      // 保存到工作流
      await markStepCompleted(2, {
        topicDiscussion: {
          input: topicInput,
          analysis: res.data.analysis,
        },
      });

      message.success('选题分析完成');
    } catch (error: any) {
      message.error(error.response?.data?.error || '分析失败');
    } finally {
      setStepLoading('topic', false);
    }
  };

  // 大纲生成
  const handleOutline = async () => {
    setStepLoading('outline', true);
    setCurrentStep(3); // 协作文档是第4步（索引3）
    try {
      const res = await api.post('/articles/ai/outline', {
        title: article.title,
        platform: article.platform,
        column: article.column,
        angle: topicResult ? '基于选题分析结果' : undefined,
        serviceId: selectedServiceId,
        templateId: article.templateId,
      });
      setOutlineResult(res.data.outline);

      // 保存到工作流
      await markStepCompleted(3, {
        collaboration: {
          outline: res.data.outline,
        },
      });

      message.success('大纲生成完成');
    } catch (error: any) {
      message.error(error.response?.data?.error || '生成失败');
    } finally {
      setStepLoading('outline', false);
    }
  };

  // 素材搜索（知识库）
  const handleSearchMaterials = async () => {
    if (!materialsQuery.trim()) {
      message.warning('请输入搜索关键词');
      return;
    }
    setStepLoading('materials', true);
    setCurrentStep(5); // 素材库是第6步（索引5）
    try {
      const res = await api.post('/articles/ai/search-knowledge', {
        query: materialsQuery,
        limit: 10,
      });
      setMaterialsResult(res.data.results);

      // 保存到工作流
      await markStepCompleted(5, {
        materials: {
          knowledgeResults: res.data.results,
          webSearchContent,
        },
      });

      message.success(`找到 ${res.data.results.length} 条素材`);
    } catch (error: any) {
      message.error(error.response?.data?.error || '搜索失败');
    } finally {
      setStepLoading('materials', false);
    }
  };

  // AI 联网搜索完成回调
  const handleWebSearchComplete = async (_results: any[], content: string) => {
    setWebSearchContent(content);
    setCurrentStep(5); // 素材库是第6步（索引5）

    // 保存到工作流
    await markStepCompleted(5, {
      materials: {
        knowledgeResults: materialsResult,
        webSearchContent: content,
      },
    });
  };

  // 生成初稿
  const handleDraft = async () => {
    if (!outlineResult) {
      message.warning('请先生成大纲');
      return;
    }
    setStepLoading('draft', true);
    setCurrentStep(6); // 创作初稿是第7步（索引6）
    try {
      const knowledgeMaterials = materialsResult
        .map(m => `【${m.title}】\n${m.excerpt}`)
        .join('\n\n');
      const allMaterials = [knowledgeMaterials, webSearchContent].filter(Boolean).join('\n\n---\n\n');
      const res = await api.post('/articles/ai/draft', {
        title: article.title,
        platform: article.platform,
        column: article.column,
        outline: outlineResult,
        materials: allMaterials || undefined,
        serviceId: selectedServiceId,
        templateId: article.templateId,
      });
      onContentChange(res.data.draft);

      // 立即保存并创建版本
      if (onSaveWithNote) {
        await onSaveWithNote(res.data.draft, 'AI 生成初稿');
      }

      // 保存到工作流
      await markStepCompleted(6, {
        draft: {
          content: res.data.draft,
        },
      });

      message.success('初稿生成完成，已填入编辑器');
    } catch (error: any) {
      message.error(error.response?.data?.error || '生成失败');
    } finally {
      setStepLoading('draft', false);
    }
  };

  // AI 审校
  const handleReview = async () => {
    if (!content.trim()) {
      message.warning('请先编写文章内容');
      return;
    }
    setStepLoading('review', true);
    setCurrentStep(7); // 三遍审校是第8步（索引7）
    try {
      const res = await api.post('/articles/ai/review', {
        content,
        serviceId: selectedServiceId,
        templateId: article.templateId,
      });
      setReviewResult(res.data.review);

      // 保存到工作流
      await markStepCompleted(7, {
        review: {
          reviewResult: res.data.review,
          hkrScore: hkrResult,
        },
      });

      message.success('审校完成');
    } catch (error: any) {
      message.error(error.response?.data?.error || '审校失败');
    } finally {
      setStepLoading('review', false);
    }
  };

  // HKR 评估
  const handleHKR = async () => {
    if (!content.trim()) {
      message.warning('请先编写文章内容');
      return;
    }
    setStepLoading('hkr', true);
    try {
      const res = await api.post('/articles/ai/hkr-evaluate', {
        content,
        serviceId: selectedServiceId,
        templateId: article.templateId,
      });
      setHkrResult(res.data.score || res.data.raw);
      message.success('HKR 评估完成');
    } catch (error: any) {
      message.error(error.response?.data?.error || '评估失败');
    } finally {
      setStepLoading('hkr', false);
    }
  };

  // HKR 改进 - 根据建议自动修改文章
  const handleHKRImprove = async () => {
    if (!hkrResult?.suggestions || hkrResult.suggestions.length === 0) {
      message.warning('没有可用的改进建议');
      return;
    }
    setImproving(true);
    try {
      const res = await api.post('/articles/ai/hkr-improve', {
        content,
        suggestions: hkrResult.suggestions,
        serviceId: selectedServiceId,
        templateId: article.templateId,
      });
      onContentChange(res.data.content);

      // 立即保存并创建版本
      if (onSaveWithNote) {
        await onSaveWithNote(res.data.content, 'HKR 评估改进');
      }

      message.success('文章已根据建议自动改进，已填入编辑器');
    } catch (error: any) {
      message.error(error.response?.data?.error || '改进失败');
    } finally {
      setImproving(false);
    }
  };

  // 内容优化
  const handleOptimize = async () => {
    if (!content.trim()) {
      message.warning('请先编写文章内容');
      return;
    }
    if (!optimizeInstruction.trim()) {
      message.warning('请输入优化指令');
      return;
    }
    setOptimizing(true);
    try {
      const res = await api.post('/articles/ai/optimize-content', {
        content,
        instruction: optimizeInstruction,
        serviceId: selectedServiceId,
        templateId: article.templateId,
      });
      onContentChange(res.data.content);

      // 立即保存并创建版本
      if (onSaveWithNote) {
        await onSaveWithNote(res.data.content, `内容优化: ${optimizeInstruction.substring(0, 20)}...`);
      }

      message.success('内容优化完成，已填入编辑器');
    } catch (error: any) {
      message.error(error.response?.data?.error || '优化失败');
    } finally {
      setOptimizing(false);
    }
  };

  // 保存工作流（带详情弹窗）
  const handleSaveWorkflow = async () => {
    await saveWorkflow();

    // 计算已保存的步骤
    const steps = [];
    if (workflowData.understanding) steps.push('理解需求');
    if (workflowData.search) steps.push('信息搜索');
    if (workflowData.topicDiscussion) steps.push('选题讨论');
    if (workflowData.collaboration) steps.push('大纲生成');
    if (workflowData.style) steps.push('学习风格');
    if (workflowData.materials) steps.push('素材库');
    if (workflowData.draft) steps.push('创作初稿');
    if (workflowData.review) steps.push('三遍审校');

    setSavedSteps(steps);
    setShowSaveDetail(true);
  };

  // 切换模板
  const handleTemplateChange = async () => {
    if (!selectedTemplateId) {
      message.warning('请选择一个模板');
      return;
    }
    try {
      // 更新文章的模板关联
      await api.put(`/articles/${article.id}`, {
        templateId: selectedTemplateId
      });

      // 加载新模板详情
      const templateRes = await api.get(`/workflow-templates/${selectedTemplateId}`);
      setCurrentTemplate(templateRes.data);

      // 通知父组件
      onTemplateChange?.(selectedTemplateId);

      setShowTemplateModal(false);
      message.success('模板切换成功');
    } catch (error: any) {
      message.error(error.response?.data?.error || '切换模板失败');
    }
  };

  // 步骤点击切换功能（通过折叠面板 key）
  const handleCollapseChange = useCallback((keys: string | string[]) => {
    setActiveCollapseKey(keys);

    // 更新当前步骤
    const keyArray = Array.isArray(keys) ? keys : [keys];
    if (keyArray.length > 0) {
      const stepIndex = STEP_KEY_TO_INDEX[keyArray[0]];
      if (stepIndex !== undefined) {
        setCurrentStep(stepIndex);
      }
    }
  }, [setCurrentStep]);

  // 生成步骤标题组件
  const renderStepLabel = (stepConfig: typeof WORKFLOW_STEPS[0], isCompleted: boolean) => {
    const Icon = stepConfig.icon;
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <Space>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            borderRadius: '50%',
            fontSize: 12,
            fontWeight: 500,
            background: isCompleted ? '#52c41a' : '#f0f0f0',
            color: isCompleted ? '#fff' : '#666',
          }}>
            {isCompleted ? <CheckCircleOutlined style={{ fontSize: 12 }} /> : stepConfig.stepNum}
          </span>
          <Icon />
          <span>{stepConfig.label}</span>
          {stepConfig.required && <Tag color="red" style={{ marginLeft: 4 }}>必做</Tag>}
        </Space>
        <Tooltip title={stepConfig.description}>
          <QuestionCircleOutlined style={{ color: '#999', cursor: 'help' }} />
        </Tooltip>
      </div>
    );
  };

  // 继续渲染部分...
  const collapseItems = [
    {
      key: 'understand',
      label: renderStepLabel(WORKFLOW_STEPS[0], completedSteps.includes(0)),
      children: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input.TextArea
            placeholder="写作目标：例如介绍新技术、分享经验、解决问题等"
            autoSize={{ minRows: 2, maxRows: 4 }}
            value={understandingNotes}
            onChange={e => setUnderstandingNotes(e.target.value)}
          />
          <Button
            type="primary"
            onClick={async () => {
              await markStepCompleted(0, {
                understanding: { notes: understandingNotes }
              });
              message.success('已保存需求理解');
            }}
          >
            保存并继续
          </Button>
        </Space>
      ),
    },
    {
      key: 'search',
      label: renderStepLabel(WORKFLOW_STEPS[1], completedSteps.includes(1)),
      children: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <WebSearchPanel
            serviceId={selectedServiceId}
            onResultsChange={async (_results, content) => {
              setSearchInfo(content);
              await markStepCompleted(1, {
                search: { content }
              });
            }}
          />
        </Space>
      ),
    },
    {
      key: 'topic',
      label: renderStepLabel(WORKFLOW_STEPS[2], completedSteps.includes(2)),
      children: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input
            placeholder="输入选题关键词"
            value={topicInput}
            onChange={e => setTopicInput(e.target.value)}
          />
          <Button type="primary" onClick={handleTopicDiscussion} loading={loadingSteps['topic']}>
            开始分析
          </Button>
          <EditableResult
            value={topicResult}
            onChange={setTopicResult}
            onRegenerate={handleTopicDiscussion}
            loading={loadingSteps['topic']}
          />
        </Space>
      ),
    },
    {
      key: 'outline',
      label: renderStepLabel(WORKFLOW_STEPS[3], completedSteps.includes(3)),
      children: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button type="primary" onClick={handleOutline} loading={loadingSteps['outline']}>
            生成大纲
          </Button>
          <EditableResult
            value={outlineResult}
            onChange={setOutlineResult}
            onRegenerate={handleOutline}
            loading={loadingSteps['outline']}
          />
        </Space>
      ),
    },
    {
      key: 'style',
      label: renderStepLabel(WORKFLOW_STEPS[4], completedSteps.includes(4)),
      children: (
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
                    onChange={setSelectedStyleId}
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
                  <Button
                    type="primary"
                    disabled={!selectedStyleId}
                    onClick={async () => {
                      const template = styleTemplates.find(t => t.id === selectedStyleId);
                      await markStepCompleted(4, {
                        style: {
                          platform: article.platform,
                          column: article.column,
                          templateId: selectedStyleId,
                          templateName: template?.name,
                          analysis: {
                            styleType: template?.name,
                            summary: template?.description,
                            techniques: template?.characteristics,
                          }
                        }
                      });
                      setStyleAnalysis({
                        styleType: template?.name,
                        summary: template?.description,
                        techniques: template?.characteristics,
                      });
                      message.success('已选择风格模板');
                    }}
                  >
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
                    onChange={e => setStyleUrl(e.target.value)}
                  />
                  <div style={{ textAlign: 'center', color: '#999' }}>或</div>
                  <Input.TextArea
                    placeholder="直接粘贴文章内容..."
                    value={styleContent}
                    onChange={e => setStyleContent(e.target.value)}
                    autoSize={{ minRows: 3, maxRows: 6 }}
                  />
                  <Button
                    type="primary"
                    onClick={handleStyleAnalysis}
                    loading={loadingSteps['style']}
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
                      <Button
                        type="primary"
                        size="small"
                        style={{ marginTop: 12 }}
                        onClick={async () => {
                          await markStepCompleted(4, {
                            style: {
                              platform: article.platform,
                              column: article.column,
                              analysis: styleAnalysis,
                              sourceUrl: styleUrl,
                            }
                          });
                          message.success('已保存风格分析');
                        }}
                      >
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
                      <div><strong>平台：</strong>{PLATFORM_NAMES[article.platform]}</div>
                      <div><strong>栏目：</strong>{article.column}</div>
                    </Space>
                  </Card>
                  <div style={{ color: '#666', fontSize: 12 }}>
                    使用平台和栏目的默认风格设置
                  </div>
                  <Button
                    type="primary"
                    onClick={async () => {
                      await markStepCompleted(4, {
                        style: { platform: article.platform, column: article.column }
                      });
                      message.success('已确认风格设置');
                    }}
                  >
                    确认并继续
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      ),
    },
    {
      key: 'materials',
      label: renderStepLabel(WORKFLOW_STEPS[5], completedSteps.includes(5)),
      children: (
        <Tabs
          defaultActiveKey="knowledge"
          items={[
            {
              key: 'knowledge',
              label: '知识库搜索',
              children: (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Input.Search
                    placeholder="搜索知识库素材"
                    value={materialsQuery}
                    onChange={e => setMaterialsQuery(e.target.value)}
                    onSearch={handleSearchMaterials}
                    enterButton="搜索"
                    loading={loadingSteps['materials']}
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
                </Space>
              ),
            },
            {
              key: 'web',
              label: <span><GlobalOutlined /> AI 联网搜索</span>,
              children: (
                <WebSearchPanel
                  serviceId={selectedServiceId}
                  onResultsChange={handleWebSearchComplete}
                />
              ),
            },
          ]}
        />
      ),
    },
    {
      key: 'draft',
      label: renderStepLabel(WORKFLOW_STEPS[6], completedSteps.includes(6)),
      children: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            type="primary"
            onClick={handleDraft}
            loading={loadingSteps['draft']}
            disabled={!outlineResult}
          >
            生成初稿
          </Button>
          {!outlineResult && (
            <div style={{ color: '#faad14', fontSize: 12 }}>
              请先生成大纲
            </div>
          )}
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ color: '#666', fontSize: 12 }}>
            针对性优化：输入优化指令，AI 将根据指令优化文章
          </div>
          <Input.TextArea
            placeholder="输入优化指令，如：加强开头吸引力、补充数据支撑、增加案例说明..."
            value={optimizeInstruction}
            onChange={e => setOptimizeInstruction(e.target.value)}
            autoSize={{ minRows: 2, maxRows: 4 }}
          />
          <Button
            onClick={handleOptimize}
            loading={optimizing}
            disabled={!content.trim()}
          >
            针对性优化
          </Button>
        </Space>
      ),
    },
    {
      key: 'review',
      label: renderStepLabel(WORKFLOW_STEPS[7], completedSteps.includes(7)),
      children: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            type="primary"
            onClick={handleReview}
            loading={loadingSteps['review']}
            disabled={!content.trim()}
          >
            开始审校
          </Button>
          {reviewResult && (
            <Card size="small" style={{ background: '#fff7e6' }}>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{reviewResult}</pre>
            </Card>
          )}
        </Space>
      ),
    },
    {
      key: 'hkr',
      label: <span><RocketOutlined /> HKR 评估</span>,
      children: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ color: '#666', fontSize: 12 }}>
            H(吸引力) K(知识价值) R(情感共鸣) 三维评估
          </div>
          <Button
            type="primary"
            onClick={handleHKR}
            loading={loadingSteps['hkr']}
            disabled={!content.trim()}
          >
            开始评估
          </Button>
          {hkrResult && (
            <Card size="small">
              {typeof hkrResult === 'object' ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Tag color="blue">H 吸引力</Tag>
                    <span>{hkrResult.H?.score}/10</span>
                    <span style={{ marginLeft: 8, color: '#666' }}>{hkrResult.H?.comment}</span>
                  </div>
                  <div>
                    <Tag color="green">K 知识价值</Tag>
                    <span>{hkrResult.K?.score}/10</span>
                    <span style={{ marginLeft: 8, color: '#666' }}>{hkrResult.K?.comment}</span>
                  </div>
                  <div>
                    <Tag color="orange">R 情感共鸣</Tag>
                    <span>{hkrResult.R?.score}/10</span>
                    <span style={{ marginLeft: 8, color: '#666' }}>{hkrResult.R?.comment}</span>
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ fontWeight: 500 }}>
                    综合评分：{hkrResult.overall}/10
                  </div>
                  {hkrResult.suggestions && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>改进建议：</div>
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {hkrResult.suggestions.map((s: string, i: number) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                      <Button
                        type="primary"
                        size="small"
                        style={{ marginTop: 12 }}
                        onClick={handleHKRImprove}
                        loading={improving}
                      >
                        根据建议自动改进
                      </Button>
                    </div>
                  )}
                </Space>
              ) : (
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{hkrResult}</pre>
              )}
            </Card>
          )}
        </Space>
      ),
    },
    {
      key: 'smartImage',
      label: <span><PictureOutlined /> 智能配图</span>,
      children: (
        <SmartImagePanel
          articleId={article.id}
          content={content}
          platform={article.platform}
          column={article.column}
          coverImage={article.coverImage}
          onContentChange={onContentChange}
          onCoverChange={onCoverChange || (() => {})}
          onSaveWithNote={onSaveWithNote}
        />
      ),
    },
    {
      key: 'script',
      label: <span><SoundOutlined /> 口播文案</span>,
      children: (
        <ScriptPanel
          articleId={article.id}
          title={article.title}
          content={content}
          platform={article.platform}
        />
      ),
    },
  ];

  return (
    <Card
      title="AI 创作助手"
      size="small"
      extra={
        <Space size="small" wrap>
          {/* 当前模板信息 */}
          {currentTemplate && (
            <Tooltip title={currentTemplate.description || '点击切换模板'}>
              <Tag
                color="purple"
                style={{ margin: 0, cursor: 'pointer' }}
                onClick={() => setShowTemplateModal(true)}
              >
                {currentTemplate.name}
                <SwapOutlined style={{ marginLeft: 4 }} />
              </Tag>
            </Tooltip>
          )}
          {!currentTemplate && availableTemplates.length > 0 && (
            <Button
              size="small"
              icon={<SwapOutlined />}
              onClick={() => setShowTemplateModal(true)}
            >
              选择模板
            </Button>
          )}
          <Tooltip title="保存当前步骤和所有已生成的内容（选题分析、大纲、素材等）">
            <Button
              icon={<SaveOutlined />}
              onClick={handleSaveWorkflow}
              size="small"
            >
              保存工作流
            </Button>
          </Tooltip>
          <Tooltip title="选择 AI 模型用于所有创作步骤">
            <span>
              <AIModelSelector
                value={selectedServiceId}
                onChange={setSelectedServiceId}
                size="small"
              />
            </span>
          </Tooltip>
          <Tag color={PLATFORM_NAMES[article.platform] ? 'blue' : 'default'} style={{ margin: 0 }}>
            {PLATFORM_NAMES[article.platform] || article.platform} / {article.column}
          </Tag>
        </Space>
      }
    >
      <Collapse
        items={collapseItems}
        activeKey={activeCollapseKey}
        onChange={handleCollapseChange}
        accordion
      />

      {/* 保存详情弹窗 */}
      <Modal
        title="保存成功"
        open={showSaveDetail}
        onCancel={() => setShowSaveDetail(false)}
        footer={[
          <Button key="ok" type="primary" onClick={() => setShowSaveDetail(false)}>
            确定
          </Button>
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>已保存工作流进度：{completedSteps.length}/8 步骤</div>
          {savedSteps.length > 0 && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <div>已保存的内容：</div>
              <ul>
                {savedSteps.map(step => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </>
          )}
        </Space>
      </Modal>

      {/* 模板切换弹窗 */}
      <Modal
        title="切换工作流模板"
        open={showTemplateModal}
        onCancel={() => setShowTemplateModal(false)}
        onOk={handleTemplateChange}
        okText="确认切换"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ marginBottom: 8, color: '#666' }}>
            选择一个工作流模板，AI 将根据模板配置的 Prompt 和参数进行创作
          </div>
          <Select
            style={{ width: '100%' }}
            placeholder="选择模板"
            value={selectedTemplateId}
            onChange={setSelectedTemplateId}
          >
            {availableTemplates.map(t => (
              <Select.Option key={t.id} value={t.id}>
                <Space>
                  <span>{t.name}</span>
                  <Tag color={t.type === 'system' ? 'blue' : 'green'} style={{ marginLeft: 8 }}>
                    {t.type === 'system' ? '系统' : '自定义'}
                  </Tag>
                </Space>
              </Select.Option>
            ))}
          </Select>
          {selectedTemplateId && availableTemplates.find(t => t.id === selectedTemplateId)?.description && (
            <div style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
              {availableTemplates.find(t => t.id === selectedTemplateId)?.description}
            </div>
          )}
        </Space>
      </Modal>
    </Card>
  );
}
