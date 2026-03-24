import { useState } from 'react';
import { Button, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Tooltip, message } from 'antd';
import { CheckOutlined, DeleteOutlined, DisconnectOutlined, DownloadOutlined, PlusOutlined, TagOutlined } from '@ant-design/icons';
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
        message.success('创建成功');
        setOpen(false);
        form.resetFields();
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
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
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
              options={devices.map((device) => ({
                value: device.id,
                label: `${device.name} (${device.rack?.name ?? '未上架'})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="srcPortIndex" label="源端端口" rules={[{ required: true, message: '请输入源端端口' }]}>
            <Input placeholder="例如：GE0/0/1" />
          </Form.Item>
          <Form.Item name="dstDeviceId" label="目标设备" rules={[{ required: true, message: '请选择目标设备' }]}>
            <Select
              showSearch
              placeholder="选择目标设备"
              optionFilterProp="label"
              options={devices.map((device) => ({
                value: device.id,
                label: `${device.name} (${device.rack?.name ?? '未上架'})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="dstPortIndex" label="目标端口" rules={[{ required: true, message: '请输入目标端口' }]}>
            <Input placeholder="例如：GE0/0/2" />
          </Form.Item>
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
