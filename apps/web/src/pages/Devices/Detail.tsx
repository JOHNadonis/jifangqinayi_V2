import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Divider,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  message,
} from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined, SwapOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useRequest } from 'ahooks';
import { useNavigate, useParams } from 'react-router-dom';
import { cablesApi, devicesApi, racksApi } from '@/services/api';

const statusColors: Record<string, string> = {
  ONLINE: 'green',
  MOVING: 'orange',
  OFFLINE: 'red',
  ARRIVED: 'blue',
};

const statusLabels: Record<string, string> = {
  ONLINE: '在线',
  MOVING: '搬迁中',
  OFFLINE: '离线',
  ARRIVED: '已到达',
};

const cableStatusColors: Record<string, string> = {
  RECORDED: 'default',
  LABELED: 'processing',
  DISCONNECTED: 'warning',
  VERIFIED: 'success',
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

interface PortItem {
  key: string;
  type: string;
  panel: 'FRONT' | 'REAR';
}

interface DeviceTemplate {
  id: string;
  brand: string;
  model: string;
  sizeU: number;
  deviceType: string;
  portLayout?: unknown;
}

interface RackInfo {
  id: string;
  name: string;
  totalU: number;
  room?: { name: string };
}

interface DeviceBrief {
  id: string;
  name: string;
  rack?: RackInfo | null;
  positionU?: number | null;
  templateId?: string;
  template?: DeviceTemplate;
}

interface CableRecord {
  id: string;
  traceCode: string;
  srcPortIndex: string;
  dstPortIndex: string;
  cableType: string;
  status: string;
  srcDevice?: DeviceBrief;
  dstDevice?: DeviceBrief;
}

interface DeviceDetailData extends DeviceBrief {
  status: string;
  rackId?: string | null;
  templateId: string;
  template: DeviceTemplate;
  cablesFrom: CableRecord[];
  cablesTo: CableRecord[];
  createdAt: string;
  updatedAt: string;
}

interface RackListItem {
  id: string;
  name: string;
  roomName?: string;
  totalU: number;
}

interface RackUsageSlot {
  start: number;
  end: number;
  deviceId: string;
}

interface RackUsageData {
  totalU: number;
  usedSlots: RackUsageSlot[];
}

interface PagedData<T> {
  data: T[];
}

function toPortItems(layout: unknown): PortItem[] {
  let parsed: any = layout;
  if (typeof layout === 'string') {
    try {
      parsed = JSON.parse(layout);
    } catch {
      parsed = {};
    }
  }

  const front = Array.isArray(parsed?.front) ? parsed.front : [];
  const rear = Array.isArray(parsed?.rear) ? parsed.rear : [];

  const normalize = (ports: any[], panel: 'FRONT' | 'REAR'): PortItem[] =>
    ports
      .map((port) => {
        const key = String(port?.index ?? port?.id ?? port?.name ?? '').trim();
        if (!key) {
          return null;
        }
        return {
          key,
          type: String(port?.type ?? 'UNKNOWN'),
          panel,
        };
      })
      .filter((port): port is PortItem => port !== null);

  return [...normalize(front, 'FRONT'), ...normalize(rear, 'REAR')];
}

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [addCableOpen, setAddCableOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [dstDeviceId, setDstDeviceId] = useState<string | undefined>();
  const [cableForm] = Form.useForm();
  const [moveForm] = Form.useForm();

  const { data: device, loading: deviceLoading, refresh: refreshDevice } = useRequest<DeviceDetailData, []>(
    () => devicesApi.get(id!),
    { ready: !!id },
  );

  const { data: cablesResp, loading: cablesLoading, refresh: refreshCables } = useRequest<PagedData<CableRecord>, []>(
    () => cablesApi.list({ deviceId: id, pageSize: 200 }),
    { ready: !!id },
  );

  const { data: allDevicesResp } = useRequest<PagedData<DeviceBrief>, []>(() => devicesApi.list({ pageSize: 1000 }));
  const { data: racksResp } = useRequest<PagedData<RackListItem>, []>(() => racksApi.list({ pageSize: 1000 }));

  const { data: rackUsageData, run: fetchRackUsage } = useRequest<RackUsageData, [string]>(
    (rackId: string) => racksApi.getUsage(rackId),
    { manual: true },
  );

  const cables = cablesResp?.data ?? [];
  const allDevices = allDevicesResp?.data ?? [];
  const racks = racksResp?.data ?? [];

  const srcPorts = useMemo(() => toPortItems(device?.template?.portLayout), [device?.template?.portLayout]);

  const dstPorts = useMemo(() => {
    if (!dstDeviceId) return [];
    const dstDevice = allDevices.find((item) => item.id === dstDeviceId);
    return toPortItems(dstDevice?.template?.portLayout);
  }, [dstDeviceId, allDevices]);

  const availableUPositions = useMemo(() => {
    const targetRackId = moveForm.getFieldValue('targetRackId');
    if (!targetRackId || !device || !rackUsageData) {
      return [] as number[];
    }

    const rack = racks.find((item) => item.id === targetRackId);
    if (!rack) {
      return [] as number[];
    }

    const sizeU = device.template?.sizeU ?? 1;
    const occupied = rackUsageData.usedSlots.filter((slot) => slot.deviceId !== device.id);

    const result: number[] = [];
    for (let start = 1; start <= rack.totalU - sizeU + 1; start += 1) {
      const end = start + sizeU - 1;
      const overlap = occupied.some((slot) => !(end < slot.start || start > slot.end));
      if (!overlap) {
        result.push(start);
      }
    }

    return result;
  }, [device, moveForm, rackUsageData, racks]);

  const cableColumns: ColumnsType<CableRecord> = [
    {
      title: '追溯码',
      dataIndex: 'traceCode',
      key: 'traceCode',
      width: 180,
      render: (value: string) => <Tag>{value}</Tag>,
    },
    {
      title: '源端设备',
      key: 'source',
      render: (_, record) => (
        <span>
          {record.srcDevice?.name ?? '-'}
          <Tag style={{ marginLeft: 6 }}>{record.srcPortIndex}</Tag>
        </span>
      ),
    },
    {
      title: '目标设备',
      key: 'target',
      render: (_, record) => (
        <span>
          {record.dstDevice?.name ?? '-'}
          <Tag style={{ marginLeft: 6 }}>{record.dstPortIndex}</Tag>
        </span>
      ),
    },
    {
      title: '线缆类型',
      dataIndex: 'cableType',
      key: 'cableType',
      width: 120,
      render: (value: string) => cableTypeLabels[value] || value,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => <Tag color={cableStatusColors[status]}>{cableStatusLabels[status] || status}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Popconfirm title="确定删除此线缆？" okText="确定" cancelText="取消" onConfirm={() => handleDeleteCable(record.id)}>
          <Button type="link" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const handleDeleteCable = async (cableId: string) => {
    try {
      await cablesApi.delete(cableId);
      message.success('删除成功');
      refreshCables();
      refreshDevice();
    } catch (error: any) {
      message.error(error?.message || '删除失败');
    }
  };

  const handleOpenAddCable = () => {
    cableForm.resetFields();
    cableForm.setFieldsValue({ srcDeviceId: id, cableType: 'CAT6' });
    setDstDeviceId(undefined);
    setAddCableOpen(true);
  };

  const handleCreateCable = async () => {
    try {
      const values = await cableForm.validateFields();
      await cablesApi.create(values);
      message.success('线缆创建成功');
      setAddCableOpen(false);
      refreshCables();
      refreshDevice();
    } catch (error: any) {
      if (!error?.errorFields) {
        message.error(error?.message || '创建失败');
      }
    }
  };

  const handleOpenMove = () => {
    moveForm.resetFields();
    setMoveOpen(true);
  };

  const handleRackChange = (rackId: string) => {
    moveForm.setFieldValue('targetPositionU', undefined);
    fetchRackUsage(rackId);
  };

  const handleMove = async () => {
    try {
      const values = await moveForm.validateFields();
      await devicesApi.move(id!, values);
      message.success('搬迁任务已提交');
      setMoveOpen(false);
      refreshDevice();
    } catch (error: any) {
      if (!error?.errorFields) {
        message.error(error?.message || '搬迁失败');
      }
    }
  };

  if (deviceLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!device) {
    return (
      <Card>
        <Space direction="vertical">
          <span>设备未找到</span>
          <Button onClick={() => navigate('/devices')}>返回</Button>
        </Space>
      </Card>
    );
  }

  const portItems = srcPorts;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/devices')}>
            返回
          </Button>
          <h2 style={{ margin: 0 }}>{device.name}</h2>
        </Space>
      </div>

      <Card
        title="设备信息"
        extra={
          <Button icon={<SwapOutlined />} onClick={handleOpenMove}>
            搬迁
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Descriptions column={{ xs: 1, md: 2, lg: 3 }}>
          <Descriptions.Item label="品牌型号">
            {device.template.brand} {device.template.model}
          </Descriptions.Item>
          <Descriptions.Item label="U高度">{device.template.sizeU}U</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={statusColors[device.status]}>{statusLabels[device.status] || device.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="所在机柜">
            {device.rack ? `${device.rack.room?.name ?? ''} ${device.rack.name}` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="U位">
            {device.positionU ? `U${device.positionU}` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {new Date(device.updatedAt).toLocaleString()}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="端口列表" style={{ marginBottom: 16 }}>
        {portItems.length === 0 ? (
          <div style={{ color: '#999' }}>暂无端口配置数据</div>
        ) : (
          <Space wrap>
            {portItems.map((port) => (
              <Tag key={`${port.panel}-${port.key}`}>{`${port.panel === 'FRONT' ? '前' : '后'}:${port.key} (${port.type})`}</Tag>
            ))}
          </Space>
        )}
      </Card>

      <Card
        title="线缆连接"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddCable}>
            新增线缆
          </Button>
        }
      >
        <Table<CableRecord>
          rowKey="id"
          columns={cableColumns}
          dataSource={cables}
          loading={cablesLoading}
          pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
        />
      </Card>

      <Modal
        title="新增线缆"
        open={addCableOpen}
        onOk={handleCreateCable}
        onCancel={() => setAddCableOpen(false)}
        okText="创建"
        cancelText="取消"
      >
        <Form form={cableForm} layout="vertical">
          <Form.Item name="srcDeviceId" label="源端设备" rules={[{ required: true, message: '请选择源端设备' }]}>
            <Select disabled options={[{ label: device.name, value: device.id }]} />
          </Form.Item>

          <Form.Item name="srcPortIndex" label="源端端口" rules={[{ required: true, message: '请选择源端端口' }]}>
            {srcPorts.length > 0 ? (
              <Select
                showSearch
                placeholder="选择端口"
                optionFilterProp="label"
                options={srcPorts.map((port) => ({
                  label: `${port.panel === 'FRONT' ? '前' : '后'}:${port.key} (${port.type})`,
                  value: port.key,
                }))}
              />
            ) : (
              <Input placeholder="该设备暂无端口配置，请手动输入" />
            )}
          </Form.Item>

          <Divider />

          <Form.Item name="dstDeviceId" label="目标设备" rules={[{ required: true, message: '请选择目标设备' }]}>
            <Select
              showSearch
              placeholder="选择目标设备"
              optionFilterProp="label"
              onChange={(value) => {
                setDstDeviceId(value);
                cableForm.setFieldValue('dstPortIndex', undefined);
              }}
              options={allDevices
                .filter((item) => item.id !== device.id)
                .map((item) => ({ label: item.name, value: item.id }))}
            />
          </Form.Item>

          <Form.Item name="dstPortIndex" label="目标端口" rules={[{ required: true, message: '请选择目标端口' }]}>
            {dstPorts.length > 0 ? (
              <Select
                showSearch
                placeholder="选择端口"
                optionFilterProp="label"
                options={dstPorts.map((port) => ({
                  label: `${port.panel === 'FRONT' ? '前' : '后'}:${port.key} (${port.type})`,
                  value: port.key,
                }))}
              />
            ) : (
              <Input placeholder={dstDeviceId ? '该设备暂无端口配置，请手动输入' : '请先选择目标设备'} />
            )}
          </Form.Item>

          <Form.Item name="cableType" label="线缆类型" rules={[{ required: true, message: '请选择线缆类型' }]}>
            <Select
              placeholder="选择线缆类型"
              options={[
                { label: '光纤', value: 'FIBER' },
                { label: 'CAT6网线', value: 'CAT6' },
                { label: 'CAT5E网线', value: 'CAT5E' },
                { label: '电源线', value: 'POWER' },
                { label: '其他', value: 'OTHER' },
              ]}
            />
          </Form.Item>

          <Form.Item name="color" label="颜色">
            <Input placeholder="例如：黄色、蓝色" />
          </Form.Item>

          <Form.Item name="purpose" label="用途">
            <Input placeholder="例如：核心链路、管理网" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="设备搬迁"
        open={moveOpen}
        onOk={handleMove}
        onCancel={() => setMoveOpen(false)}
        okText="确定搬迁"
        cancelText="取消"
      >
        <Form form={moveForm} layout="vertical">
          <Form.Item name="targetRackId" label="目标机柜" rules={[{ required: true, message: '请选择目标机柜' }]}>
            <Select
              showSearch
              placeholder="选择目标机柜"
              optionFilterProp="label"
              onChange={handleRackChange}
              options={racks.map((rack) => ({
                label: `${rack.roomName ?? ''} ${rack.name} (${rack.totalU}U)`,
                value: rack.id,
              }))}
            />
          </Form.Item>

          <Form.Item name="targetPositionU" label="目标U位" rules={[{ required: true, message: '请选择目标U位' }]}>
            <Select
              placeholder="选择U位"
              options={availableUPositions.map((value) => ({
                label: `U${value}${device.template.sizeU > 1 ? ` - U${value + device.template.sizeU - 1}` : ''}`,
                value,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
