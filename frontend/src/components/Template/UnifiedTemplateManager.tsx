/**
 * 统一模板管理器组件
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Row,
  Col,
  Input,
  Select,
  Tabs,
  Empty,
  Spin,
  message,
  Modal,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import {
  getTemplates,
  deleteTemplate,
  cloneTemplate,
  UnifiedTemplate,
  TemplateType,
  TemplateFilters,
} from './api';
import TemplateCard from './TemplateCard';

const { Search } = Input;

interface UnifiedTemplateManagerProps {
  onSelect?: (template: UnifiedTemplate) => void;
  defaultType?: TemplateType;
}

export const UnifiedTemplateManager: React.FC<UnifiedTemplateManagerProps> = ({
  onSelect,
  defaultType,
}) => {
  const [templates, setTemplates] = useState<UnifiedTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<TemplateFilters>({
    type: defaultType,
  });
  const [searchText, setSearchText] = useState('');

  // 加载模板列表
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTemplates({
        ...filters,
        search: searchText || undefined,
      });
      setTemplates(result.templates);
    } catch (error) {
      message.error('加载模板失败');
    } finally {
      setLoading(false);
    }
  }, [filters, searchText]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Search
          placeholder="搜索模板"
          allowClear
          onSearch={(value) => setSearchText(value)}
          style={{ width: 300 }}
        />
      </div>
      <Spin spinning={loading}>
        {templates.length === 0 ? (
          <Empty description="暂无模板" />
        ) : (
          <Row gutter={[16, 16]}>
            {templates.map((template) => (
              <Col key={template.id} xs={24} sm={12} md={8} lg={6}>
                <TemplateCard
                  template={template}
                  onSelect={onSelect}
                />
              </Col>
            ))}
          </Row>
        )}
      </Spin>
    </div>
  );
};

export default UnifiedTemplateManager;
