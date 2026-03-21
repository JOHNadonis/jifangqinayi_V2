import { useState } from 'react';
import { Button, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd';
import { CheckOutlined, DeleteOutlined, DisconnectOutlined, DownloadOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useRequest } from 'ahooks';
import { cablesApi, devicesApi, exportApi } from '../services/api';

interface DeviceBrief {
  id: string;
  name: string;
  rack?: { name: string };
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
  { label: 'FIBER', value: 'FIBER' },
  { label: 'CAT6', value: 'CAT6' },
  { label: 'CAT5E', value: 'CAT5E' },
  { label: 'POWER', value: 'POWER' },
  { label: 'OTHER', value: 'OTHER' },
];

const cableStatusColor: Record<string, string> = {
  RECORDED: 'default',
  LABELED: 'processing',
  DISCONNECTED: 'warning',
  VERIFIED: 'success',
};

export default function Cables() {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [query, setQuery] = useState({ page: 1, pageSize: 20, search: '', status: '', cableType: '' });

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

  const { run: createCable, loading: creating } = useRequest(
    (values: any) => cablesApi.create(values),
    {
      manual: true,
      onSuccess: () => {
        message.success('Created');
        setOpen(false);
        form.resetFields();
        refresh();
      },
      onError: (error: any) => message.error(error?.message || 'Create failed'),
    },
  );

  const { run: deleteCable } = useRequest((id: string) => cablesApi.delete(id), {
    manual: true,
    onSuccess: () => {
      message.success('Deleted');
      refresh();
    },
  });

  const { run: verifyCable } = useRequest((id: string) => cablesApi.verify(id), {
    manual: true,
    onSuccess: () => {
      message.success('Verified');
      refresh();
    },
  });

  const { run: disconnectCable } = useRequest((id: string) => cablesApi.disconnect(id), {
    manual: true,
    onSuccess: () => {
      message.success('Disconnected');
      refresh();
    },
  });

  const handleExport = async () => {
    try {
      const blob = await exportApi.exportLabels(selectedRowKeys.length > 0 ? selectedRowKeys : undefined);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cable-labels-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('Exported');
    } catch (error: any) {
      message.error(error?.message || 'Export failed');
    }
  };

  const columns: ColumnsType<CableRow> = [
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
    { title: 'Type', dataIndex: 'cableType', key: 'cableType', width: 110 },
    { title: 'Color', dataIndex: 'color', key: 'color', width: 90 },
    { title: 'Purpose', dataIndex: 'purpose', key: 'purpose', ellipsis: true },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (value: string) => <Tag color={cableStatusColor[value]}>{value}</Tag>,
    },
    {
      title: 'Action',
      key: 'action',
      width: 160,
      render: (_, record) => (
        <Space>
          {record.status !== 'VERIFIED' && <Button type="link" icon={<CheckOutlined />} onClick={() => verifyCable(record.id)} />}
          {record.status !== 'DISCONNECTED' && (
            <Button type="link" icon={<DisconnectOutlined />} onClick={() => disconnectCable(record.id)} />
          )}
          <Popconfirm title="Delete this cable?" onConfirm={() => deleteCable(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
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
            placeholder="Search trace code"
            onSearch={(value) => setQuery((prev) => ({ ...prev, search: value, page: 1 }))}
            style={{ width: 220 }}
          />
          <Select
            allowClear
            style={{ width: 140 }}
            placeholder="Status"
            onChange={(value) => setQuery((prev) => ({ ...prev, status: value ?? '', page: 1 }))}
            options={[
              { label: 'RECORDED', value: 'RECORDED' },
              { label: 'LABELED', value: 'LABELED' },
              { label: 'DISCONNECTED', value: 'DISCONNECTED' },
              { label: 'VERIFIED', value: 'VERIFIED' },
            ]}
          />
          <Select
            allowClear
            style={{ width: 140 }}
            placeholder="Type"
            onChange={(value) => setQuery((prev) => ({ ...prev, cableType: value ?? '', page: 1 }))}
            options={cableTypeOptions}
          />
        </Space>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            Export Labels{selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ''}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            New Cable
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
          onChange: (page, pageSize) => setQuery((prev) => ({ ...prev, page, pageSize })),
        }}
      />

      <Modal
        title="Create Cable"
        open={open}
        onCancel={() => {
          setOpen(false);
          form.resetFields();
        }}
        onOk={() => {
          form.validateFields().then((values) => createCable(values));
        }}
        confirmLoading={creating}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="srcDeviceId" label="Source Device" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={devices.map((device) => ({
                value: device.id,
                label: `${device.name} (${device.rack?.name ?? 'Unassigned'})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="srcPortIndex" label="Source Port" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="dstDeviceId" label="Target Device" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={devices.map((device) => ({
                value: device.id,
                label: `${device.name} (${device.rack?.name ?? 'Unassigned'})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="dstPortIndex" label="Target Port" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="cableType" label="Cable Type" rules={[{ required: true }]}>
            <Select options={cableTypeOptions} />
          </Form.Item>
          <Form.Item name="color" label="Color">
            <Input />
          </Form.Item>
          <Form.Item name="purpose" label="Purpose">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
