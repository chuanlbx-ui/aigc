import { useState, useEffect } from 'react';
import { Modal, Tabs, Form, Input, InputNumber, Select, Radio, Row, Col, Button, ColorPicker, Card, Tooltip, Space, Image } from 'antd';
import { BoldOutlined, ItalicOutlined, SaveOutlined, FolderOpenOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { Popup, PopupPosition, EnterAnimation, ExitAnimation } from '../../../stores/editor';
import SaveTemplateModal from './SaveTemplateModal';
import AssetSelectorModal from '../AssetSelectorModal';

interface PopupModalProps {
  open: boolean;
  popup: Popup | null;
  onCancel: () => void;
  onSave: (popup: Popup) => void;
  maxDuration?: number;
}

// 字体选项
const fontOptions = [
  { label: '默认字体', value: 'sans-serif' },
  { label: '黑体', value: '"Microsoft YaHei", "微软雅黑", sans-serif' },
  { label: '宋体', value: '"SimSun", "宋体", serif' },
  { label: '楷体', value: '"KaiTi", "楷体", serif' },
  { label: '等宽字体', value: 'monospace' },
];

// 阴影预设
const shadowPresets = [
  { label: '无阴影', value: 'none' },
  { label: '轻微阴影', value: '0 2px 8px rgba(0,0,0,0.15)' },
  { label: '中等阴影', value: '0 4px 16px rgba(0,0,0,0.25)' },
  { label: '强烈阴影', value: '0 8px 30px rgba(0,0,0,0.35)' },
  { label: '发光效果', value: '0 0 20px rgba(255,255,255,0.5)' },
  { label: '霓虹效果', value: '0 0 10px #00f, 0 0 20px #00f, 0 0 30px #00f' },
];

// 位置选项
const positionOptions: { label: string; value: PopupPosition }[] = [
  { label: '左上', value: 'top-left' },
  { label: '上中', value: 'top-center' },
  { label: '右上', value: 'top-right' },
  { label: '左中', value: 'center-left' },
  { label: '居中', value: 'center' },
  { label: '右中', value: 'center-right' },
  { label: '左下', value: 'bottom-left' },
  { label: '下中', value: 'bottom-center' },
  { label: '右下', value: 'bottom-right' },
  { label: '自定义', value: 'custom' },
];

// 入场动画选项
const enterAnimationOptions: { label: string; value: EnterAnimation }[] = [
  { label: '无', value: 'none' },
  { label: '淡入', value: 'fade' },
  { label: '从左滑入', value: 'slideLeft' },
  { label: '从右滑入', value: 'slideRight' },
  { label: '从下滑入', value: 'slideUp' },
  { label: '从上滑入', value: 'slideDown' },
  { label: '缩放', value: 'scale' },
  { label: '弹跳', value: 'bounce' },
];

// 出场动画选项
const exitAnimationOptions: { label: string; value: ExitAnimation }[] = [
  { label: '无', value: 'none' },
  { label: '淡出', value: 'fade' },
  { label: '向左滑出', value: 'slideLeft' },
  { label: '向右滑出', value: 'slideRight' },
  { label: '向上滑出', value: 'slideUp' },
  { label: '向下滑出', value: 'slideDown' },
  { label: '缩放', value: 'scale' },
];

// 内容 Tab
function ContentTab({
  contentType,
  onTypeChange,
  form,
}: {
  contentType: string;
  onTypeChange: (t: 'text' | 'image' | 'video') => void;
  form: ReturnType<typeof Form.useForm>[0];
}) {
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<{ id: string; name: string; type: string } | null>(null);

  // 初始化已选素材显示
  useEffect(() => {
    const mediaAssetId = form.getFieldValue('mediaAssetId');
    if (mediaAssetId && !selectedAsset) {
      setSelectedAsset({ id: mediaAssetId, name: '已选素材', type: contentType });
    }
  }, [form, contentType, selectedAsset]);

  const handleAssetSelect = (asset: { id: string; name: string; type: string }) => {
    form.setFieldValue('mediaAssetId', asset.id);
    form.setFieldValue('mediaUrl', `/api/assets/file/${asset.id}`);
    setSelectedAsset(asset);
    setShowAssetSelector(false);
  };

  const handleClearAsset = () => {
    form.setFieldValue('mediaAssetId', null);
    form.setFieldValue('mediaUrl', '');
    setSelectedAsset(null);
  };

  return (
    <div>
      <Form.Item name="contentType" label="内容类型">
        <Radio.Group onChange={e => onTypeChange(e.target.value)}>
          <Radio.Button value="text">文字</Radio.Button>
          <Radio.Button value="image">图片</Radio.Button>
          <Radio.Button value="video">视频</Radio.Button>
        </Radio.Group>
      </Form.Item>

      {contentType === 'text' && (
        <>
          <Form.Item name="textContent" label="文字内容" rules={[{ required: true, message: '请输入文字内容' }]}>
            <Input.TextArea rows={3} placeholder="请输入弹窗文字" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="fontFamily" label="字体">
                <Select options={fontOptions} placeholder="选择字体" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="字体样式">
                <Row gutter={8}>
                  <Col>
                    <Form.Item name="fontWeight" noStyle>
                      <Radio.Group buttonStyle="solid" size="small">
                        <Tooltip title="正常">
                          <Radio.Button value="normal">A</Radio.Button>
                        </Tooltip>
                        <Tooltip title="加粗">
                          <Radio.Button value="bold"><BoldOutlined /></Radio.Button>
                        </Tooltip>
                      </Radio.Group>
                    </Form.Item>
                  </Col>
                  <Col>
                    <Form.Item name="fontStyle" noStyle>
                      <Radio.Group buttonStyle="solid" size="small">
                        <Tooltip title="正常">
                          <Radio.Button value="normal">A</Radio.Button>
                        </Tooltip>
                        <Tooltip title="斜体">
                          <Radio.Button value="italic"><ItalicOutlined /></Radio.Button>
                        </Tooltip>
                      </Radio.Group>
                    </Form.Item>
                  </Col>
                </Row>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="fontSize" label="字号">
                <InputNumber min={12} max={120} addonAfter="px" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="textColor" label="文字颜色">
                <Input type="color" style={{ width: 60, height: 32 }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="textAlign" label="对齐">
                <Select options={[
                  { label: '左对齐', value: 'left' },
                  { label: '居中', value: 'center' },
                  { label: '右对齐', value: 'right' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
        </>
      )}

      {(contentType === 'image' || contentType === 'video') && (
        <>
          <Form.Item label="从素材库选择">
            <Space direction="vertical" style={{ width: '100%' }}>
              {selectedAsset ? (
                <Card size="small" style={{ marginBottom: 8 }}>
                  <Space>
                    {contentType === 'image' ? (
                      <Image
                        src={`/api/assets/file/${selectedAsset.id}`}
                        width={80}
                        height={60}
                        style={{ objectFit: 'cover', borderRadius: 4 }}
                        preview={false}
                      />
                    ) : (
                      <video
                        src={`/api/assets/file/${selectedAsset.id}`}
                        width={80}
                        height={60}
                        style={{ objectFit: 'cover', borderRadius: 4 }}
                        muted
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{selectedAsset.name}</div>
                      <div style={{ fontSize: 12, color: '#999' }}>
                        {contentType === 'image' ? '图片' : '视频'}
                      </div>
                    </div>
                    <Button
                      type="text"
                      icon={<CloseCircleOutlined />}
                      onClick={handleClearAsset}
                      danger
                    />
                  </Space>
                </Card>
              ) : null}
              <Button
                icon={<FolderOpenOutlined />}
                onClick={() => setShowAssetSelector(true)}
              >
                {selectedAsset ? '更换素材' : '选择素材'}
              </Button>
            </Space>
            <Form.Item name="mediaAssetId" hidden><Input /></Form.Item>
          </Form.Item>
          <Form.Item name="mediaUrl" label="或输入媒体URL">
            <Input placeholder="请输入图片或视频URL" />
          </Form.Item>
          <Form.Item name="mediaFit" label="填充模式">
            <Select options={[
              { label: '覆盖 (cover)', value: 'cover' },
              { label: '包含 (contain)', value: 'contain' },
              { label: '拉伸 (fill)', value: 'fill' },
            ]} />
          </Form.Item>
          {contentType === 'video' && (
            <Form.Item name="videoMuted" label="静音">
              <Radio.Group>
                <Radio value={true}>静音</Radio>
                <Radio value={false}>播放声音</Radio>
              </Radio.Group>
            </Form.Item>
          )}
        </>
      )}

      <AssetSelectorModal
        open={showAssetSelector}
        onCancel={() => setShowAssetSelector(false)}
        onSelect={handleAssetSelect}
        filterType={contentType as 'image' | 'video'}
        title={contentType === 'image' ? '选择图片' : '选择视频'}
      />
    </div>
  );
}

// 样式 Tab
function StyleTab({ form }: { form: ReturnType<typeof Form.useForm>[0] }) {
  const handleBgColorChange = (_: unknown, hex: string) => {
    form.setFieldValue('backgroundColor', hex);
  };

  const handleShadowPresetChange = (value: string) => {
    form.setFieldValue('boxShadow', value);
  };

  return (
    <div>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="width" label="宽度" rules={[{ required: true }]}>
            <InputNumber min={50} max={1920} addonAfter="px" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="height" label="高度" rules={[{ required: true }]}>
            <InputNumber min={50} max={1080} addonAfter="px" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="backgroundColor" label="背景颜色">
            <Input.Group compact>
              <Form.Item name="backgroundColor" noStyle>
                <Input style={{ width: 'calc(100% - 40px)' }} placeholder="rgba(0,0,0,0.8)" />
              </Form.Item>
              <ColorPicker onChange={handleBgColorChange} />
            </Input.Group>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="borderRadius" label="圆角">
            <InputNumber min={0} max={100} addonAfter="px" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="borderWidth" label="边框宽度">
            <InputNumber min={0} max={20} addonAfter="px" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="borderColor" label="边框颜色">
            <Input type="color" style={{ width: 60, height: 32 }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="padding" label="内边距">
            <InputNumber min={0} max={100} addonAfter="px" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label="阴影">
        <Row gutter={8}>
          <Col span={10}>
            <Select
              placeholder="选择预设"
              options={shadowPresets}
              onChange={handleShadowPresetChange}
              allowClear
            />
          </Col>
          <Col span={14}>
            <Form.Item name="boxShadow" noStyle>
              <Input placeholder="或自定义: 0 10px 30px rgba(0,0,0,0.3)" />
            </Form.Item>
          </Col>
        </Row>
      </Form.Item>
    </div>
  );
}

// 位置 Tab
function PositionTab({ position, onPositionChange }: { position: PopupPosition; onPositionChange: (p: PopupPosition) => void }) {
  return (
    <div>
      <Form.Item name="position" label="位置">
        <Select options={positionOptions} onChange={onPositionChange} />
      </Form.Item>
      {position === 'custom' && (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="customX" label="X 位置 (%)">
              <InputNumber min={0} max={100} addonAfter="%" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="customY" label="Y 位置 (%)">
              <InputNumber min={0} max={100} addonAfter="%" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      )}
      <Card size="small" title="位置微调" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="offsetX" label="X 轴偏移">
              <InputNumber
                min={-500}
                max={500}
                addonAfter="px"
                style={{ width: '100%' }}
                placeholder="正值向右，负值向左"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="offsetY" label="Y 轴偏移">
              <InputNumber
                min={-500}
                max={500}
                addonAfter="px"
                style={{ width: '100%' }}
                placeholder="正值向下，负值向上"
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>
      <Form.Item name="zIndex" label="层级 (z-index)">
        <InputNumber min={1} max={1000} style={{ width: '100%' }} />
      </Form.Item>
    </div>
  );
}

// 时间 Tab
function TimingTab({ maxDuration }: { maxDuration: number }) {
  return (
    <div>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="startTime" label="开始时间" rules={[{ required: true }]}>
            <InputNumber min={0} max={maxDuration} addonAfter="秒" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="duration" label="持续时长" rules={[{ required: true }]}>
            <InputNumber min={0.5} max={60} step={0.5} addonAfter="秒" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
}

// 动画预设配置
const animationPresets = [
  { id: 'fade-in-out', name: '淡入淡出', enter: 'fade' as EnterAnimation, exit: 'fade' as ExitAnimation, icon: '✨' },
  { id: 'slide-left', name: '左进左出', enter: 'slideLeft' as EnterAnimation, exit: 'slideLeft' as ExitAnimation, icon: '⬅️' },
  { id: 'slide-right', name: '右进右出', enter: 'slideRight' as EnterAnimation, exit: 'slideRight' as ExitAnimation, icon: '➡️' },
  { id: 'slide-up', name: '下进上出', enter: 'slideUp' as EnterAnimation, exit: 'slideUp' as ExitAnimation, icon: '⬆️' },
  { id: 'slide-down', name: '上进下出', enter: 'slideDown' as EnterAnimation, exit: 'slideDown' as ExitAnimation, icon: '⬇️' },
  { id: 'scale', name: '缩放', enter: 'scale' as EnterAnimation, exit: 'scale' as ExitAnimation, icon: '🔍' },
  { id: 'bounce-fade', name: '弹跳淡出', enter: 'bounce' as EnterAnimation, exit: 'fade' as ExitAnimation, icon: '🎾' },
  { id: 'fade-slide-left', name: '淡入左出', enter: 'fade' as EnterAnimation, exit: 'slideLeft' as ExitAnimation, icon: '💨' },
  { id: 'slide-right-fade', name: '右进淡出', enter: 'slideRight' as EnterAnimation, exit: 'fade' as ExitAnimation, icon: '🌊' },
  { id: 'none', name: '无动画', enter: 'none' as EnterAnimation, exit: 'none' as ExitAnimation, icon: '⏹️' },
];

// 动画 Tab
function AnimationTab({ form }: { form: ReturnType<typeof Form.useForm>[0] }) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const handlePresetSelect = (preset: typeof animationPresets[0]) => {
    setSelectedPreset(preset.id);
    form.setFieldValue('enterAnimation', preset.enter);
    form.setFieldValue('exitAnimation', preset.exit);
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>快速选择动画预设</div>
        <Row gutter={[8, 8]}>
          {animationPresets.map(preset => (
            <Col span={12} key={preset.id}>
              <Card
                size="small"
                hoverable
                onClick={() => handlePresetSelect(preset)}
                style={{
                  cursor: 'pointer',
                  border: selectedPreset === preset.id ? '2px solid #1890ff' : '1px solid #d9d9d9',
                  background: selectedPreset === preset.id ? '#e6f7ff' : '#fff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{preset.icon}</span>
                  <span>{preset.name}</span>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      <Card size="small" title="自定义动画" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="enterAnimation" label="入场动画">
              <Select options={enterAnimationOptions} onChange={() => setSelectedPreset(null)} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="exitAnimation" label="出场动画">
              <Select options={exitAnimationOptions} onChange={() => setSelectedPreset(null)} />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Form.Item name="animationDuration" label="动画时长 (帧)" extra="30帧 = 1秒">
        <InputNumber min={5} max={90} style={{ width: '100%' }} />
      </Form.Item>
    </div>
  );
}

export default function PopupModal({ open, popup, onCancel, onSave, maxDuration = 60 }: PopupModalProps) {
  const [form] = Form.useForm();
  const [contentType, setContentType] = useState<'text' | 'image' | 'video'>('text');
  const [position, setPosition] = useState<PopupPosition>('center');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  useEffect(() => {
    if (popup && open) {
      form.setFieldsValue(popup);
      setContentType(popup.contentType);
      setPosition(popup.position);
    }
  }, [popup, open, form]);

  const handleOk = () => {
    form.validateFields().then(values => {
      onSave({ ...popup, ...values } as Popup);
    });
  };

  const handleContentTypeChange = (type: 'text' | 'image' | 'video') => {
    setContentType(type);
    form.setFieldValue('contentType', type);
  };

  // 获取当前表单值用于保存模板
  const getCurrentPopup = (): Popup | null => {
    if (!popup) return null;
    const values = form.getFieldsValue();
    return { ...popup, ...values } as Popup;
  };

  return (
    <Modal
      title="编辑弹窗"
      open={open}
      onCancel={onCancel}
      width={700}
      destroyOnClose
      footer={
        <Space>
          <Button icon={<SaveOutlined />} onClick={() => setShowSaveTemplate(true)}>
            保存为模板
          </Button>
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" onClick={handleOk}>确定</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" initialValues={popup || {}}>
        <Form.Item name="id" hidden><Input /></Form.Item>
        <Tabs items={[
          {
            key: 'content',
            label: '内容',
            children: (
              <ContentTab
                contentType={contentType}
                onTypeChange={handleContentTypeChange}
                form={form}
              />
            ),
          },
          { key: 'style', label: '样式', children: <StyleTab form={form} /> },
          { key: 'position', label: '位置', children: <PositionTab position={position} onPositionChange={setPosition} /> },
          { key: 'timing', label: '时间', children: <TimingTab maxDuration={maxDuration} /> },
          { key: 'animation', label: '动画', children: <AnimationTab form={form} /> },
        ]} />
      </Form>

      <SaveTemplateModal
        open={showSaveTemplate}
        popup={getCurrentPopup()}
        onSave={() => setShowSaveTemplate(false)}
        onCancel={() => setShowSaveTemplate(false)}
      />
    </Modal>
  );
}
