import { useState } from 'react';
import { Button, List, Empty, Space, Tag, message, Popover } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined, AppstoreOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HolderOutlined } from '@ant-design/icons';
import type { Popup } from '../../../stores/editor';
import PopupModal from './PopupModal';
import TemplateSelector from './TemplateSelector';
import PopupAutoGenerator from './PopupAutoGenerator';
import type { PopupTemplateConfig } from './templateApi';

interface PopupEditorProps {
  popups: Popup[];
  onChange: (popups: Popup[]) => void;
  estimatedDurationMs?: number;
  text?: string;
}

// 生成唯一ID
const generateId = () => `popup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// 默认弹窗配置
const defaultPopup: Omit<Popup, 'id'> = {
  contentType: 'text',
  textContent: '弹窗文字',
  textAlign: 'center',
  fontSize: 24,
  textColor: '#ffffff',
  width: 300,
  height: 150,
  position: 'center',
  startTime: 0,
  duration: 3,
  enterAnimation: 'fade',
  exitAnimation: 'fade',
  animationDuration: 15,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  borderRadius: 12,
  padding: 16,
  zIndex: 100,
  videoMuted: true,
  mediaFit: 'cover',
};

// 内容类型图标
const contentTypeIcon: Record<string, string> = {
  text: '📝',
  image: '🖼️',
  video: '🎬',
};

// 预览内容组件
function PopupPreview({ popup }: { popup: Popup }) {
  if (popup.contentType === 'text') {
    return (
      <div style={{
        padding: 12,
        background: popup.backgroundColor || '#000',
        color: popup.textColor || '#fff',
        borderRadius: popup.borderRadius || 8,
        fontSize: Math.min(popup.fontSize || 24, 18),
        fontWeight: popup.fontWeight || 'normal',
        textAlign: (popup.textAlign as 'left' | 'center' | 'right') || 'center',
        maxWidth: 200,
        wordBreak: 'break-word',
      }}>
        {popup.textContent || '文字弹窗'}
      </div>
    );
  }

  if (popup.contentType === 'image') {
    const imgUrl = popup.mediaUrl || (popup.mediaAssetId ? `/api/assets/${popup.mediaAssetId}/file` : '');
    return imgUrl ? (
      <img
        src={imgUrl}
        alt="预览"
        style={{ maxWidth: 200, maxHeight: 150, borderRadius: 8, objectFit: 'contain' }}
      />
    ) : (
      <div style={{ color: '#999', padding: 20 }}>暂无图片</div>
    );
  }

  if (popup.contentType === 'video') {
    const videoUrl = popup.mediaUrl || (popup.mediaAssetId ? `/api/assets/${popup.mediaAssetId}/file` : '');
    return videoUrl ? (
      <video
        src={videoUrl}
        style={{ maxWidth: 200, maxHeight: 150, borderRadius: 8 }}
        muted
        autoPlay
        loop
        playsInline
      />
    ) : (
      <div style={{ color: '#999', padding: 20 }}>暂无视频</div>
    );
  }

  return null;
}

// 可拖拽的弹窗项
function SortablePopupItem({
  popup,
  index,
  onEdit,
  onCopy,
  onRemove,
}: {
  popup: Popup;
  index: number;
  onEdit: () => void;
  onCopy: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: popup.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <List.Item
        actions={[
          <Button key="edit" icon={<EditOutlined />} size="small" onClick={onEdit} />,
          <Button key="copy" icon={<CopyOutlined />} size="small" onClick={onCopy} />,
          <Button key="delete" icon={<DeleteOutlined />} size="small" danger onClick={onRemove} />,
        ]}
      >
        <Space>
          <span style={{ width: 24, textAlign: 'center', color: '#999', fontWeight: 500 }}>{index + 1}</span>
          <HolderOutlined {...attributes} {...listeners} style={{ cursor: 'grab', color: '#999' }} />
          <span>{contentTypeIcon[popup.contentType]}</span>
          <Popover
            content={<PopupPreview popup={popup} />}
            title="弹窗预览"
            trigger="hover"
            placement="right"
          >
            <span style={{
              maxWidth: 150,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              borderBottom: '1px dashed #ccc',
            }}>
              {popup.contentType === 'text' ? popup.textContent?.slice(0, 10) || '文字弹窗' : popup.contentType === 'image' ? '图片弹窗' : '视频弹窗'}
            </span>
          </Popover>
          <Tag color="blue">{popup.startTime}s</Tag>
          <Tag color="green">{popup.duration}s</Tag>
        </Space>
      </List.Item>
    </div>
  );
}

export default function PopupEditor({ popups, onChange, estimatedDurationMs = 0, text = '' }: PopupEditorProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingPopup, setEditingPopup] = useState<Popup | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showAutoGenerator, setShowAutoGenerator] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = popups.findIndex(p => p.id === active.id);
      const newIndex = popups.findIndex(p => p.id === over.id);
      onChange(arrayMove(popups, oldIndex, newIndex));
    }
  };

  const handleAdd = () => {
    setEditingPopup({ ...defaultPopup, id: generateId() });
    setEditingIndex(-1);
    setShowModal(true);
  };

  // 从模板创建弹窗
  const handleCreateFromTemplate = (templateConfig: PopupTemplateConfig) => {
    const newPopup: Popup = {
      ...templateConfig,
      id: generateId(),
      startTime: 0,
      duration: 3,
    } as Popup;
    setEditingPopup(newPopup);
    setEditingIndex(-1);
    setShowTemplateSelector(false);
    setShowModal(true);
  };

  const handleEdit = (popup: Popup, index: number) => {
    setEditingPopup({ ...popup });
    setEditingIndex(index);
    setShowModal(true);
  };

  const handleCopy = (popup: Popup) => {
    const newPopup = { ...popup, id: generateId(), startTime: popup.startTime + popup.duration };
    onChange([...popups, newPopup]);
    message.success('已复制弹窗');
  };

  const handleRemove = (id: string) => {
    onChange(popups.filter(p => p.id !== id));
  };

  const handleSave = (popup: Popup) => {
    if (editingIndex >= 0) {
      const newPopups = [...popups];
      newPopups[editingIndex] = popup;
      onChange(newPopups);
    } else {
      onChange([...popups, popup]);
    }
    setShowModal(false);
    setEditingPopup(null);
  };

  // 处理自动生成的弹窗
  const handleAutoGenerated = (generatedPopups: Popup[]) => {
    onChange([...popups, ...generatedPopups]);
  };

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button icon={<PlusOutlined />} onClick={handleAdd}>
          添加弹窗
        </Button>
        <Button icon={<AppstoreOutlined />} onClick={() => setShowTemplateSelector(true)}>
          从模板创建
        </Button>
        <Button
          icon={<ThunderboltOutlined />}
          onClick={() => setShowAutoGenerator(true)}
          disabled={!text}
        >
          自动生成
        </Button>
        {popups.length > 0 && (
          <Tag>{popups.length} 个弹窗</Tag>
        )}
      </Space>

      {popups.length === 0 ? (
        <Empty description="暂无弹窗，点击添加" style={{ marginTop: 16 }} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={popups.map(p => p.id)} strategy={verticalListSortingStrategy}>
            <List
              size="small"
              bordered
              dataSource={popups}
              renderItem={(item, index) => (
                <SortablePopupItem
                  key={item.id}
                  popup={item}
                  index={index}
                  onEdit={() => handleEdit(item, index)}
                  onCopy={() => handleCopy(item)}
                  onRemove={() => handleRemove(item.id)}
                />
              )}
            />
          </SortableContext>
        </DndContext>
      )}

      <PopupModal
        open={showModal}
        popup={editingPopup}
        onCancel={() => { setShowModal(false); setEditingPopup(null); }}
        onSave={handleSave}
        maxDuration={estimatedDurationMs ? Math.ceil(estimatedDurationMs / 1000) : 60}
      />

      <TemplateSelector
        open={showTemplateSelector}
        onSelect={handleCreateFromTemplate}
        onCancel={() => setShowTemplateSelector(false)}
      />

      <PopupAutoGenerator
        open={showAutoGenerator}
        text={text}
        estimatedDurationMs={estimatedDurationMs}
        onGenerated={handleAutoGenerated}
        onClose={() => setShowAutoGenerator(false)}
      />
    </div>
  );
}
