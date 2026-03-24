import { useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, InputNumber, Space, Tag, Popconfirm, message, Card, Tabs, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, UploadOutlined, MinusCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { templatesApi, importApi, exportApi } from '../services/api';
import ImportModal from '../components/ImportModal';

const deviceTypes = [
  { value: 'SERVER', label: '服务器', color: 'blue' },
  { value: 'SWITCH', label: '交换机', color: 'green' },
  { value: 'ROUTER', label: '路由器', color: 'orange' },
  { value: 'FIREWALL', label: '防火墙', color: 'red' },
  { value: 'STORAGE', label: '存储', color: 'purple' },
  { value: 'PDU', label: '配电单元', color: 'cyan' },
  { value: 'OTHER', label: '其他', color: 'default' },
];

const portTypes = [
  { value: 'RJ45', label: 'RJ45 电口', color: '#4299e1' },
  { value: 'SFP', label: 'SFP 光口', color: '#48bb78' },
  { value: 'SFP+', label: 'SFP+ 万兆光口', color: '#38a169' },
  { value: 'QSFP', label: 'QSFP 光口', color: '#2f855a' },
  { value: 'QSFP+', label: 'QSFP+ 光口', color: '#276749' },
  { value: 'QSFP28', label: 'QSFP28 100G光口', color: '#22543d' },
  { value: 'CONSOLE', label: 'Console 管理口', color: '#ed8936' },
  { value: 'USB', label: 'USB 端口', color: '#9f7aea' },
  { value: 'POWER', label: '电源口', color: '#e53e3e' },
  { value: 'MGMT', label: '管理网口', color: '#667eea' },
];

export default function Templates() {
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [form] = Form.useForm();
  const [query, setQuery] = useState({ page: 1, pageSize: 20, search: '', deviceType: '' });

  const { data, loading, refresh } = useRequest(
    () => {
      // 过滤掉空字符串参数
      const params: Record<string, any> = { page: query.page, pageSize: query.pageSize };
      if (query.search) params.search = query.search;
      if (query.deviceType) params.deviceType = query.deviceType;
      return templatesApi.list(params);
    },
    { refreshDeps: [query.page, query.pageSize, query.search, query.deviceType] }
  );

  const { run: createTemplate, loading: creating } = useRequest(
    (values) => templatesApi.create(values),
    {
      manual: true,
      onSuccess: () => {
        message.success('创建成功');
        setModalOpen(false);
        form.resetFields();
        refresh();
      },
    }
  );

  const { run: updateTemplate, loading: updating } = useRequest(
    (id, values) => templatesApi.update(id, values),
    {
      manual: true,
      onSuccess: () => {
        message.success('更新成功');
        setModalOpen(false);
        setEditingId(null);
        form.resetFields();
        refresh();
      },
    }
  );

  const { run: deleteTemplate } = useRequest(
    (id) => templatesApi.delete(id),
    {
      manual: true,
      onSuccess: () => {
        message.success('删除成功');
        refresh();
      },
      onError: (err: any) => {
        message.error(err.message || '删除失败');
      },
    }
  );

  const handleExport = async () => {
    try {
      const blob = await exportApi.exportExcel();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `模板数据导出_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch {
      message.error('导出失败');
    }
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();

    // 构建端口布局 - 支持多种端口类型
    const portLayout: any = { front: [], rear: [] };
    let portIndex = 0;
    const portWidth = 18;
    const rowHeight = 20;
    const maxPortsPerRow = 24;

    // 处理前面板端口组
    if (values.frontPortGroups && values.frontPortGroups.length > 0) {
      for (const group of values.frontPortGroups) {
        if (!group || !group.count || group.count <= 0) continue;

        const portType = group.type || 'RJ45';
        const prefix = group.prefix || portType;

        for (let i = 0; i < group.count; i++) {
          const col = portIndex % maxPortsPerRow;
          const row = Math.floor(portIndex / maxPortsPerRow);

          portLayout.front.push({
            id: `port${portIndex + 1}`,
            name: `${prefix}${i + 1}`,
            type: portType,
            x: 30 + col * portWidth,
            y: 15 + row * rowHeight,
            row: row + 1,
            col: col + 1,
          });
          portIndex++;
        }
      }
    }

    // 处理后面板端口组
    if (values.rearPortGroups && values.rearPortGroups.length > 0) {
      let rearPortIndex = 0;
      for (const group of values.rearPortGroups) {
        if (!group || !group.count || group.count <= 0) continue;

        const portType = group.type || 'POWER';
        const prefix = group.prefix || portType;

        for (let i = 0; i < group.count; i++) {
          const col = rearPortIndex % maxPortsPerRow;
          const row = Math.floor(rearPortIndex / maxPortsPerRow);

          portLayout.rear.push({
            id: `rear_port${rearPortIndex + 1}`,
            name: `${prefix}${i + 1}`,
            type: portType,
            x: 30 + col * portWidth,
            y: 15 + row * rowHeight,
            row: row + 1,
            col: col + 1,
          });
          rearPortIndex++;
        }
      }
    }

    const templateData = {
      brand: values.brand,
      model: values.model,
      sizeU: values.sizeU,
      deviceType: values.deviceType,
      isPublic: values.isPublic || false,
      portLayout,
    };

    if (editingId) {
      updateTemplate(editingId, templateData);
    } else {
      createTemplate(templateData);
    }
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);

    // 解析现有端口布局，按类型分组
    const frontPortGroups: any[] = [];
    const rearPortGroups: any[] = [];

    if (record.portLayout?.front && record.portLayout.front.length > 0) {
      const typeGroups: Record<string, { type: string; count: number; prefix: string }> = {};
      for (const port of record.portLayout.front) {
        const type = port.type || 'RJ45';
        if (!typeGroups[type]) {
          // 从端口名称中提取前缀
          const match = port.name?.match(/^([A-Za-z_]+)/);
          const prefix = match ? match[1] : type;
          typeGroups[type] = { type, count: 0, prefix };
        }
        typeGroups[type].count++;
      }
      frontPortGroups.push(...Object.values(typeGroups));
    }

    if (record.portLayout?.rear && record.portLayout.rear.length > 0) {
      const typeGroups: Record<string, { type: string; count: number; prefix: string }> = {};
      for (const port of record.portLayout.rear) {
        const type = port.type || 'POWER';
        if (!typeGroups[type]) {
          const match = port.name?.match(/^([A-Za-z_]+)/);
          const prefix = match ? match[1] : type;
          typeGroups[type] = { type, count: 0, prefix };
        }
        typeGroups[type].count++;
      }
      rearPortGroups.push(...Object.values(typeGroups));
    }

    form.setFieldsValue({
      brand: record.brand,
      model: record.model,
      sizeU: record.sizeU,
      deviceType: record.deviceType,
      isPublic: record.isPublic,
      frontPortGroups: frontPortGroups.length > 0 ? frontPortGroups : [{ type: 'RJ45', count: 0, prefix: 'Port' }],
      rearPortGroups: rearPortGroups.length > 0 ? rearPortGroups : [],
    });
    setModalOpen(true);
  };

  const columns = [
    {
      title: '品牌',
      dataIndex: 'brand',
      width: 120,
      sorter: (a: any, b: any) => (a.brand || '').localeCompare(b.brand || ''),
      showSorterTooltip: false,
    },
    {
      title: '型号',
      dataIndex: 'model',
      width: 200,
      sorter: (a: any, b: any) => (a.model || '').localeCompare(b.model || ''),
      showSorterTooltip: false,
    },
    {
      title: '设备类型',
      dataIndex: 'deviceType',
      width: 100,
      sorter: (a: any, b: any) => (a.deviceType || '').localeCompare(b.deviceType || ''),
      showSorterTooltip: false,
      render: (type: string) => {
        const item = deviceTypes.find((t) => t.value === type);
        return <Tag color={item?.color}>{item?.label || type}</Tag>;
      },
    },
    {
      title: 'U高度',
      dataIndex: 'sizeU',
      width: 80,
      sorter: (a: any, b: any) => (a.sizeU || 0) - (b.sizeU || 0),
      showSorterTooltip: false,
    },
    {
      title: '端口数',
      dataIndex: 'portLayout',
      width: 80,
      sorter: (a: any, b: any) => {
        const countA = (a.portLayout?.front?.length || 0) + (a.portLayout?.rear?.length || 0);
        const countB = (b.portLayout?.front?.length || 0) + (b.portLayout?.rear?.length || 0);
        return countA - countB;
      },
      showSorterTooltip: false,
      render: (layout: any) => (layout?.front?.length || 0) + (layout?.rear?.length || 0),
    },
    {
      title: '公开',
      dataIndex: 'isPublic',
      width: 80,
      sorter: (a: any, b: any) => Number(a.isPublic || false) - Number(b.isPublic || false),
      showSorterTooltip: false,
      render: (v: boolean) => (v ? <Tag color="green">是</Tag> : <Tag>否</Tag>),
    },
    {
      title: '使用数量',
      dataIndex: '_count',
      width: 100,
      sorter: (a: any, b: any) => (a._count?.devices || 0) - (b._count?.devices || 0),
      showSorterTooltip: false,
      render: (count: any) => count?.devices || 0,
    },
    {
      title: '操作',
      width: 150,
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setPreviewTemplate(record)}
          />
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="确定删除该模板吗？"
            onConfirm={() => deleteTemplate(record.id)}
            disabled={record._count?.devices > 0}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={record._count?.devices > 0}
            />
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
            placeholder="搜索品牌或型号"
            allowClear
            style={{ width: 200 }}
            onSearch={(v) => setQuery({ ...query, search: v, page: 1 })}
          />
          <Select
            placeholder="设备类型"
            allowClear
            style={{ width: 120 }}
            options={deviceTypes}
            onChange={(v) => setQuery({ ...query, deviceType: v || '', page: 1 })}
          />
        </Space>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingId(null);
              form.resetFields();
              setModalOpen(true);
            }}
          >
            新增模板
          </Button>
          <Button
            icon={<UploadOutlined />}
            onClick={() => setImportModalOpen(true)}
          >
            导入模板
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            导出Excel
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={(data as any)?.data || []}
        rowKey="id"
        loading={loading}
        pagination={{
          current: query.page,
          pageSize: query.pageSize,
          total: (data as any)?.total || 0,
          showSizeChanger: true,
          showQuickJumper: true,
          onChange: (page, pageSize) => setQuery({ ...query, page, pageSize }),
        }}
      />

      {/* 新增/编辑 Modal */}
      <Modal
        title={editingId ? '编辑模板' : '新增模板'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setModalOpen(false);
          setEditingId(null);
          form.resetFields();
        }}
        confirmLoading={creating || updating}
        width={700}
      >
        <Form form={form} layout="vertical" initialValues={{ frontPortGroups: [{ type: 'RJ45', count: 24, prefix: 'Port' }] }}>
          <Form.Item name="brand" label="品牌" rules={[{ required: true }]}>
            <Input placeholder="如: Huawei, Cisco, Dell" />
          </Form.Item>
          <Form.Item name="model" label="型号" rules={[{ required: true }]}>
            <Input placeholder="如: S5735-L48T4S-A" />
          </Form.Item>
          <Form.Item name="deviceType" label="设备类型" rules={[{ required: true }]}>
            <Select options={deviceTypes} />
          </Form.Item>
          <Form.Item name="sizeU" label="U高度" rules={[{ required: true }]}>
            <InputNumber min={1} max={50} style={{ width: '100%' }} />
          </Form.Item>

          <Divider orientation="left" plain>前面板端口配置</Divider>
          <Form.List name="frontPortGroups">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'type']}
                      rules={[{ required: true, message: '请选择端口类型' }]}
                    >
                      <Select style={{ width: 160 }} placeholder="端口类型" options={portTypes} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'count']}
                      rules={[{ required: true, message: '请输入数量' }]}
                    >
                      <InputNumber min={1} max={128} placeholder="数量" style={{ width: 80 }} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'prefix']}
                    >
                      <Input placeholder="前缀(如 GE)" style={{ width: 100 }} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add({ type: 'RJ45', count: 1, prefix: '' })} block icon={<PlusOutlined />}>
                    添加前面板端口组
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Divider orientation="left" plain>后面板端口配置</Divider>
          <Form.List name="rearPortGroups">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'type']}
                      rules={[{ required: true, message: '请选择端口类型' }]}
                    >
                      <Select style={{ width: 160 }} placeholder="端口类型" options={portTypes} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'count']}
                      rules={[{ required: true, message: '请输入数量' }]}
                    >
                      <InputNumber min={1} max={128} placeholder="数量" style={{ width: 80 }} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'prefix']}
                    >
                      <Input placeholder="前缀(如 PWR)" style={{ width: 100 }} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add({ type: 'POWER', count: 1, prefix: '' })} block icon={<PlusOutlined />}>
                    添加后面板端口组
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.Item name="isPublic" label="是否公开">
            <Select
              options={[
                { value: true, label: '是' },
                { value: false, label: '否' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 预览 Modal */}
      <Modal
        title={`预览: ${previewTemplate?.brand} ${previewTemplate?.model}`}
        open={!!previewTemplate}
        onCancel={() => setPreviewTemplate(null)}
        footer={null}
        width={700}
      >
        {previewTemplate && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <p><strong>品牌:</strong> {previewTemplate.brand}</p>
              <p><strong>型号:</strong> {previewTemplate.model}</p>
              <p><strong>类型:</strong> {deviceTypes.find((t) => t.value === previewTemplate.deviceType)?.label}</p>
              <p><strong>U高度:</strong> {previewTemplate.sizeU}U</p>
              <p><strong>端口统计:</strong> {(() => {
                const ports = [...(previewTemplate.portLayout?.front || []), ...(previewTemplate.portLayout?.rear || [])];
                const stats: Record<string, number> = {};
                ports.forEach((p: any) => {
                  stats[p.type] = (stats[p.type] || 0) + 1;
                });
                return Object.entries(stats).map(([type, count]) => {
                  const portType = portTypes.find(t => t.value === type);
                  return <Tag key={type} color={portType?.color || '#666'} style={{ marginRight: 4 }}>{portType?.label || type}: {count}</Tag>;
                });
              })()}</p>
            </Card>
            <Tabs
              items={[
                {
                  key: 'front',
                  label: '前面板',
                  children: (
                    <div
                      style={{
                        background: '#1a1a2e',
                        borderRadius: 8,
                        padding: 16,
                        minHeight: 100,
                        position: 'relative',
                      }}
                    >
                      {previewTemplate.portLayout?.front?.map((port: any, idx: number) => {
                        const portType = portTypes.find(t => t.value === port.type);
                        return (
                          <div
                            key={idx}
                            title={`${port.name} (${portType?.label || port.type})`}
                            style={{
                              position: 'absolute',
                              left: port.x,
                              top: port.y,
                              width: 14,
                              height: 14,
                              borderRadius: 2,
                              background: portType?.color || '#666',
                              cursor: 'pointer',
                            }}
                          />
                        );
                      })}
                      {(!previewTemplate.portLayout?.front || previewTemplate.portLayout.front.length === 0) && (
                        <p style={{ color: '#666', textAlign: 'center' }}>暂无端口配置</p>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'rear',
                  label: '后面板',
                  children: (
                    <div
                      style={{
                        background: '#1a1a2e',
                        borderRadius: 8,
                        padding: 16,
                        minHeight: 100,
                        position: 'relative',
                      }}
                    >
                      {previewTemplate.portLayout?.rear?.map((port: any, idx: number) => {
                        const portType = portTypes.find(t => t.value === port.type);
                        return (
                          <div
                            key={idx}
                            title={`${port.name} (${portType?.label || port.type})`}
                            style={{
                              position: 'absolute',
                              left: port.x,
                              top: port.y,
                              width: 14,
                              height: 14,
                              borderRadius: 2,
                              background: portType?.color || '#666',
                              cursor: 'pointer',
                            }}
                          />
                        );
                      })}
                      {(!previewTemplate.portLayout?.rear || previewTemplate.portLayout.rear.length === 0) && (
                        <p style={{ color: '#666', textAlign: 'center' }}>暂无端口配置</p>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Modal>

      {/* 导入弹窗 */}
      <ImportModal
        open={importModalOpen}
        title="导入设备模板"
        onClose={() => setImportModalOpen(false)}
        onDownloadTemplate={importApi.downloadTemplatesTemplate}
        onImport={importApi.importTemplates}
        templateName="设备模板导入模板.xlsx"
        onSuccess={refresh}
      />
    </div>
  );
}
