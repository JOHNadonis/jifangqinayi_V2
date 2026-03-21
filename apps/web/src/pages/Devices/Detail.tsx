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

const cableStatusColors: Record<string, string> = {
  RECORDED: 'default',
  LABELED: 'processing',
  DISCONNECTED: 'warning',
  VERIFIED: 'success',
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
    const dstDeviceId = cableForm.getFieldValue('dstDeviceId');
    if (!dstDeviceId) {
      return [];
    }
    const dstDevice = allDevices.find((item) => item.id === dstDeviceId);
    return toPortItems(dstDevice?.template?.portLayout);
  }, [allDevices, cableForm]);

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
      title: 'Trace Code',
      dataIndex: 'traceCode',
      key: 'traceCode',
      width: 180,
      render: (value: string) => <Tag>{value}</Tag>,
    },
    {
      title: 'Source',
      key: 'source',
      render: (_, record) => (
        <span>
          {record.srcDevice?.name ?? '-'}
          <Tag style={{ marginLeft: 6 }}>{record.srcPortIndex}</Tag>
        </span>
      ),
    },
    {
      title: 'Target',
      key: 'target',
      render: (_, record) => (
        <span>
          {record.dstDevice?.name ?? '-'}
          <Tag style={{ marginLeft: 6 }}>{record.dstPortIndex}</Tag>
        </span>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'cableType',
      key: 'cableType',
      width: 120,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => <Tag color={cableStatusColors[status]}>{status}</Tag>,
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Popconfirm title="Delete this cable?" onConfirm={() => handleDeleteCable(record.id)}>
          <Button type="link" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const handleDeleteCable = async (cableId: string) => {
    try {
      await cablesApi.delete(cableId);
      message.success('Cable deleted');
      refreshCables();
      refreshDevice();
    } catch (error: any) {
      message.error(error?.message || 'Delete failed');
    }
  };

  const handleOpenAddCable = () => {
    cableForm.resetFields();
    cableForm.setFieldsValue({ srcDeviceId: id, cableType: 'CAT6' });
    setAddCableOpen(true);
  };

  const handleCreateCable = async () => {
    try {
      const values = await cableForm.validateFields();
      await cablesApi.create(values);
      message.success('Cable created');
      setAddCableOpen(false);
      refreshCables();
      refreshDevice();
    } catch (error: any) {
      if (!error?.errorFields) {
        message.error(error?.message || 'Create failed');
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
      message.success('Move submitted');
      setMoveOpen(false);
      refreshDevice();
    } catch (error: any) {
      if (!error?.errorFields) {
        message.error(error?.message || 'Move failed');
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
          <span>Device not found.</span>
          <Button onClick={() => navigate('/devices')}>Back</Button>
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
            Back
          </Button>
          <h2 style={{ margin: 0 }}>{device.name}</h2>
        </Space>
      </div>

      <Card
        title="Device"
        extra={
          <Button icon={<SwapOutlined />} onClick={handleOpenMove}>
            Move
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Descriptions column={{ xs: 1, md: 2, lg: 3 }}>
          <Descriptions.Item label="Model">
            {device.template.brand} {device.template.model}
          </Descriptions.Item>
          <Descriptions.Item label="Size">{device.template.sizeU}U</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={statusColors[device.status]}>{device.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Rack">
            {device.rack ? `${device.rack.room?.name ?? ''} ${device.rack.name}` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="U Position">
            {device.positionU ? `U${device.positionU}` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Updated">
            {new Date(device.updatedAt).toLocaleString()}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Ports" style={{ marginBottom: 16 }}>
        {portItems.length === 0 ? (
          <div style={{ color: '#999' }}>No port layout data.</div>
        ) : (
          <Space wrap>
            {portItems.map((port) => (
              <Tag key={`${port.panel}-${port.key}`}>{`${port.panel}:${port.key} (${port.type})`}</Tag>
            ))}
          </Space>
        )}
      </Card>

      <Card
        title="Cables"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddCable}>
            Add Cable
          </Button>
        }
      >
        <Table<CableRecord>
          rowKey="id"
          columns={cableColumns}
          dataSource={cables}
          loading={cablesLoading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal title="Add Cable" open={addCableOpen} onOk={handleCreateCable} onCancel={() => setAddCableOpen(false)}>
        <Form form={cableForm} layout="vertical">
          <Form.Item name="srcDeviceId" label="Source Device" rules={[{ required: true }]}> 
            <Select disabled options={[{ label: device.name, value: device.id }]} />
          </Form.Item>

          <Form.Item name="srcPortIndex" label="Source Port" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={srcPorts.map((port) => ({ label: `${port.key} (${port.type})`, value: port.key }))}
            />
          </Form.Item>

          <Divider />

          <Form.Item name="dstDeviceId" label="Target Device" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              onChange={() => cableForm.setFieldValue('dstPortIndex', undefined)}
              options={allDevices
                .filter((item) => item.id !== device.id)
                .map((item) => ({ label: item.name, value: item.id }))}
            />
          </Form.Item>

          <Form.Item name="dstPortIndex" label="Target Port" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={dstPorts.map((port) => ({ label: `${port.key} (${port.type})`, value: port.key }))}
            />
          </Form.Item>

          <Form.Item name="cableType" label="Cable Type" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'FIBER', value: 'FIBER' },
                { label: 'CAT6', value: 'CAT6' },
                { label: 'CAT5E', value: 'CAT5E' },
                { label: 'POWER', value: 'POWER' },
                { label: 'OTHER', value: 'OTHER' },
              ]}
            />
          </Form.Item>

          <Form.Item name="color" label="Color">
            <Input />
          </Form.Item>

          <Form.Item name="purpose" label="Purpose">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Move Device" open={moveOpen} onOk={handleMove} onCancel={() => setMoveOpen(false)}>
        <Form form={moveForm} layout="vertical">
          <Form.Item name="targetRackId" label="Target Rack" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              onChange={handleRackChange}
              options={racks.map((rack) => ({
                label: `${rack.roomName ?? ''} ${rack.name} (${rack.totalU}U)`,
                value: rack.id,
              }))}
            />
          </Form.Item>

          <Form.Item name="targetPositionU" label="Target U Position" rules={[{ required: true }]}>
            <Select
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

