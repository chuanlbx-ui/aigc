/**
 * 导入配置模态框组件
 */

import React, { useState } from 'react';
import { Modal, Input, Upload, Button, message, Radio } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';

interface ImportModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ visible, onClose, onSuccess }) => {
  const [importMethod, setImportMethod] = useState<'file' | 'text'>('file');
  const [importText, setImportText] = useState('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [overwrite, setOverwrite] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    setLoading(true);
    try {
      let data;

      if (importMethod === 'file' && fileList.length > 0) {
        const file = fileList[0];
        const text = await file.originFileObj?.text();
        data = JSON.parse(text || '{}');
      } else if (importMethod === 'text' && importText) {
        data = JSON.parse(importText);
      } else {
        message.error('请提供导入内容');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/workflow-templates/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, overwrite }),
      });

      if (response.ok) {
        message.success('导入成功');
        onSuccess();
        handleClose();
      } else {
        const error = await response.json();
        message.error(error.error || '导入失败');
      }
    } catch (error) {
      message.error('导入失败：JSON 格式错误');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setImportText('');
    setFileList([]);
    setOverwrite(false);
    onClose();
  };

  return (
    <Modal
      title="导入配置模板"
      open={visible}
      onCancel={handleClose}
      onOk={handleImport}
      confirmLoading={loading}
      width={600}
    >
      <div style={{ marginBottom: '16px' }}>
        <Radio.Group value={importMethod} onChange={(e) => setImportMethod(e.target.value)}>
          <Radio value="file">上传文件</Radio>
          <Radio value="text">粘贴 JSON</Radio>
        </Radio.Group>
      </div>

      {importMethod === 'file' ? (
        <Upload
          fileList={fileList}
          onChange={({ fileList }) => setFileList(fileList)}
          beforeUpload={() => false}
          accept=".json"
          maxCount={1}
        >
          <Button icon={<UploadOutlined />}>选择 JSON 文件</Button>
        </Upload>
      ) : (
        <Input.TextArea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="粘贴配置 JSON 内容"
          rows={10}
        />
      )}

      <div style={{ marginTop: '16px' }}>
        <Radio.Group value={overwrite} onChange={(e) => setOverwrite(e.target.value)}>
          <Radio value={false}>如果同名则跳过</Radio>
          <Radio value={true}>如果同名则覆盖</Radio>
        </Radio.Group>
      </div>
    </Modal>
  );
};

export default ImportModal;
