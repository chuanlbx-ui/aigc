import { useEffect, useRef, useState } from 'react';
import { Modal, Spin, Empty, message } from 'antd';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';

interface Props {
  open: boolean;
  onCancel: () => void;
  onNodeClick?: (docId: string) => void;
}

export default function KnowledgeGraph({ open, onCancel, onNodeClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ docs: 0, connections: 0 });

  useEffect(() => {
    if (!open) return;
    loadGraph();
    return () => {
      networkRef.current?.destroy();
      networkRef.current = null;
    };
  }, [open]);

  const loadGraph = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/knowledge/graph');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStats(data.stats);
      if (data.nodes.length === 0) return;

      renderGraph(data.nodes, data.edges);
    } catch (error) {
      message.error('加载图谱失败');
    } finally {
      setLoading(false);
    }
  };

  const renderGraph = (nodes: any[], edges: any[]) => {
    if (!containerRef.current) return;

    const nodesDataSet = new DataSet<any>(nodes.map(n => ({
      id: n.id,
      label: n.label.length > 10 ? n.label.slice(0, 10) + '...' : n.label,
      title: n.label,
      color: { background: n.color || '#6366f1', border: '#4f46e5' },
      font: { color: '#333' },
    })));

    const edgesDataSet = new DataSet<any>(edges.map(e => ({
      from: e.from,
      to: e.to,
      title: e.label,
      color: { color: '#ddd', highlight: '#6366f1' },
    })));

    const options = {
      nodes: {
        shape: 'dot',
        size: 16,
        font: { size: 12 },
        borderWidth: 2,
      },
      edges: {
        width: 1,
        smooth: { enabled: true, type: 'continuous', roundness: 0.5 },
      },
      physics: {
        stabilization: { iterations: 100 },
        barnesHut: { gravitationalConstant: -2000, springLength: 150 },
      },
      interaction: { hover: true, tooltipDelay: 200 },
    };

    networkRef.current = new Network(containerRef.current, { nodes: nodesDataSet, edges: edgesDataSet }, options);

    networkRef.current.on('click', (params) => {
      if (params.nodes.length > 0 && onNodeClick) {
        onNodeClick(params.nodes[0]);
      }
    });
  };

  return (
    <Modal
      title={`知识图谱 (${stats.docs} 文档, ${stats.connections} 连接)`}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={900}
      styles={{ body: { height: 500, padding: 0 } }}
    >
      {loading ? (
        <div style={{ height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spin tip="加载中..." />
        </div>
      ) : stats.docs === 0 ? (
        <Empty description="暂无数据" style={{ marginTop: 150 }} />
      ) : (
        <div ref={containerRef} style={{ height: 500, width: '100%' }} />
      )}
    </Modal>
  );
}
