import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRequest } from 'ahooks';
import {
  Card,
  Row,
  Col,
  Descriptions,
  Button,
  Space,
  Tooltip,
  Modal,
  Table,
  Tag,
  Spin,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  InfoCircleOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import { racksApi, cablesApi } from '@/services/api';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

// 设备类型颜色映射
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

// 设备状态颜色
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

// 线缆类型标签
const cableTypeLabels: Record<string, string> = {
  FIBER: '光纤',
  CAT6: 'CAT6网线',
  CAT5E: 'CAT5E网线',
  POWER: '电源线',
  OTHER: '其他',
};

interface Device {
  id: string;
  name: string;
  assetTag?: string;
  positionU?: number;
  status: string;
  notes?: string;
  template: {
    id: string;
    brand: string;
    model: string;
    sizeU: number;
    deviceType: string;
  };
  cablesFrom?: any[];
  cablesTo?: any[];
}

interface Rack {
  id: string;
  name: string;
  roomId: string;
  totalU: number;
  row?: number;
  column?: number;
  location?: string;
  description?: string;
  room?: {
    id: string;
    name: string;
    type: string;
  };
  devices: Device[];
}

const RackDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isDeviceModalVisible, setIsDeviceModalVisible] = useState(false);
  const [highlightedDevice, setHighlightedDevice] = useState<string | null>(null);

  // 获取机柜详情
  const { data: rack, loading: rackLoading } = useRequest(
    () => racksApi.get(id!),
    {
      ready: !!id,
      onError: (error: any) => {
        message.error(`获取机柜详情失败: ${error.message || '未知错误'}`);
        navigate('/racks');
      },
    }
  ) as { data: Rack | undefined; loading: boolean };

  // 获取连线列表
  const { data: cablesData } = useRequest(
    () => cablesApi.list({ pageSize: 100 }),
    {
      ready: !!id,
    }
  );

  const devices = rack?.devices || [];

  // 计算已使用的U位
  const usedU = useMemo(() => {
    return devices.reduce((sum, device) => {
      if (device.positionU && device.template) {
        return sum + device.template.sizeU;
      }
      return sum;
    }, 0);
  }, [devices]);

  // 构建U位占用映射
  const uPositionMap = useMemo(() => {
    const map = new Map<number, Device>();
    devices.forEach((device) => {
      if (device.positionU && device.template) {
        for (let i = 0; i < device.template.sizeU; i++) {
          map.set(device.positionU + i, device);
        }
      }
    });
    return map;
  }, [devices]);

  // 获取设备连线数量
  const getDeviceCableCount = (device: Device) => {
    return (device.cablesFrom?.length || 0) + (device.cablesTo?.length || 0);
  };

  // 渲染U位
  const renderUPositions = () => {
    if (!rack) return null;

    const totalU = rack.totalU || 42;
    const uPositions = [];

    for (let u = totalU; u >= 1; u--) {
      const device = uPositionMap.get(u);

      // 如果该U位是设备的起始位置
      if (device && device.positionU === u) {
        const deviceType = device.template?.deviceType || 'OTHER';
        const isHighlighted = highlightedDevice === device.id;
        const cableCount = getDeviceCableCount(device);

        uPositions.push(
          <Tooltip
            key={u}
            title={
              <div>
                <div><strong>{device.name}</strong></div>
                <div>类型: {deviceTypeLabels[deviceType] || deviceType}</div>
                <div>型号: {device.template?.brand} {device.template?.model}</div>
                <div>U位: U{device.positionU} - U{device.positionU + device.template.sizeU - 1} ({device.template.sizeU}U)</div>
                <div>状态: {statusLabels[device.status] || device.status}</div>
                {device.assetTag && <div>资产标签: {device.assetTag}</div>}
                <div>连线数: {cableCount}</div>
              </div>
            }
            placement="right"
          >
            <div
              style={{
                height: `${device.template.sizeU * 28 + (device.template.sizeU - 1) * 2}px`,
                backgroundColor: deviceTypeColors[deviceType] || '#a0aec0',
                border: `2px solid ${isHighlighted ? '#ffd700' : statusColors[device.status] || '#a0aec0'}`,
                borderRadius: '4px',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.3s',
                position: 'relative',
                color: '#fff',
                fontWeight: 500,
                boxShadow: isHighlighted ? '0 0 10px #ffd700' : 'none',
                transform: isHighlighted ? 'scale(1.02)' : 'scale(1)',
              }}
              onClick={() => handleDeviceClick(device)}
              onMouseEnter={() => setHighlightedDevice(device.id)}
              onMouseLeave={() => setHighlightedDevice(null)}
            >
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{
                  fontSize: device.template.sizeU > 1 ? '13px' : '11px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {device.name}
                </div>
                {device.template.sizeU > 1 && (
                  <div style={{ fontSize: '11px', opacity: 0.9 }}>
                    {device.template.brand} {device.template.model}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <Tag
                  color={statusColors[device.status]}
                  style={{ margin: 0, fontSize: '10px', padding: '0 4px' }}
                >
                  {statusLabels[device.status] || device.status}
                </Tag>
                {cableCount > 0 && (
                  <span style={{ fontSize: '10px', opacity: 0.8 }}>
                    <ApiOutlined /> {cableCount}
                  </span>
                )}
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: '4px',
                  bottom: '2px',
                  fontSize: '9px',
                  opacity: 0.7,
                }}
              >
                U{u}
              </div>
            </div>
          </Tooltip>
        );
      } else if (!device) {
        // 空U位
        uPositions.push(
          <div
            key={u}
            style={{
              height: '28px',
              border: '1px dashed #d9d9d9',
              borderRadius: '2px',
              backgroundColor: '#fafafa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#bbb',
              fontSize: '11px',
            }}
          >
            U{u}
          </div>
        );
      }
      // 如果是设备占用的非起始U位，则跳过
    }

    return uPositions;
  };

  const handleDeviceClick = (device: Device) => {
    setSelectedDevice(device);
    setIsDeviceModalVisible(true);
  };

  const deviceColumns: ColumnsType<Device> = [
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name, record) => (
        <a
          onClick={() => handleDeviceClick(record)}
          onMouseEnter={() => setHighlightedDevice(record.id)}
          onMouseLeave={() => setHighlightedDevice(null)}
        >
          {name}
        </a>
      ),
    },
    {
      title: '类型',
      key: 'type',
      width: 100,
      render: (_, record) => (
        <Tag color={deviceTypeColors[record.template?.deviceType]}>
          {deviceTypeLabels[record.template?.deviceType] || record.template?.deviceType}
        </Tag>
      ),
    },
    {
      title: '型号',
      key: 'model',
      width: 150,
      render: (_, record) => `${record.template?.brand || ''} ${record.template?.model || ''}`,
    },
    {
      title: 'U位',
      key: 'position',
      width: 100,
      render: (_, record) => {
        if (!record.positionU) return '-';
        const endU = record.positionU + (record.template?.sizeU || 1) - 1;
        return record.template?.sizeU > 1
          ? `U${record.positionU}-U${endU}`
          : `U${record.positionU}`;
      },
    },
    {
      title: '高度',
      key: 'sizeU',
      width: 60,
      render: (_, record) => `${record.template?.sizeU || 1}U`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => (
        <Tag color={statusColors[status]}>
          {statusLabels[status] || status}
        </Tag>
      ),
    },
    {
      title: '连线',
      key: 'cables',
      width: 60,
      render: (_, record) => {
        const count = getDeviceCableCount(record);
        return count > 0 ? <Tag color="blue">{count}</Tag> : '-';
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<InfoCircleOutlined />}
          onClick={() => handleDeviceClick(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  // 连线表格列
  const cableColumns: ColumnsType<any> = [
    {
      title: '源设备',
      key: 'srcDevice',
      width: 120,
      render: (_, record) => record.srcDevice?.name || '-',
    },
    {
      title: '源端口',
      dataIndex: 'srcPortIndex',
      key: 'srcPortIndex',
      width: 80,
    },
    {
      title: '目标设备',
      key: 'dstDevice',
      width: 120,
      render: (_, record) => record.dstDevice?.name || '-',
    },
    {
      title: '目标端口',
      dataIndex: 'dstPortIndex',
      key: 'dstPortIndex',
      width: 80,
    },
    {
      title: '类型',
      dataIndex: 'cableType',
      key: 'cableType',
      width: 100,
      render: (type: string) => cableTypeLabels[type] || type,
    },
    {
      title: '追溯码',
      dataIndex: 'traceCode',
      key: 'traceCode',
      width: 100,
    },
  ];

  // 获取该机柜设备相关的连线
  const rackCables = useMemo(() => {
    if (!cablesData?.data || !devices.length) return [];
    const deviceIds = new Set(devices.map(d => d.id));
    return cablesData.data.filter((cable: any) =>
      deviceIds.has(cable.srcDeviceId) || deviceIds.has(cable.dstDeviceId)
    );
  }, [cablesData, devices]);

  if (rackLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!rack) {
    return null;
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 头部 */}
        <Card>
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/racks')}
            >
              返回列表
            </Button>
            <Title level={3} style={{ margin: 0 }}>{rack.name}</Title>
            <Tag color={rack.room?.type === 'OLD' ? 'orange' : 'green'}>
              {rack.room?.type === 'OLD' ? '旧机房' : '新机房'}
            </Tag>
          </Space>
        </Card>

        {/* 基本信息 */}
        <Card title="基本信息">
          <Descriptions column={3}>
            <Descriptions.Item label="机柜名称">{rack.name}</Descriptions.Item>
            <Descriptions.Item label="所属机房">{rack.room?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="位置">{rack.location || '-'}</Descriptions.Item>
            <Descriptions.Item label="U位总数">{rack.totalU}U</Descriptions.Item>
            <Descriptions.Item label="已使用U位">
              <Text type={usedU > rack.totalU * 0.8 ? 'danger' : undefined}>
                {usedU}U
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="使用率">
              <Text type={usedU / rack.totalU > 0.8 ? 'danger' : undefined}>
                {((usedU / rack.totalU) * 100).toFixed(1)}%
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="设备数量">{devices.length}台</Descriptions.Item>
            <Descriptions.Item label="行/列">
              {rack.row && rack.column ? `第${rack.row}行 第${rack.column}列` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="描述">{rack.description || '-'}</Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 主要内容区域 */}
        <Row gutter={24}>
          {/* 左侧：机柜可视化 */}
          <Col xs={24} lg={8}>
            <Card
              title="机柜可视化"
              extra={
                <Space size="small" wrap>
                  {Object.entries(deviceTypeColors).slice(0, 4).map(([type, color]) => (
                    <Tag key={type} color={color} style={{ margin: 0 }}>
                      {deviceTypeLabels[type]}
                    </Tag>
                  ))}
                </Space>
              }
            >
              <div
                style={{
                  backgroundColor: '#1a1a2e',
                  border: '3px solid #4a4a5a',
                  borderRadius: '8px',
                  padding: '12px',
                  minHeight: '500px',
                  maxHeight: '800px',
                  overflowY: 'auto',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  {renderUPositions()}
                </div>
              </div>
              <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
                  <Text type="secondary">总计 {rack.totalU}U</Text>
                  <Text type="secondary">已用 {usedU}U</Text>
                  <Text type="secondary">剩余 {rack.totalU - usedU}U</Text>
                </Space>
              </div>
            </Card>
          </Col>

          {/* 右侧：设备列表和连线列表 */}
          <Col xs={24} lg={16}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* 设备列表 */}
              <Card
                title={`设备列表 (${devices.length}台)`}
                extra={
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => navigate('/devices')}
                  >
                    管理设备
                  </Button>
                }
              >
                <Table
                  columns={deviceColumns}
                  dataSource={devices}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ y: 280 }}
                  locale={{ emptyText: '暂无设备' }}
                  rowClassName={(record) =>
                    highlightedDevice === record.id ? 'ant-table-row-selected' : ''
                  }
                />
              </Card>

              {/* 连线列表 */}
              <Card
                title={`相关连线 (${rackCables.length}条)`}
                extra={
                  <Button
                    size="small"
                    onClick={() => navigate('/cables')}
                  >
                    管理连线
                  </Button>
                }
              >
                <Table
                  columns={cableColumns}
                  dataSource={rackCables}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ y: 200 }}
                  locale={{ emptyText: '暂无连线' }}
                />
              </Card>
            </Space>
          </Col>
        </Row>
      </Space>

      {/* 设备详情弹窗 */}
      <Modal
        title={`设备详情 - ${selectedDevice?.name || ''}`}
        open={isDeviceModalVisible}
        onCancel={() => {
          setIsDeviceModalVisible(false);
          setSelectedDevice(null);
        }}
        footer={[
          <Button key="close" onClick={() => setIsDeviceModalVisible(false)}>
            关闭
          </Button>,
          <Button
            key="edit"
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              navigate(`/devices/${selectedDevice?.id}`);
            }}
          >
            查看详情
          </Button>,
        ]}
        width={700}
      >
        {selectedDevice && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="设备名称" span={2}>
                {selectedDevice.name}
              </Descriptions.Item>
              <Descriptions.Item label="设备类型">
                <Tag color={deviceTypeColors[selectedDevice.template?.deviceType]}>
                  {deviceTypeLabels[selectedDevice.template?.deviceType] || selectedDevice.template?.deviceType}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="品牌型号">
                {selectedDevice.template?.brand} {selectedDevice.template?.model}
              </Descriptions.Item>
              <Descriptions.Item label="U位位置">
                {selectedDevice.positionU
                  ? `U${selectedDevice.positionU} - U${selectedDevice.positionU + selectedDevice.template.sizeU - 1}`
                  : '未上架'
                }
              </Descriptions.Item>
              <Descriptions.Item label="高度">
                {selectedDevice.template?.sizeU}U
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusColors[selectedDevice.status]}>
                  {statusLabels[selectedDevice.status] || selectedDevice.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="资产标签">
                {selectedDevice.assetTag || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>
                {selectedDevice.notes || '-'}
              </Descriptions.Item>
            </Descriptions>

            {/* 连线信息 */}
            <div style={{ marginTop: 16 }}>
              <h4>连线信息 ({getDeviceCableCount(selectedDevice)}条)</h4>
              {(selectedDevice.cablesFrom?.length || 0) > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary">出向连线:</Text>
                  <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                    {selectedDevice.cablesFrom?.map((cable: any) => (
                      <li key={cable.id}>
                        {cable.srcPortIndex} → {cable.dstDevice?.name || '未知'} ({cable.dstPortIndex})
                        <Tag style={{ marginLeft: 8 }}>{cableTypeLabels[cable.cableType] || cable.cableType}</Tag>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(selectedDevice.cablesTo?.length || 0) > 0 && (
                <div>
                  <Text type="secondary">入向连线:</Text>
                  <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                    {selectedDevice.cablesTo?.map((cable: any) => (
                      <li key={cable.id}>
                        {cable.srcDevice?.name || '未知'} ({cable.srcPortIndex}) → {cable.dstPortIndex}
                        <Tag style={{ marginLeft: 8 }}>{cableTypeLabels[cable.cableType] || cable.cableType}</Tag>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {getDeviceCableCount(selectedDevice) === 0 && (
                <Text type="secondary">该设备暂无连线</Text>
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default RackDetailPage;
