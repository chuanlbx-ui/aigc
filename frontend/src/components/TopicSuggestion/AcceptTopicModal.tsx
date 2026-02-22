import React, { useState } from 'react';
import { Modal, Form, Select, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTopicSuggestionStore } from '../../stores/topicSuggestion';
import { useAuthStore } from '../../stores/authStore';
import type { TopicSuggestion } from '../../stores/topicSuggestion';

interface AcceptTopicModalProps {
  visible: boolean;
  topic: TopicSuggestion | null;
  onCancel: () => void;
}

const AcceptTopicModal: React.FC<AcceptTopicModalProps> = ({
  visible,
  topic,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { acceptTopic, setAcceptedTopicData } = useTopicSuggestionStore();
  const { user } = useAuthStore();

  const handleSubmit = async () => {
    if (!topic) return;

    try {
      const values = await form.validateFields();
      setLoading(true);

      // 调用接受选题 API
      const result = await acceptTopic(
        topic.id,
        values.platform,
        values.column,
        user?.id,
        values.categoryId
      );

      // 存储选题数据到全局状态
      setAcceptedTopicData({
        id: topic.id,
        title: topic.title,
        description: topic.description,
        domain: topic.domain,
        tags: topic.tags,
        source: topic.source,
        sourceType: topic.sourceType,
        hotScore: topic.hotScore,
        qualityScore: topic.qualityScore,
        recommendScore: topic.recommendScore,
        relevanceScore: topic.relevanceScore,
        matchedKnowledgeIds: topic.matchedKnowledgeIds,
        category: topic.category,
        sourceUrl: topic.sourceUrl,
        fetchedAt: topic.fetchedAt,
        createdAt: topic.createdAt,
      });

      message.success('选题已接受,正在跳转到编辑器...');

      // 导航到编辑器,传递 fromTopic=true 参数
      navigate(`/articles/${result.id}/edit?fromTopic=true`);

      onCancel();
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误
        return;
      }
      message.error(error.message || '接受选题失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="接受选题"
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={loading}
      okText="确定"
      cancelText="取消"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          platform: '公众号',
          column: '深度分析',
        }}
      >
        <Form.Item
          label="发布平台"
          name="platform"
          rules={[{ required: true, message: '请选择发布平台' }]}
        >
          <Select>
            <Select.Option value="公众号">公众号</Select.Option>
            <Select.Option value="小红书">小红书</Select.Option>
            <Select.Option value="知乎">知乎</Select.Option>
            <Select.Option value="B站">B站</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="栏目"
          name="column"
          rules={[{ required: true, message: '请选择栏目' }]}
        >
          <Select>
            <Select.Option value="深度分析">深度分析</Select.Option>
            <Select.Option value="速递">速递</Select.Option>
            <Select.Option value="体验报告">体验报告</Select.Option>
            <Select.Option value="教程">教程</Select.Option>
            <Select.Option value="对话">对话</Select.Option>
          </Select>
        </Form.Item>

        {/* 暂时移除分类选择,因为需要从后端获取真实的分类列表 */}
        {/* <Form.Item label="分类" name="categoryId">
          <Select allowClear placeholder="请选择分类(可选)">
            <Select.Option value="tech">科技</Select.Option>
            <Select.Option value="ai">人工智能</Select.Option>
            <Select.Option value="business">商业</Select.Option>
            <Select.Option value="product">产品</Select.Option>
          </Select>
        </Form.Item> */}
      </Form>
    </Modal>
  );
};

export default AcceptTopicModal;
