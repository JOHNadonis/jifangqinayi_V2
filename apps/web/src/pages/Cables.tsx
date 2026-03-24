import { useMemo, useState } from 'react';
import { Button, Divider, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Tooltip, message } from 'antd';
import { CheckOutlined, DeleteOutlined, DisconnectOutlined, DownloadOutlined, PlusOutlined, TagOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useRequest } from 'ahooks';
import { cablesApi, devicesApi, exportApi } from '../services/api';

interface DeviceTemplate {
  id: string;
  brand: string;
  model: string;
  sizeU: number;
  deviceType: string;
  portLayout?: string;
}

interface DeviceBrief {
  id: string;
  name: string;
  rack?: { name: string; room?: { name: string } };
  template?: DeviceTemplate;
}

interface PortItem {
  key: string;
  type: string;
  panel: 'FRONT' | 'REAR';
}

interface CableRow {
  id: string;
  traceCode: string;
  srcPortIndex: string;
  dstPortIndex: string;
  cableType: string;
  color?: string;
  purpose?: string;
  status: string;
  srcDevice?: DeviceBrief;
  dstDevice?: DeviceBrief;
}

interface Paged<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

const cableTypeOptions = [
  { label: '光纤', value: 'FIBER' },
  { label: 'CAT6网线', value: 'CAT6' },
  { label: 'CAT5E网线', value: 'CAT5E' },
  { label: '电源线', value: 'POWER' },
  { label: '其他', value: 'OTHER' },
];

const cableTypeLabels: Record<string, string> = {
  FIBER: '光纤',
  CAT6: 'CAT6网线',
  CAT5E: 'CAT5E网线',
  POWER: '电源线',
  OTHER: '其他',
};

const cableStatusColor: Record<string, string> = {
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

/** 解析设备模板的端口布局，返回端口列表 */
function toPortItems(layout: unknown): PortItem[] {
  let parsed: any = layout;
  if (typeof layout === 'string') {
    try {
      parsed = JSON.parse(layout);
    } catch {
      parsed = {};
    }
  }
  if (!parsed || typeof parsed !== 'object') return [];

  const front = Array.isArray(parsed?.front) ? parsed.front : [];
  const rear = Array.isArray(parsed?.rear) ? parsed.rear : [];

  const normalize = (ports: any[], panel: 'FRONT' | 'REAR'): PortItem[] =>
    ports
      .map((port) => {
        const key = String(port?.index ?? port?.id ?? port?.name ?? '').trim();
        if (!key) return null;
        return { key, type: String(port?.type ?? 'UNKNOWN'), panel };
      })
      .filter((port): port is PortItem => port !== null);

  return [...normalize(front, 'FRONT'), ...normalize(rear, 'REAR')];
}

export default function Cables() {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [query, setQuery] = useState({ page: 1, pageSize: 20, search: '', status: '', cableType: '' });
  // 用于跟踪选中的设备ID以触发端口列表更新
  const [srcDeviceId, setSrcDeviceId] = useState<string | undefined>();
  const [dstDeviceId, setDstDeviceId] = useState<string | undefined>();

  const { data, loading, refresh } = useRequest<Paged<CableRow>, []>(
    () =>
      cablesApi.list({
        page: query.page,
        pageSize: query.pageSize,
        search: query.search || undefined,
        status: query.status || undefined,
        cableType: query.cableType || undefined,
      }),
    { refreshDeps: [query.page, query.pageSize, query.search, query.status, query.cableType] },
  );

  const { data: devicesResp } = useRequest<Paged<DeviceBrief>, []>(() => devicesApi.list({ pageSize: 1000 }));

  const devices = devicesResp?.data ?? [];

  // 根据选中的设备动态计算端口列表
  const srcPorts = useMemo(() => {
    if (!srcDeviceId) return [];
    const device = devices.find((d) => d.id === srcDeviceId);
    return toPortItems(device?.template?.portLayout);
  }, [srcDeviceId, devices]);

  const dstPorts = useMemo(() => {
    if (!dstDeviceId) return [];
    const device = devices.find((d) => d.id === dstDeviceId);
    return toPortItems(device?.template?.portLayout);
  }, [dstDeviceId, devices]);

  const { run: createCable, loading: creating } = useRequest(
    (values: any) => cablesApi.create(values),
    {
      manual: true,
      onSuccess: () => {
        message.success('创建成功');
        setOpen(false);
        form.resetFields();
        setSrcDeviceId(undefined);
        setDstDeviceId(undefined);
        refresh();
      },
      onError: (error: any) => message.error(error?.message || '创建失败'),
    },
  );

  const { run: deleteCable } = useRequest((id: string) => cablesApi.delete(id), {
    manual: true,
    onSuccess: () => {
      message.success('删除成功');
      refresh();
    },
  });

  const { run: verifyCable } = useRequest((id: string) => cablesApi.verify(id), {
    manual: true,
    onSuccess: () => {
      message.success('已标记为验证通过');
      refresh();
    },
  });

  const { run: disconnectCable } = useRequest((id: string) => cablesApi.disconnect(id), {
    manual: true,
    onSuccess: () => {
      message.success('已标记为拆除');
      refresh();
    },
  });

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await cablesApi.update(id, { status });
      message.success(`已标记为${cableStatusLabels[status]}`);
      refresh();
    } catch (error: any) {
      message.error(error?.message || '操作失败');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportApi.exportLabels(selectedRowKeys.length > 0 ? selectedRowKeys : undefined);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `线缆标签-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error: any) {
      message.error(error?.message || '导出失败');
    }
  };

  const handleOpenCreate = () => {
    form.resetFields();
    setSrcDeviceId(undefined);
    setDstDeviceId(undefined);
    setOpen(true);
  };

  const columns: ColumnsType<CableRow> = [
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
      width: 110,
      render: (value: string) => cableTypeLabels[value] || value,
    },
    { title: '颜色', dataIndex: 'color', key: 'color', width: 90 },
    { title: '用途', dataIndex: 'purpose', key: 'purpose', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (value: string) => (
        <Tag color={cableStatusColor[value]}>{cableStatusLabels[value] || value}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          {record.status === 'RECORDED' && (
            <Tooltip title="标记为已贴标">
              <Button type="link" size="small" icon={<TagOutlined />} onClick={() => handleUpdateStatus(record.id, 'LABELED')} />
            </Tooltip>
          )}
          {(record.status === 'RECORDED' || record.status === 'LABELED') && (
            <Tooltip title="标记为已拆除">
              <Button type="link" size="small" icon={<DisconnectOutlined />} onClick={() => disconnectCable(record.id)} />
            </Tooltip>
          )}
          {record.status !== 'VERIFIED' && (
            <Tooltip title="标记为已验证">
              <Button type="link" size="small" icon={<CheckOutlined />} style={{ color: '#52c41a' }} onClick={() => verifyCable(record.id)} />
            </Tooltip>
          )}
          <Popconfirm title="确定删除此线缆？" okText="确定" cancelText="取消" onConfirm={() => deleteCable(record.id)}>
            <Tooltip title="删除">
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Input.Search
            allowClear
            placeholder="搜索追溯码"
            onSearch={(value) => setQuery((prev) => ({ ...prev, search: value, page: 1 }))}
            style={{ width: 220 }}
          />
          <Select
            allowClear
            style={{ width: 140 }}
            placeholder="状态筛选"
            onChange={(value) => setQuery((prev) => ({ ...prev, status: value ?? '', page: 1 }))}
            options={[
              { label: '已记录', value: 'RECORDED' },
              { label: '已贴标', value: 'LABELED' },
              { label: '已拆除', value: 'DISCONNECTED' },
              { label: '已验证', value: 'VERIFIED' },
            ]}
          />
          <Select
            allowClear
            style={{ width: 140 }}
            placeholder="类型筛选"
            onChange={(value) => setQuery((prev) => ({ ...prev, cableType: value ?? '', page: 1 }))}
            options={cableTypeOptions}
          />
        </Space>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出标签{selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ''}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
            新增线缆
          </Button>
        </Space>
      </div>

      <Table<CableRow>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data?.data ?? []}
        rowSelection={{ selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys as string[]) }}
        pagination={{
          current: query.page,
          pageSize: query.pageSize,
          total: data?.total ?? 0,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => setQuery((prev) => ({ ...prev, page, pageSize })),
        }}
      />

      <Modal
        title="新增线缆"
        open={open}
        onCancel={() => {
          setOpen(false);
          form.resetFields();
          setSrcDeviceId(undefined);
          setDstDeviceId(undefined);
        }}
        onOk={() => {
          form.validateFields().then((values) => createCable(values));
        }}
        confirmLoading={creating}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="srcDeviceId" label="源端设备" rules={[{ required: true, message: '请选择源端设备' }]}>
            <Select
              showSearch
              placeholder="选择源端设备"
              optionFilterProp="label"
              onChange={(value) => {
                setSrcDeviceId(value);
                form.setFieldValue('srcPortIndex', undefined);
              }}
              options={devices.map((device) => ({
                value: device.id,
                label: `${device.name} (${device.rack?.name ?? '未上架'})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="srcPortIndex" label="源端端口" rules={[{ required: true, message: '请选择源端端口' }]}>
            {srcPorts.length > 0 ? (
              <Select
                showSearch
                placeholder="选择端口"
                optionFilterProp="label"
                options={srcPorts.map((port) => ({
                  value: port.key,
                  label: `${port.panel === 'FRONT' ? '前' : '后'}:${port.key} (${port.type})`,
                }))}
              />
            ) : (
              <Input placeholder={srcDeviceId ? '该设备暂无端口配置，请手动输入' : '请先选择源端设备'} />
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
                form.setFieldValue('dstPortIndex', undefined);
              }}
              options={devices.map((device) => ({
                value: device.id,
                label: `${device.name} (${device.rack?.name ?? '未上架'})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="dstPortIndex" label="目标端口" rules={[{ required: true, message: '请选择目标端口' }]}>
            {dstPorts.length > 0 ? (
              <Select
                showSearch
                placeholder="选择端口"
                optionFilterProp="label"
                options={dstPorts.map((port) => ({
                  value: port.key,
                  label: `${port.panel === 'FRONT' ? '前' : '后'}:${port.key} (${port.type})`,
                }))}
              />
            ) : (
              <Input placeholder={dstDeviceId ? '该设备暂无端口配置，请手动输入' : '请先选择目标设备'} />
            )}
          </Form.Item>

          <Divider />

          <Form.Item name="cableType" label="线缆类型" rules={[{ required: true, message: '请选择线缆类型' }]}>
            <Select placeholder="选择线缆类型" options={cableTypeOptions} />
          </Form.Item>
          <Form.Item name="color" label="颜色">
            <Input placeholder="例如：黄色、蓝色" />
          </Form.Item>
          <Form.Item name="purpose" label="用途">
            <Input placeholder="例如：核心链路、管理网" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
