import { useEffect, useRef, useState } from 'react';
import { Card, Select, Spin, Button, Space, message, Modal, Descriptions, Tag, Table } from 'antd';
import { FullscreenOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { Graph } from '@antv/x6';
import { useRequest } from 'ahooks';
import { roomsApi, topologyApi, devicesApi } from '../services/api';

const deviceTypeColors: Record<string, string> = {
  SERVER: '#4299e1',
  SWITCH: '#48bb78',
  ROUTER: '#ed8936',
  FIREWALL: '#e53e3e',
  STORAGE: '#9f7aea',
  PDU: '#38b2ac',
  OTHER: '#a0aec0',
};

const deviceTypeLabels: Record<string, string> = {
  SERVER: '服务器',
  SWITCH: '交换机',
  ROUTER: '路由器',
  FIREWALL: '防火墙',
  STORAGE: '存储',
  PDU: '配电单元',
  OTHER: '其他',
};

const statusColors: Record<string, string> = {
  ONLINE: '#48bb78',
  MOVING: '#ed8936',
  OFFLINE: '#e53e3e',
  ARRIVED: '#4299e1',
};

const statusLabels: Record<string, string> = {
  ONLINE: '在线',
  MOVING: '搬迁中',
  OFFLINE: '离线',
  ARRIVED: '已到达',
};

const cableStatusColors: Record<string, string> = {
  RECORDED: '#a0aec0',
  LABELED: '#4299e1',
  DISCONNECTED: '#ed8936',
  VERIFIED: '#48bb78',
};

const cableStatusLabels: Record<string, string> = {
  RECORDED: '已记录',
  LABELED: '已贴标',
  DISCONNECTED: '已拆除',
  VERIFIED: '已验证',
};

const cableTypeLabels: Record<string, string> = {
  FIBER: '光纤',
  CAT6: 'CAT6网线',
  CAT5E: 'CAT5E网线',
  POWER: '电源线',
  OTHER: '其他',
};

interface DeviceDetail {
  id: string;
  name: string;
  status: string;
  rackName?: string;
  positionU?: number;
  template?: {
    brand: string;
    model: string;
    deviceType: string;
    portLayout?: any;
  };
  cablesFrom?: any[];
  cablesTo?: any[];
}

interface EdgeDetail {
  id: string;
  source: string;
  sourcePort: string;
  sourceName?: string;
  target: string;
  targetPort: string;
  targetName?: string;
  cableType: string;
  status: string;
  color?: string;
  purpose?: string;
}

export default function Topology() {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [focusedNode, setFocusedNode] = useState<string | null>(null);
  // 设备详情弹窗
  const [deviceModalVisible, setDeviceModalVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceDetail | null>(null);
  const [deviceLoading, setDeviceLoading] = useState(false);

  // 连线详情弹窗
  const [edgeModalVisible, setEdgeModalVisible] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<EdgeDetail | null>(null);

  const { data: rooms } = useRequest(() => roomsApi.list({ pageSize: 100 }));

  const { data: topology, loading, refresh } = useRequest(
    () => (selectedRoom ? topologyApi.getByRoom(selectedRoom) : Promise.resolve(null)),
    {
      refreshDeps: [selectedRoom],
      ready: !!selectedRoom,
    }
  );

  // 获取设备详情
  const fetchDeviceDetail = async (deviceId: string) => {
    setDeviceLoading(true);
    try {
      const detail = await devicesApi.get(deviceId);
      setSelectedDevice(detail as DeviceDetail);
      setDeviceModalVisible(true);
    } catch (error) {
      message.error('获取设备详情失败');
    } finally {
      setDeviceLoading(false);
    }
  };

  // 初始化图实例
  useEffect(() => {
    if (!containerRef.current || graphRef.current) return;

    graphRef.current = new Graph({
      container: containerRef.current,
      width: containerRef.current.offsetWidth || 800,
      height: 600,
      background: { color: '#f5f5f5' },
      grid: { visible: true, size: 10, type: 'dot' },
      panning: true,
      mousewheel: {
        enabled: true,
        modifiers: ['ctrl', 'meta'],
      },
      connecting: {
        router: 'manhattan',
        connector: 'rounded',
        snap: true,
      },
    });

    // 节点双击事件 - 显示设备详情
    graphRef.current.on('node:dblclick', ({ node }) => {
      const nodeData = node.getData();
      if (nodeData?.id) {
        fetchDeviceDetail(nodeData.id);
      }
    });

    // 节点单击事件 - 聚焦模式
    graphRef.current.on('node:click', ({ node }) => {
      const nodeId = node.id;
      setFocusedNode((prev) => (prev === nodeId ? null : nodeId));
    });

    // 边双击事件 - 显示连线详情
    graphRef.current.on('edge:dblclick', ({ edge }) => {
      const edgeData = edge.getData();
      if (edgeData) {
        const topologyData = topology as any;
        const sourceNode = topologyData?.nodes?.find((n: any) => n.id === edgeData.source);
        const targetNode = topologyData?.nodes?.find((n: any) => n.id === edgeData.target);

        setSelectedEdge({
          ...edgeData,
          sourceName: sourceNode?.label || edgeData.source,
          targetName: targetNode?.label || edgeData.target,
        });
        setEdgeModalVisible(true);
      }
    });

    // 点击空白处取消聚焦
    graphRef.current.on('blank:click', () => {
      setFocusedNode(null);
    });
    return () => {
      graphRef.current?.dispose();
      graphRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!graphRef.current || !topology) return;

    const graph = graphRef.current;
    graph.clearCells();

    const topologyData = topology as any;
    if (!topologyData?.nodes?.length) return;

    const layers: Record<number, any[]> = { 0: [], 1: [], 2: [] };
    topologyData.nodes.forEach((node: any) => {
      const layer = node.layer ?? 2;
      if (!layers[layer]) layers[layer] = [];
      layers[layer].push(node);
    });

    const containerWidth = containerRef.current?.offsetWidth || 800;
    const layerHeight = 150;

    topologyData.nodes.forEach((node: any) => {
      const layer = node.layer ?? 2;
      const nodesInLayer = layers[layer];
      const index = nodesInLayer.indexOf(node);
      const spacing = containerWidth / (nodesInLayer.length + 1);

      graph.addNode({
        id: node.id,
        x: spacing * (index + 1) - 60,
        y: layer * layerHeight + 50,
        width: 120,
        height: 50,
        shape: 'rect',
        attrs: {
          body: {
            fill: deviceTypeColors[node.deviceType] || '#a0aec0',
            stroke: statusColors[node.status] || '#a0aec0',
            strokeWidth: 3,
            rx: 6,
            ry: 6,
            cursor: 'pointer',
          },
          label: {
            text: node.label || node.id,
            fill: '#fff',
            fontSize: 12,
            fontWeight: 'bold',
          },
        },
        data: node,
      });
    });

    topologyData.edges.forEach((edge: any) => {
      graph.addEdge({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        attrs: {
          line: {
            stroke: cableStatusColors[edge.status] || '#a0aec0',
            strokeWidth: 2,
            targetMarker: null,
            cursor: 'pointer',
          },
        },
        labels: [
          {
            attrs: {
              label: {
                text: `${edge.sourcePort} → ${edge.targetPort}`,
                fontSize: 9,
                fill: '#666',
              },
              rect: {
                fill: '#fff',
                stroke: '#ddd',
                strokeWidth: 1,
                rx: 3,
                ry: 3,
              },
            },
            position: 0.5,
          },
        ],
        data: edge,
      });
    });

    graph.centerContent();
  }, [topology]);

  // 聚焦模式效果
  useEffect(() => {
    if (!graphRef.current) return;
    const graph = graphRef.current;
    const nodes = graph.getNodes();
    const edges = graph.getEdges();

    if (!focusedNode) {
      nodes.forEach((node) => node.attr('body/opacity', 1));
      edges.forEach((edge) => edge.attr('line/opacity', 1));
      return;
    }

    const connectedEdges = edges.filter(
      (e) => e.getSourceCellId() === focusedNode || e.getTargetCellId() === focusedNode
    );
    const connectedNodeIds = new Set<string>();
    connectedNodeIds.add(focusedNode);
    connectedEdges.forEach((e) => {
      connectedNodeIds.add(e.getSourceCellId());
      connectedNodeIds.add(e.getTargetCellId());
    });

    nodes.forEach((node) => {
      node.attr('body/opacity', connectedNodeIds.has(node.id) ? 1 : 0.2);
    });
    edges.forEach((edge) => {
      const isConnected = connectedEdges.includes(edge);
      edge.attr('line/opacity', isConnected ? 1 : 0.1);
    });
  }, [focusedNode]);

  const handleExportImage = () => {
    if (!graphRef.current) return;
    try {
      (graphRef.current as any).toSVG((dataUri: string) => {
        const link = document.createElement('a');
        link.download = 'topology.svg';
        link.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(dataUri);
        link.click();
      });
      message.success('导出成功');
    } catch {
      message.error('导出失败');
    }
  };

  const handleFullscreen = () => {
    containerRef.current?.requestFullscreen?.();
  };

  const cableColumns = [
    { title: '端口', dataIndex: 'port', key: 'port' },
    { title: '对端设备', dataIndex: 'remoteName', key: 'remoteName' },
    { title: '对端端口', dataIndex: 'remotePort', key: 'remotePort' },
    { title: '线缆类型', dataIndex: 'cableType', key: 'cableType', render: (t: string) => cableTypeLabels[t] || t },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={cableStatusColors[s]}>{cableStatusLabels[s] || s}</Tag> },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="网络拓扑图"
        extra={
          <Space>
            <Select
              placeholder="选择机房"
              style={{ width: 200 }}
              value={selectedRoom || undefined}
              onChange={setSelectedRoom}
              options={(rooms as any)?.items?.map((r: any) => ({ label: r.name, value: r.id })) || []}
            />
            <Button icon={<ReloadOutlined />} onClick={refresh} disabled={!selectedRoom}>
              刷新
            </Button>
            <Button icon={<FullscreenOutlined />} onClick={handleFullscreen}>
              全屏
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExportImage}>
              导出
            </Button>
          </Space>
        }
      >
        {/* 图例 */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 12 }}>
          <div>
            <strong>设备类型：</strong>
            {Object.entries(deviceTypeColors).map(([type, color]) => (
              <span key={type} style={{ marginLeft: 8 }}>
                <span style={{ display: 'inline-block', width: 12, height: 12, backgroundColor: color, borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} />
                {deviceTypeLabels[type] || type}
              </span>
            ))}
          </div>
          <div>
            <strong>连线状态：</strong>
            {Object.entries(cableStatusColors).map(([status, color]) => (
              <span key={status} style={{ marginLeft: 8 }}>
                <span style={{ display: 'inline-block', width: 20, height: 3, backgroundColor: color, marginRight: 4, verticalAlign: 'middle' }} />
                {cableStatusLabels[status] || status}
              </span>
            ))}
          </div>
        </div>

        <Spin spinning={loading}>
          <div
            ref={containerRef}
            style={{ width: '100%', height: 600, border: '1px solid #e8e8e8', borderRadius: 4 }}
          />
        </Spin>

        {focusedNode && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
            提示：点击空白处取消聚焦，双击节点查看详情
          </div>
        )}
      </Card>

      {/* 设备详情弹窗 */}
      <Modal
        title="设备详情"
        open={deviceModalVisible}
        onCancel={() => { setDeviceModalVisible(false); setSelectedDevice(null); }}
        footer={null}
        width={700}
      >
        <Spin spinning={deviceLoading}>
          {selectedDevice && (
            <>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="设备名称">{selectedDevice.name}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={statusColors[selectedDevice.status]}>
                    {statusLabels[selectedDevice.status] || selectedDevice.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="设备类型">
                  <Tag color={deviceTypeColors[selectedDevice.template?.deviceType || 'OTHER']}>
                    {deviceTypeLabels[selectedDevice.template?.deviceType || 'OTHER']}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="品牌型号">
                  {selectedDevice.template?.brand} {selectedDevice.template?.model}
                </Descriptions.Item>
                <Descriptions.Item label="机柜位置">
                  {selectedDevice.rackName || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="U位">
                  {selectedDevice.positionU ?? '-'}
                </Descriptions.Item>
              </Descriptions>

              {(selectedDevice.cablesFrom?.length || selectedDevice.cablesTo?.length) ? (
                <div style={{ marginTop: 16 }}>
                  <h4>连线信息</h4>
                  <Table
                    size="small"
                    pagination={false}
                    columns={cableColumns}
                    dataSource={[
                      ...(selectedDevice.cablesFrom || []).map((c: any) => ({
                        key: c.id,
                        port: c.sourcePort,
                        remoteName: c.targetDeviceName || c.targetDeviceId,
                        remotePort: c.targetPort,
                        cableType: c.cableType,
                        status: c.status,
                      })),
                      ...(selectedDevice.cablesTo || []).map((c: any) => ({
                        key: c.id,
                        port: c.targetPort,
                        remoteName: c.sourceDeviceName || c.sourceDeviceId,
                        remotePort: c.sourcePort,
                        cableType: c.cableType,
                        status: c.status,
                      })),
                    ]}
                  />
                </div>
              ) : null}
            </>
          )}
        </Spin>
      </Modal>

      {/* 连线详情弹窗 */}
      <Modal
        title="连线详情"
        open={edgeModalVisible}
        onCancel={() => { setEdgeModalVisible(false); setSelectedEdge(null); }}
        footer={null}
        width={500}
      >
        {selectedEdge && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="源设备">{selectedEdge.sourceName}</Descriptions.Item>
            <Descriptions.Item label="源端口">{selectedEdge.sourcePort}</Descriptions.Item>
            <Descriptions.Item label="目标设备">{selectedEdge.targetName}</Descriptions.Item>
            <Descriptions.Item label="目标端口">{selectedEdge.targetPort}</Descriptions.Item>
            <Descriptions.Item label="线缆类型">
              {cableTypeLabels[selectedEdge.cableType] || selectedEdge.cableType}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={cableStatusColors[selectedEdge.status]}>
                {cableStatusLabels[selectedEdge.status] || selectedEdge.status}
              </Tag>
            </Descriptions.Item>
            {selectedEdge.purpose && (
              <Descriptions.Item label="用途">{selectedEdge.purpose}</Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}