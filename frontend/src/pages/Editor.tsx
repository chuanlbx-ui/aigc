import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Button, message, Input, Tag, Spin, Collapse } from 'antd';
import { SaveOutlined, PlayCircleOutlined, ClockCircleOutlined, FormatPainterOutlined } from '@ant-design/icons';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import TextInput from '../components/Editor/TextInput';
import TTSPanel from '../components/Editor/TTSPanel';
import AssetPicker from '../components/Editor/AssetPicker';
import OutputSettings from '../components/Editor/OutputSettings';
import BGMPicker from '../components/Editor/BGMPicker';
import BackgroundPicker from '../components/Editor/BackgroundPicker';
import PopupEditor from '../components/Editor/PopupEditor';
import VideoPreview from '../components/Editor/VideoPreview';
import FilterPicker from '../components/Editor/FilterPicker';
import PresenterPanel from '../components/Editor/PresenterPanel';
import { useEditorStore } from '../stores/editor';
import { useAutoSave } from '../hooks/useAutoSave';
import { api } from '../api/client';

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { config, projectName, setProjectName, updateConfig, saveProject, submitRender, loadProject, reset } = useEditorStore();
  const [rendering, setRendering] = useState(false);
  const [projectId, setProjectId] = useState<string | undefined>(id);
  const [loading, setLoading] = useState(false);

  // 分隔条拖动状态
  const [leftWidth, setLeftWidth] = useState(50); // 左侧宽度百分比
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // 预估时长状态
  const [estimatedDuration, setEstimatedDuration] = useState<string>('0:00');
  const [estimatedDurationMs, setEstimatedDurationMs] = useState<number>(0);
  const [estimating, setEstimating] = useState(false);

  // 当前展开的折叠面板
  const [activePanel, setActivePanel] = useState<string | string[]>('text');

  // 预估音频时长
  const estimateDuration = useCallback(async () => {
    if (!config.text?.trim()) {
      setEstimatedDuration('0:00');
      setEstimatedDurationMs(0);
      return;
    }

    setEstimating(true);
    try {
      const res = await api.post('/tts/estimate-duration', {
        text: config.text,
        voice: config.tts?.voice || 'zh-CN-XiaoxiaoNeural',
        rate: config.tts?.rate || 1.0,
      });
      setEstimatedDuration(res.data.durationFormatted);
      setEstimatedDurationMs(res.data.durationMs);
    } catch {
      // 预估失败时不显示错误，保持上次的值
    } finally {
      setEstimating(false);
    }
  }, [config.text, config.tts?.voice, config.tts?.rate]);

  // 加载项目数据
  useEffect(() => {
    if (id) {
      setLoading(true);
      loadProject(id)
        .catch(() => message.error('加载项目失败'))
        .finally(() => setLoading(false));
      setProjectId(id);
    } else {
      // 新建项目时重置状态
      reset();
      setProjectId(undefined);
      // 从 location.state 获取项目名称
      const state = location.state as { projectName?: string } | null;
      if (state?.projectName) {
        setProjectName(state.projectName);
      }
    }
  }, [id]);

  // 当文字或TTS设置变化时，延迟预估时长（防抖）
  useEffect(() => {
    const timer = setTimeout(() => {
      estimateDuration();
    }, 1000); // 1秒防抖
    return () => clearTimeout(timer);
  }, [estimateDuration]);

  // 保存项目并返回ID（用于渲染）
  const saveAndGetId = useCallback(async (): Promise<string | undefined> => {
    const savedId = await saveProject(projectId);
    setProjectId(savedId);
    if (!id) {
      navigate(`/editor/${savedId}/edit`, { replace: true });
    }
    return savedId;
  }, [saveProject, projectId, id, navigate]);

  // 保存项目（供自动保存使用）
  const doSave = useCallback(async (): Promise<void> => {
    await saveAndGetId();
    message.success('自动保存成功');
  }, [saveAndGetId]);

  // 自动保存 Hook（60秒倒计时）
  const { saving, save: handleSave, getSaveButtonText } = useAutoSave({
    interval: 60,
    onSave: doSave,
    enabled: !loading, // 加载中时禁用自动保存
  });

  const handleRender = async () => {
    setRendering(true);
    try {
      // 先保存项目
      const savedId = await saveAndGetId();
      if (!savedId) {
        message.error('保存失败，无法渲染');
        return;
      }
      // 提交渲染
      await submitRender(savedId);
      message.success('已提交渲染任务，请在任务队列中查看进度');
      navigate('/tasks');
    } catch (err) {
      message.error('提交渲染失败');
    } finally {
      setRendering(false);
    }
  };

  // 一键格式化口播文本（清理 MD 符号，保证朗读和字幕干净）
  const handleFormatText = () => {
    let text = config.text;

    // 1. 保护小数点：临时替换数字间的小数点
    text = text.replace(/(\d)\.(\d)/g, '$1【小数点】$2');

    // 2. 清理 Markdown 标题符号（# ## ### 等）
    text = text.replace(/^#{1,6}\s*/gm, '');

    // 3. 清理 Markdown 加粗/斜体（** __ * _）
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1');  // **text** -> text
    text = text.replace(/__([^_]+)__/g, '$1');      // __text__ -> text
    text = text.replace(/\*([^*]+)\*/g, '$1');      // *text* -> text
    text = text.replace(/_([^_]+)_/g, '$1');        // _text_ -> text

    // 4. 清理 Markdown 分隔线（--- *** ___）
    text = text.replace(/^[-*_]{3,}\s*$/gm, '');

    // 5. 清理 Markdown 列表符号（- * + 1. 2.）
    text = text.replace(/^[\s]*[-*+]\s+/gm, '');
    text = text.replace(/^[\s]*\d+\.\s+/gm, '');

    // 6. 清理 Markdown 引用（>）
    text = text.replace(/^>\s*/gm, '');

    // 7. 清理 Markdown 代码块和行内代码
    text = text.replace(/```[\s\S]*?```/g, '');     // 代码块
    text = text.replace(/`([^`]+)`/g, '$1');        // 行内代码

    // 8. 清理 Markdown 链接和图片
    text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');  // 图片
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');   // 链接

    // 9. 移除其他特殊字符
    text = text.replace(/[`~|\\<>\[\]{}@^$]+/g, '');
    text = text.replace(/[—《》「」『』〈〉""'']+/g, '');
    text = text.replace(/["'()]+/g, '');

    // 10. 在句末标点后换行
    text = text.replace(/([。！？!?])\s*/g, '$1\n');

    // 11. 恢复小数点
    text = text.replace(/【小数点】/g, '.');

    // 12. 移除多余空格
    text = text.replace(/[ \t]+/g, ' ');

    // 13. 移除连续换行
    text = text.replace(/\n{2,}/g, '\n');

    // 14. 去除每行首尾空白
    text = text.split('\n').map(line => line.trim()).filter(line => line).join('\n').trim();

    // 直接更新原始文本，保证 TTS 和字幕都干净
    updateConfig({ text });
    message.success('文本格式化完成，已清理 Markdown 符号');
  };

  // 分隔条拖动处理
  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.min(Math.max(newWidth, 30), 70)); // 限制在30%-70%
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        padding: 24,
        height: '100%',
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {/* 左侧配置区 - 可滚动 */}
      <div
        style={{
          width: `${leftWidth}%`,
          height: '100%',
          maxHeight: 1300,
          overflowY: 'auto',
          paddingRight: 12,
        }}
      >
        <Collapse
          accordion
          activeKey={activePanel}
          onChange={setActivePanel}
          style={{ background: 'transparent' }}
          items={[
            {
              key: 'project',
              label: <span style={{ fontWeight: 600 }}>项目名称</span>,
              children: (
                <Input
                  placeholder="请输入项目名称"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  disabled={loading}
                />
              ),
            },
            {
              key: 'text',
              label: (
                <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  口播文字
                  <Button
                    type="link"
                    size="small"
                    icon={<FormatPainterOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFormatText();
                    }}
                    style={{ padding: 0, height: 'auto' }}
                  >
                    一键格式化
                  </Button>
                </span>
              ),
              children: (
                <TextInput
                  value={config.text}
                  onChange={(text) => updateConfig({ text })}
                />
              ),
            },
            {
              key: 'tts',
              label: <span style={{ fontWeight: 600 }}>TTS 设置</span>,
              children: (
                <TTSPanel
                  config={config.tts}
                  onChange={(tts) => updateConfig({ tts })}
                />
              ),
            },
            {
              key: 'assets',
              label: (
                <span style={{ fontWeight: 600 }}>
                  素材配置
                  <Tag
                    icon={estimating ? <Spin size="small" /> : <ClockCircleOutlined />}
                    color="blue"
                    style={{ marginLeft: 12, fontWeight: 400 }}
                  >
                    预估时长: {estimatedDuration}
                  </Tag>
                </span>
              ),
              children: (
                <AssetPicker
                  assets={config.assets}
                  onChange={(assets) => updateConfig({ assets })}
                  estimatedDurationMs={estimatedDurationMs}
                  text={config.text}
                  projectName={projectName}
                  orientation={config.orientation}
                />
              ),
            },
            {
              key: 'popups',
              label: <span style={{ fontWeight: 600 }}>弹窗配置</span>,
              children: (
                <PopupEditor
                  popups={config.popups}
                  onChange={(popups) => updateConfig({ popups })}
                  estimatedDurationMs={estimatedDurationMs}
                  text={config.text}
                />
              ),
            },
            {
              key: 'bgm',
              label: <span style={{ fontWeight: 600 }}>背景音乐</span>,
              children: (
                <BGMPicker
                  config={config.bgm}
                  onChange={(bgm) => updateConfig({ bgm })}
                />
              ),
            },
            {
              key: 'background',
              label: <span style={{ fontWeight: 600 }}>背景样式</span>,
              children: (
                <BackgroundPicker
                  config={config.background}
                  onChange={(background) => updateConfig({ background })}
                />
              ),
            },
            {
              key: 'filters',
              label: <span style={{ fontWeight: 600 }}>视觉效果</span>,
              children: (
                <FilterPicker
                  filters={config.filters}
                  onChange={(filters) => updateConfig({ filters })}
                />
              ),
            },
            {
              key: 'presenter',
              label: <span style={{ fontWeight: 600 }}>人物出镜</span>,
              children: (
                <PresenterPanel
                  presenter={config.presenter}
                  greenScreen={config.greenScreen}
                  digitalHuman={config.digitalHuman}
                  onPresenterChange={(presenter) => updateConfig({ presenter })}
                  onGreenScreenChange={(greenScreen) => updateConfig({ greenScreen })}
                  onDigitalHumanChange={(digitalHuman) => updateConfig({ digitalHuman })}
                />
              ),
            },
            {
              key: 'output',
              label: <span style={{ fontWeight: 600 }}>输出设置</span>,
              children: (
                <OutputSettings
                  orientation={config.orientation}
                  resolution={config.resolution}
                  onChange={(settings) => updateConfig(settings)}
                />
              ),
            },
          ]}
        />
        </div>

      {/* 可拖动分隔条 */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          width: 8,
          cursor: 'col-resize',
          backgroundColor: '#f0f0f0',
          borderRadius: 4,
          margin: '0 4px',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#d9d9d9')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
      />

      {/* 右侧预览区 - 固定 */}
      <div
        style={{
          width: `calc(${100 - leftWidth}% - 16px)`,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Card
          title="视频预览"
          extra={
            <Button.Group>
              <Button icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
                {getSaveButtonText()}
              </Button>
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleRender} loading={rendering}>
                渲染
              </Button>
            </Button.Group>
          }
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          styles={{ body: { flex: 1, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' } }}
        >
          <VideoPreview
            text={config.text}
            subtitleText={config.subtitleText}
            assets={config.assets}
            orientation={config.orientation}
            bgm={config.bgm}
            estimatedDurationMs={estimatedDurationMs}
            backgroundStyleId={config.background?.styleId}
            popups={config.popups}
            filters={config.filters}
          />
        </Card>
      </div>
    </div>
  );
}
