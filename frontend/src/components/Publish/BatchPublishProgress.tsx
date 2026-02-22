/**
 * 批量发布进度显示组件
 */

import React, { useEffect, useState } from 'react';

interface BatchProgress {
  batch: {
    id: string;
    status: string;
    totalCount: number;
    pendingCount: number;
    successCount: number;
    failedCount: number;
    createdAt: string;
    completedAt: string | null;
  };
  records: Array<{
    id: string;
    contentTitle: string;
    platformName: string;
    status: string;
    errorMessage: string | null;
    publishedAt: string | null;
  }>;
}

interface Props {
  batchId: string;
  onClose?: () => void;
}

export const BatchPublishProgress: React.FC<Props> = ({ batchId, onClose }) => {
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 轮询获取进度
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/publish/batch/${batchId}/progress`);
        if (!response.ok) throw new Error('获取进度失败');

        const data = await response.json();
        setProgress(data);
        setLoading(false);

        // 如果批次已完成，停止轮询
        if (data.batch.status === 'completed' || data.batch.status === 'cancelled') {
          return;
        }
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    // 立即执行一次
    fetchProgress();

    // 每3秒轮询一次
    const interval = setInterval(fetchProgress, 3000);

    return () => clearInterval(interval);
  }, [batchId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
          <div className="text-center">加载中...</div>
        </div>
      </div>
    );
  }

  if (error || !progress) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
          <div className="text-red-600">错误: {error || '未知错误'}</div>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            关闭
          </button>
        </div>
      </div>
    );
  }

  const { batch, records } = progress;
  const progressPercent = batch.totalCount > 0
    ? Math.round(((batch.successCount + batch.failedCount) / batch.totalCount) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* 标题 */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">批量发布进度</h2>
          {(batch.status === 'completed' || batch.status === 'cancelled') && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          )}
        </div>

        {/* 进度条 */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span>总进度: {progressPercent}%</span>
            <span>
              {batch.successCount + batch.failedCount} / {batch.totalCount}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-100 p-3 rounded">
            <div className="text-sm text-gray-600">总数</div>
            <div className="text-2xl font-bold">{batch.totalCount}</div>
          </div>
          <div className="bg-yellow-100 p-3 rounded">
            <div className="text-sm text-gray-600">待处理</div>
            <div className="text-2xl font-bold">{batch.pendingCount}</div>
          </div>
          <div className="bg-green-100 p-3 rounded">
            <div className="text-sm text-gray-600">成功</div>
            <div className="text-2xl font-bold">{batch.successCount}</div>
          </div>
          <div className="bg-red-100 p-3 rounded">
            <div className="text-sm text-gray-600">失败</div>
            <div className="text-2xl font-bold">{batch.failedCount}</div>
          </div>
        </div>

        {/* 详细记录 */}
        <div>
          <h3 className="font-semibold mb-3">发布详情</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {records.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded"
              >
                <div className="flex-1">
                  <div className="font-medium">{record.contentTitle}</div>
                  <div className="text-sm text-gray-600">{record.platformName}</div>
                </div>
                <div className="ml-4">
                  {record.status === 'pending' && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                      待处理
                    </span>
                  )}
                  {record.status === 'processing' && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      处理中
                    </span>
                  )}
                  {(record.status === 'published' || record.status === 'draft_saved') && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      成功
                    </span>
                  )}
                  {record.status === 'failed' && (
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                      失败
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="mt-6 flex justify-end gap-3">
          {batch.status === 'processing' && (
            <button
              onClick={async () => {
                if (confirm('确定要取消批量发布吗？')) {
                  await fetch(`/api/publish/batch/${batchId}/cancel`, {
                    method: 'POST',
                  });
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              取消发布
            </button>
          )}
          {(batch.status === 'completed' || batch.status === 'cancelled') && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              关闭
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
