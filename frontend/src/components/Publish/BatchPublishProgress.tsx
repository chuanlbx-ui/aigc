import React, { useCallback, useEffect, useState } from 'react';
import { API_CONFIG } from '../../api/config';
import { useWebSocket } from '../../hooks/useWebSocket';

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

function getProgressUrl(batchId: string): string {
  return API_CONFIG.baseUrl
    ? `${API_CONFIG.baseUrl}/api/publish/batch/${batchId}/progress`
    : `/api/publish/batch/${batchId}/progress`;
}

function getCancelUrl(batchId: string): string {
  return API_CONFIG.baseUrl
    ? `${API_CONFIG.baseUrl}/api/publish/batch/${batchId}/cancel`
    : `/api/publish/batch/${batchId}/cancel`;
}

export const BatchPublishProgress: React.FC<Props> = ({ batchId, onClose }) => {
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    try {
      const response = await fetch(getProgressUrl(batchId));
      if (!response.ok) {
        throw new Error('获取进度失败');
      }

      const data = (await response.json()) as BatchProgress;
      setProgress(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取进度失败');
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  const isTerminal =
    progress?.batch.status === 'completed' || progress?.batch.status === 'cancelled';

  useEffect(() => {
    void fetchProgress();

    if (isTerminal) {
      return;
    }

    const interval = window.setInterval(() => {
      void fetchProgress();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [fetchProgress, isTerminal]);

  useWebSocket({
    batchId,
    enabled: !isTerminal,
    onMessage: (event) => {
      if (event.type === 'publish:status' && event.batchId === batchId) {
        void fetchProgress();
      }
    },
  });

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="mx-4 w-full max-w-2xl rounded-lg bg-white p-6">
          <div className="text-center">加载中...</div>
        </div>
      </div>
    );
  }

  if (error || !progress) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="mx-4 w-full max-w-2xl rounded-lg bg-white p-6">
          <div className="text-red-600">错误: {error || '未知错误'}</div>
          <button
            onClick={onClose}
            className="mt-4 rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
          >
            关闭
          </button>
        </div>
      </div>
    );
  }

  const { batch, records } = progress;
  const progressPercent =
    batch.totalCount > 0
      ? Math.round(((batch.successCount + batch.failedCount) / batch.totalCount) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">批量发布进度</h2>
          {isTerminal && (
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ×
            </button>
          )}
        </div>

        <div className="mb-6">
          <div className="mb-2 flex justify-between text-sm">
            <span>总进度 {progressPercent}%</span>
            <span>
              {batch.successCount + batch.failedCount} / {batch.totalCount}
            </span>
          </div>
          <div className="h-4 w-full rounded-full bg-gray-200">
            <div
              className="h-4 rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="mb-6 grid grid-cols-4 gap-4">
          <div className="rounded bg-gray-100 p-3">
            <div className="text-sm text-gray-600">总数</div>
            <div className="text-2xl font-bold">{batch.totalCount}</div>
          </div>
          <div className="rounded bg-yellow-100 p-3">
            <div className="text-sm text-gray-600">待处理</div>
            <div className="text-2xl font-bold">{batch.pendingCount}</div>
          </div>
          <div className="rounded bg-green-100 p-3">
            <div className="text-sm text-gray-600">成功</div>
            <div className="text-2xl font-bold">{batch.successCount}</div>
          </div>
          <div className="rounded bg-red-100 p-3">
            <div className="text-sm text-gray-600">失败</div>
            <div className="text-2xl font-bold">{batch.failedCount}</div>
          </div>
        </div>

        <div>
          <h3 className="mb-3 font-semibold">发布详情</h3>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {records.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between rounded bg-gray-50 p-3"
              >
                <div className="flex-1">
                  <div className="font-medium">{record.contentTitle}</div>
                  <div className="text-sm text-gray-600">{record.platformName}</div>
                  {record.errorMessage && (
                    <div className="mt-1 text-sm text-red-600">{record.errorMessage}</div>
                  )}
                </div>
                <div className="ml-4">
                  {record.status === 'pending' && (
                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm text-yellow-800">
                      待处理
                    </span>
                  )}
                  {record.status === 'processing' && (
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
                      处理中
                    </span>
                  )}
                  {(record.status === 'published' || record.status === 'draft_saved') && (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800">
                      成功
                    </span>
                  )}
                  {record.status === 'failed' && (
                    <span className="rounded-full bg-red-100 px-3 py-1 text-sm text-red-800">
                      失败
                    </span>
                  )}
                  {record.status === 'cancelled' && (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-sm text-gray-700">
                      已取消
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          {batch.status === 'processing' && (
            <button
              onClick={async () => {
                if (!window.confirm('确定要取消批量发布吗？')) {
                  return;
                }

                await fetch(getCancelUrl(batchId), { method: 'POST' });
                await fetchProgress();
              }}
              className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              取消发布
            </button>
          )}
          {isTerminal && (
            <button
              onClick={onClose}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              关闭
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
