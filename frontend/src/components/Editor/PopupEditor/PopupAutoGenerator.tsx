import { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Select,
  InputNumber,
  Checkbox,
  Space,
  Tag,
  Alert,
  Spin,
  message,
  Divider,
  Input,
  Radio,
  Slider,
  Collapse,
} from 'antd';
import { ThunderboltOutlined, SaveOutlined, PictureOutlined, SwapOutlined, DeleteOutlined, PlusOutlined, EditOutlined, SettingOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Popup, PopupPosition, EnterAnimation, ExitAnimation } from '../../../stores/editor';
import {
  extractPopupKeywords,
  getPosterStyles,
  createTemplate,
  searchImages,
  type ExtractedKeyword,
  type PosterStyle,
  type PopupTemplateConfig,
  type KeywordExtractConfig,
} from './templateApi';
import ImagePicker, { type SelectedImage } from './ImagePicker';

interface PopupAutoGeneratorProps {
  text: string;
  estimatedDurationMs: number;
  onGenerated: (popups: Popup[]) => void;
  onClose: () => void;
  open: boolean;
}

// 生成唯一ID
const generateId = () => `popup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// 格式化时间显示
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// 关键词图片映射类型
interface KeywordImage {
  keyword: ExtractedKeyword;
  image?: SelectedImage;
  loading?: boolean;
}

export default function PopupAutoGenerator({
  text,
  estimatedDurationMs,
  onGenerated,
  onClose,
  open,
}: PopupAutoGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [keywords, setKeywords] = useState<ExtractedKeyword[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [posterStyles, setPosterStyles] = useState<PosterStyle[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [popupDuration, setPopupDuration] = useState<number>(2);
  const [generating, setGenerating] = useState(false);

  // 关键词提取配置
  const [extractConfig, setExtractConfig] = useState<KeywordExtractConfig>({
    minLength: 2,
    maxLength: 6,
    density: 5,
    maxCount: 15,
  });

  // 保存模板相关状态
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // 图片弹窗相关状态
  const [popupType, setPopupType] = useState<'text' | 'image'>('text');
  const [keywordImages, setKeywordImages] = useState<KeywordImage[]>([]);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [editingKeywordIndex, setEditingKeywordIndex] = useState<number>(-1);
  const [loadingImages, setLoadingImages] = useState(false);

  // 编辑关键词弹窗状态
  const [showEditKeyword, setShowEditKeyword] = useState(false);
  const [editKeywordText, setEditKeywordText] = useState('');
  const [editKeywordTime, setEditKeywordTime] = useState(0);
  const [keywordMatchResult, setKeywordMatchResult] = useState<{
    found: boolean;
    position?: number;
    suggestedTime?: number;
  } | null>(null);

  // 在正文中查找关键词并计算时间点
  const findKeywordInText = (keyword: string): { found: boolean; position?: number; suggestedTime?: number } => {
    if (!keyword.trim() || !text) {
      return { found: false };
    }
    const pos = text.indexOf(keyword.trim());
    if (pos === -1) {
      return { found: false };
    }
    // 根据位置比例计算建议时间
    const ratio = pos / text.length;
    const durationSec = (estimatedDurationMs || 60000) / 1000;
    const suggestedTime = Math.max(1, Math.round(ratio * durationSec));
    return { found: true, position: pos, suggestedTime };
  };

  // 当关键词文字变化时自动匹配
  const handleKeywordTextChange = (value: string) => {
    setEditKeywordText(value);
    if (value.trim()) {
      const result = findKeywordInText(value);
      setKeywordMatchResult(result);
      if (result.found && result.suggestedTime !== undefined) {
        setEditKeywordTime(result.suggestedTime);
      }
    } else {
      setKeywordMatchResult(null);
    }
  };

  // 加载数据
  useEffect(() => {
    if (open && text) {
      loadData();
    }
  }, [open, text, estimatedDurationMs]);

  const loadData = async (config?: KeywordExtractConfig) => {
    setLoading(true);
    try {
      // 并行加载关键词和样式
      const [keywordsRes, stylesRes] = await Promise.all([
        extractPopupKeywords(text, estimatedDurationMs || 60000, config || extractConfig),
        getPosterStyles(),
      ]);

      setKeywords(keywordsRes.keywords);
      setSelectedKeywords(keywordsRes.keywords.slice(0, keywordsRes.suggestedCount).map(k => k.text));
      setPosterStyles(stylesRes);

      if (stylesRes.length > 0 && !selectedStyle) {
        setSelectedStyle(stylesRes[0].id);
      }
    } catch {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 重新提取关键词（使用新配置）
  const reloadKeywords = async (newConfig: KeywordExtractConfig) => {
    setExtractConfig(newConfig);
    setLoading(true);
    try {
      const keywordsRes = await extractPopupKeywords(text, estimatedDurationMs || 60000, newConfig);
      setKeywords(keywordsRes.keywords);
      setSelectedKeywords(keywordsRes.keywords.slice(0, keywordsRes.suggestedCount).map(k => k.text));
      message.success(`已提取 ${keywordsRes.keywords.length} 个关键词`);
    } catch {
      message.error('提取关键词失败');
    } finally {
      setLoading(false);
    }
  };

  // 切换关键词选择
  const toggleKeyword = (keyword: string) => {
    if (selectedKeywords.includes(keyword)) {
      setSelectedKeywords(selectedKeywords.filter(k => k !== keyword));
    } else {
      setSelectedKeywords([...selectedKeywords, keyword]);
    }
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedKeywords.length === keywords.length) {
      setSelectedKeywords([]);
    } else {
      setSelectedKeywords(keywords.map(k => k.text));
    }
  };

  // 为关键词自动搜索图片
  const autoSearchImages = async () => {
    if (keywords.length === 0) return;
    setLoadingImages(true);
    const newKeywordImages: KeywordImage[] = [];

    for (const kw of keywords.slice(0, 5)) {
      try {
        const result = await searchImages(kw.text, 1);
        if (result.images.length > 0) {
          const img = result.images[0];
          newKeywordImages.push({
            keyword: kw,
            image: { type: 'pexels', url: img.url, thumbUrl: img.thumbUrl, id: img.id },
          });
        } else {
          newKeywordImages.push({ keyword: kw });
        }
      } catch {
        newKeywordImages.push({ keyword: kw });
      }
    }

    setKeywordImages(newKeywordImages);
    setLoadingImages(false);
  };

  // 打开图片选择器
  const openImagePicker = (index: number) => {
    setEditingKeywordIndex(index);
    setShowImagePicker(true);
  };

  // 选择图片后的回调
  const handleImageSelected = (image: SelectedImage) => {
    if (editingKeywordIndex >= 0) {
      const newList = [...keywordImages];
      newList[editingKeywordIndex] = { ...newList[editingKeywordIndex], image };
      setKeywordImages(newList);
    }
    setShowImagePicker(false);
    setEditingKeywordIndex(-1);
  };

  // 删除关键词图片项
  const removeKeywordImage = (index: number) => {
    setKeywordImages(keywordImages.filter((_, i) => i !== index));
  };

  // 打开编辑关键词弹窗（新增或编辑）
  const openEditKeyword = (index: number) => {
    if (index >= 0 && index < keywordImages.length) {
      // 编辑现有关键词
      const kw = keywordImages[index].keyword;
      setEditKeywordText(kw.text);
      setEditKeywordTime(kw.suggestedTime);
      setKeywordMatchResult({ found: true, suggestedTime: kw.suggestedTime });
    } else {
      // 新增关键词
      setEditKeywordText('');
      setEditKeywordTime(Math.floor((estimatedDurationMs || 60000) / 1000 / 2));
      setKeywordMatchResult(null);
    }
    setEditingKeywordIndex(index);
    setShowEditKeyword(true);
  };

  // 保存编辑的关键词
  const saveEditKeyword = () => {
    if (!editKeywordText.trim()) {
      message.warning('请输入关键词');
      return;
    }
    // 检查关键词是否在正文中
    const matchResult = findKeywordInText(editKeywordText);
    if (!matchResult.found) {
      message.warning('该关键词在正文中未找到，建议更换关键词');
      return;
    }
    const newKw: ExtractedKeyword = {
      text: editKeywordText.trim(),
      position: matchResult.position || 0,
      importance: 5,
      suggestedTime: editKeywordTime,
    };
    if (editingKeywordIndex >= 0 && editingKeywordIndex < keywordImages.length) {
      // 更新现有
      const newList = [...keywordImages];
      newList[editingKeywordIndex] = { ...newList[editingKeywordIndex], keyword: newKw };
      setKeywordImages(newList);
    } else {
      // 新增
      setKeywordImages([...keywordImages, { keyword: newKw }]);
    }
    setShowEditKeyword(false);
    setEditingKeywordIndex(-1);
  };

  // 添加新关键词（打开编辑弹窗）
  const addKeywordImage = () => {
    openEditKeyword(-1);
  };

  // 生成弹窗
  const handleGenerate = () => {
    // 图片弹窗模式
    if (popupType === 'image') {
      const validItems = keywordImages.filter(item => item.image);
      if (validItems.length === 0) {
        message.warning('请至少为一个关键词选择图片');
        return;
      }

      setGenerating(true);
      try {
        const popups: Popup[] = validItems.map((item) => {
          const isEmoji = item.image?.type === 'emoji';
          return {
            id: generateId(),
            contentType: isEmoji ? 'text' as const : 'image' as const,
            textContent: isEmoji ? item.image?.emoji : undefined,
            fontSize: isEmoji ? 120 : undefined,
            mediaUrl: !isEmoji ? item.image?.url : undefined,
            width: 300,
            height: 300,
            position: 'center',
            startTime: item.keyword.suggestedTime,
            duration: popupDuration,
            enterAnimation: 'scale',
            exitAnimation: 'fade',
            animationDuration: 20,
            backgroundColor: isEmoji ? 'transparent' : undefined,
            borderRadius: 16,
            boxShadow: isEmoji ? undefined : '0 8px 32px rgba(0,0,0,0.3)',
            padding: 0,
            zIndex: 100,
            mediaFit: 'contain' as const,
          };
        });

        onGenerated(popups);
        message.success(`成功生成 ${popups.length} 个图片弹窗`);
        onClose();
      } catch {
        message.error('生成弹窗失败');
      } finally {
        setGenerating(false);
      }
      return;
    }

    // 文字弹窗模式（原有逻辑）
    if (selectedKeywords.length === 0) {
      message.warning('请至少选择一个关键词');
      return;
    }

    const style = posterStyles.find(s => s.id === selectedStyle);
    if (!style) {
      message.warning('请选择弹窗样式');
      return;
    }

    setGenerating(true);

    try {
      const selectedKeywordData = keywords.filter(k => selectedKeywords.includes(k.text));

      const popups: Popup[] = selectedKeywordData.map((keyword) => ({
        id: generateId(),
        contentType: 'text' as const,
        textContent: keyword.text,
        textAlign: style.config.textAlign || 'center',
        fontSize: style.config.fontSize || 72,
        textColor: style.config.textColor || '#ffffff',
        fontWeight: style.config.fontWeight || 'bold',
        width: style.config.width || 500,
        height: style.config.height || 160,
        position: (style.config.position || 'center') as PopupPosition,
        startTime: keyword.suggestedTime,
        duration: popupDuration,
        enterAnimation: (style.config.enterAnimation || 'scale') as EnterAnimation,
        exitAnimation: (style.config.exitAnimation || 'fade') as ExitAnimation,
        animationDuration: style.config.animationDuration || 20,
        backgroundColor: style.config.backgroundColor || '#e53935',
        borderRadius: style.config.borderRadius || 0,
        borderWidth: style.config.borderWidth,
        borderColor: style.config.borderColor,
        boxShadow: style.config.boxShadow,
        padding: style.config.padding || 32,
        zIndex: style.config.zIndex || 100,
      }));

      onGenerated(popups);
      message.success(`成功生成 ${popups.length} 个弹窗`);
      onClose();
    } catch {
      message.error('生成弹窗失败');
    } finally {
      setGenerating(false);
    }
  };

  // 保存为模板
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      message.warning('请输入模板名称');
      return;
    }

    const style = posterStyles.find(s => s.id === selectedStyle);
    if (!style) {
      message.warning('请先选择样式');
      return;
    }

    setSavingTemplate(true);
    try {
      const config: PopupTemplateConfig = {
        ...style.config,
        textContent: '关键词',
      };

      await createTemplate(
        templateName,
        config,
        `自动生成模板 - 基于${style.name}`
      );

      message.success('模板保存成功');
      setShowSaveTemplate(false);
      setTemplateName('');
    } catch {
      message.error('保存模板失败');
    } finally {
      setSavingTemplate(false);
    }
  };

  // 获取当前选中样式
  const currentStyle = posterStyles.find(s => s.id === selectedStyle);

  return (
    <Modal
      title="自动生成弹窗"
      open={open}
      onCancel={onClose}
      width={700}
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          {popupType === 'text' && (
            <Button
              icon={<SaveOutlined />}
              onClick={() => setShowSaveTemplate(true)}
              disabled={!selectedStyle}
            >
              保存为模板
            </Button>
          )}
          <Button
            type="primary"
            icon={popupType === 'image' ? <PictureOutlined /> : <ThunderboltOutlined />}
            onClick={handleGenerate}
            loading={generating}
            disabled={
              popupType === 'text'
                ? (selectedKeywords.length === 0 || !selectedStyle)
                : keywordImages.filter(i => i.image).length === 0
            }
          >
            {popupType === 'image' ? '生成图片弹窗' : '生成弹窗'}
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        {!text ? (
          <Alert
            type="warning"
            message="请先输入口播文稿"
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : (
          <>
            {/* 弹窗类型切换 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>弹窗类型</div>
              <Radio.Group
                value={popupType}
                onChange={e => {
                  setPopupType(e.target.value);
                  if (e.target.value === 'image' && keywordImages.length === 0) {
                    autoSearchImages();
                  }
                }}
                optionType="button"
                buttonStyle="solid"
              >
                <Radio.Button value="text">文字弹窗</Radio.Button>
                <Radio.Button value="image">图片弹窗</Radio.Button>
              </Radio.Group>
            </div>

            {popupType === 'text' ? (
              <>
                {/* 样式选择 */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 8, fontWeight: 500 }}>选择样式</div>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="选择大字报样式"
                    value={selectedStyle || undefined}
                    onChange={setSelectedStyle}
                    options={posterStyles.map(s => ({
                      label: s.name,
                      value: s.id,
                    }))}
                  />
                  {currentStyle && (
                    <div style={{ marginTop: 4, color: '#666', fontSize: 12 }}>
                      {currentStyle.description}
                    </div>
                  )}
                </div>

            {/* 弹窗时长 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>弹窗时长</div>
              <Space>
                <InputNumber
                  min={1}
                  max={10}
                  value={popupDuration}
                  onChange={v => setPopupDuration(v || 2)}
                />
                <span>秒</span>
                <span style={{ color: '#666', fontSize: 12 }}>
                  每个弹窗显示的时长
                </span>
              </Space>
            </div>

            <Divider />

            {/* 关键词提取配置 */}
            <Collapse
              size="small"
              style={{ marginBottom: 16 }}
              items={[{
                key: 'config',
                label: (
                  <Space>
                    <SettingOutlined />
                    <span>关键词提取设置</span>
                    <Tag color="blue">{keywords.length} 个</Tag>
                  </Space>
                ),
                children: (
                  <div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>
                        关键词密度（越大提取越多）
                      </div>
                      <Slider
                        min={1}
                        max={10}
                        value={extractConfig.density}
                        onChange={v => setExtractConfig({ ...extractConfig, density: v })}
                        marks={{ 1: '少', 5: '中', 10: '多' }}
                      />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>
                        关键词长度范围
                      </div>
                      <Space>
                        <InputNumber
                          size="small"
                          min={1}
                          max={extractConfig.maxLength}
                          value={extractConfig.minLength}
                          onChange={v => setExtractConfig({ ...extractConfig, minLength: v || 2 })}
                          addonBefore="最短"
                          style={{ width: 100 }}
                        />
                        <InputNumber
                          size="small"
                          min={extractConfig.minLength}
                          max={10}
                          value={extractConfig.maxLength}
                          onChange={v => setExtractConfig({ ...extractConfig, maxLength: v || 6 })}
                          addonBefore="最长"
                          style={{ width: 100 }}
                        />
                      </Space>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>
                        最大关键词数量
                      </div>
                      <Slider
                        min={5}
                        max={30}
                        value={extractConfig.maxCount}
                        onChange={v => setExtractConfig({ ...extractConfig, maxCount: v })}
                        marks={{ 5: '5', 15: '15', 30: '30' }}
                      />
                    </div>
                    <Button
                      type="primary"
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={() => reloadKeywords(extractConfig)}
                      loading={loading}
                    >
                      重新提取关键词
                    </Button>
                  </div>
                ),
              }]}
            />

            {/* 关键词选择 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 500 }}>
                  提取的关键词 ({selectedKeywords.length}/{keywords.length})
                </span>
                <Button size="small" onClick={toggleSelectAll}>
                  {selectedKeywords.length === keywords.length ? '取消全选' : '全选'}
                </Button>
              </div>

              {keywords.length === 0 ? (
                <Alert
                  type="info"
                  message="未能从文稿中提取到关键词"
                  showIcon
                />
              ) : (
                <div
                  style={{
                    padding: 12,
                    background: '#f5f5f5',
                    borderRadius: 8,
                    maxHeight: 200,
                    overflowY: 'auto',
                  }}
                >
                  <Space wrap>
                    {keywords.map((keyword) => (
                      <Tag
                        key={keyword.text}
                        color={selectedKeywords.includes(keyword.text) ? 'blue' : 'default'}
                        style={{ cursor: 'pointer', padding: '4px 8px' }}
                        onClick={() => toggleKeyword(keyword.text)}
                      >
                        <Checkbox
                          checked={selectedKeywords.includes(keyword.text)}
                          style={{ marginRight: 4 }}
                        />
                        {keyword.text}
                        <span style={{ marginLeft: 4, color: '#999', fontSize: 11 }}>
                          ({formatTime(keyword.suggestedTime)})
                        </span>
                      </Tag>
                    ))}
                  </Space>
                </div>
              )}
            </div>

            {/* 预览效果 */}
            {currentStyle && selectedKeywords.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>预览效果</div>
                <div
                  style={{
                    padding: 24,
                    background: '#1a1a1a',
                    borderRadius: 8,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: 120,
                  }}
                >
                  <div
                    style={{
                      backgroundColor: currentStyle.config.backgroundColor,
                      color: currentStyle.config.textColor,
                      fontSize: Math.min(currentStyle.config.fontSize || 72, 48),
                      fontWeight: currentStyle.config.fontWeight || 'bold',
                      padding: 16,
                      borderRadius: currentStyle.config.borderRadius || 0,
                      boxShadow: currentStyle.config.boxShadow,
                      borderWidth: currentStyle.config.borderWidth,
                      borderColor: currentStyle.config.borderColor,
                      borderStyle: currentStyle.config.borderWidth ? 'solid' : 'none',
                      textAlign: 'center',
                    }}
                  >
                    {selectedKeywords[0]}
                  </div>
                </div>
              </div>
            )}
              </>
            ) : (
              /* 图片弹窗模式 */
              <Spin spinning={loadingImages}>
                {/* 弹窗时长 */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 8, fontWeight: 500 }}>弹窗时长</div>
                  <Space>
                    <InputNumber
                      min={1}
                      max={10}
                      value={popupDuration}
                      onChange={v => setPopupDuration(v || 2)}
                    />
                    <span>秒</span>
                  </Space>
                </div>

                <Divider />

                {/* 关键词图片列表 */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 500 }}>
                      关键词图片 ({keywordImages.filter(i => i.image).length}/{keywordImages.length})
                    </span>
                    <Space>
                      <Button size="small" icon={<PlusOutlined />} onClick={addKeywordImage}>
                        添加
                      </Button>
                      <Button size="small" onClick={autoSearchImages} loading={loadingImages}>
                        重新匹配
                      </Button>
                    </Space>
                  </div>

                  {keywordImages.length === 0 ? (
                    <Alert type="info" message="点击上方按钮添加关键词图片" showIcon />
                  ) : (
                    <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                      {keywordImages.map((item, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px 12px',
                            background: index % 2 === 0 ? '#fafafa' : '#fff',
                            borderRadius: 4,
                            marginBottom: 4,
                          }}
                        >
                          <span style={{ width: 80, fontWeight: 500 }}>
                            {item.keyword.text}
                          </span>
                          <span style={{ width: 60, color: '#999', fontSize: 12 }}>
                            {formatTime(item.keyword.suggestedTime)}
                          </span>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {item.image ? (
                              item.image.type === 'emoji' ? (
                                <span style={{ fontSize: 32 }}>{item.image.emoji}</span>
                              ) : (
                                <img
                                  src={item.image.thumbUrl || item.image.url}
                                  alt=""
                                  style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }}
                                />
                              )
                            ) : (
                              <div style={{
                                width: 48,
                                height: 48,
                                background: '#f0f0f0',
                                borderRadius: 4,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#999',
                              }}>
                                <PictureOutlined />
                              </div>
                            )}
                          </div>
                          <Space>
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => openEditKeyword(index)}
                            >
                              编辑
                            </Button>
                            <Button
                              size="small"
                              icon={<SwapOutlined />}
                              onClick={() => openImagePicker(index)}
                            >
                              换图
                            </Button>
                            <Button
                              size="small"
                              icon={<DeleteOutlined />}
                              danger
                              onClick={() => removeKeywordImage(index)}
                            />
                          </Space>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Spin>
            )}
          </>
        )}
      </Spin>

      {/* 图片选择器 */}
      <ImagePicker
        open={showImagePicker}
        keyword={editingKeywordIndex >= 0 ? keywordImages[editingKeywordIndex]?.keyword.text : ''}
        onSelect={handleImageSelected}
        onCancel={() => setShowImagePicker(false)}
      />

      {/* 编辑关键词弹窗 */}
      <Modal
        title={editingKeywordIndex >= 0 && editingKeywordIndex < keywordImages.length ? '编辑关键词' : '添加关键词'}
        open={showEditKeyword}
        onCancel={() => setShowEditKeyword(false)}
        onOk={saveEditKeyword}
        width={450}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>关键词文字</div>
          <Input
            placeholder="请输入关键词（需在正文中存在）"
            value={editKeywordText}
            onChange={e => handleKeywordTextChange(e.target.value)}
            maxLength={20}
            status={keywordMatchResult && !keywordMatchResult.found ? 'error' : undefined}
          />
          {/* 匹配状态提示 */}
          {keywordMatchResult && (
            <div style={{ marginTop: 8 }}>
              {keywordMatchResult.found ? (
                <Alert
                  type="success"
                  message={`已在正文中找到该关键词，建议出现时间：${keywordMatchResult.suggestedTime}秒`}
                  showIcon
                  style={{ padding: '4px 12px' }}
                />
              ) : (
                <Alert
                  type="error"
                  message="该关键词在正文中未找到，请更换关键词"
                  showIcon
                  style={{ padding: '4px 12px' }}
                />
              )}
            </div>
          )}
        </div>
        <div>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>出现时间（秒）</div>
          <Space>
            <InputNumber
              min={0}
              max={Math.ceil((estimatedDurationMs || 60000) / 1000)}
              value={editKeywordTime}
              onChange={v => setEditKeywordTime(v || 0)}
              style={{ width: 100 }}
            />
            <span style={{ color: '#999', fontSize: 12 }}>
              视频总时长约 {Math.ceil((estimatedDurationMs || 60000) / 1000)} 秒
            </span>
          </Space>
        </div>
      </Modal>

      {/* 保存模板弹窗 */}
      <Modal
        title="保存为模板"
        open={showSaveTemplate}
        onCancel={() => setShowSaveTemplate(false)}
        onOk={handleSaveTemplate}
        confirmLoading={savingTemplate}
      >
        <div style={{ marginBottom: 8 }}>模板名称</div>
        <Input
          placeholder="请输入模板名称"
          value={templateName}
          onChange={e => setTemplateName(e.target.value)}
        />
      </Modal>
    </Modal>
  );
}
