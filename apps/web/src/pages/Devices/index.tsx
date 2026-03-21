import { useState, useCallback } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Modal,
  Form,
  message,
  Popconfirm,
  Card,
  Row,
  Col,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SwapOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { useNavigate } from 'react-router-dom';
import { Resizable, ResizeCallbackData } from 'react-resizable';
import { devicesApi, templatesApi, racksApi, importApi } from '@/services/api';
import ImportModal from '@/components/ImportModal';

const { Search } = Input;
const { Option } = Select;

// 可拖拽调整宽度的表头组件
interface ResizableTitleProps {
  onResize: (e: React.SyntheticEvent, data: ResizeCallbackData) => void;
  width: number;
  [key: string]: any;
}

const ResizableTitle: React.FC<ResizableTitleProps> = (props) => {
  const { onResize, width, ...restProps } = props;

  if (!width) {
    return <th {...restProps} />;
  }

  return (
    <Resizable
      width={width}
      height={0}
      handle={
        <span
          className="react-resizable-handle"
          style={{
            position: 'absolute',
            right: -5,
            bottom: 0,
            width: 10,
            height: '100%',
            cursor: 'col-resize',
            zIndex: 1,
          }}
          onClick={(e) => e.stopPropagation()}
        />
      }
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} />
    </Resizable>
  );
};

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

interface Device {
  id: string;
  name: string;
  templateId: string;
  templateName?: string;
  rackId: string;
  rackName?: string;
  positionU: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Template {
  id: string;
  name: string;
  brand: string;
  model: string;
  sizeU: number;
}

interface Rack {
  id: string;
  name: string;
  roomId: string;
  room?: { name: string };
  totalU: number;
}

export default function DevicesPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // State
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [rackFilter, setRackFilter] = useState<string | undefined>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    name: 150,
    templateName: 200,
    location: 250,
    status: 100,
    action: 150,
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // Fetch devices
  const {
    data: devicesData,
    loading: devicesLoading,
    refresh: refreshDevices,
  } = useRequest(
    () =>
      devicesApi.list({
        page: pagination.current,
        pageSize: pagination.pageSize,
        search: searchText,
        status: statusFilter,
        rackId: rackFilter,
      }),
    {
      refreshDeps: [
        pagination.current,
        pagination.pageSize,
        searchText,
        statusFilter,
        rackFilter,
      ],
      onSuccess: (data: any) => {
        setPagination((prev) => ({
          ...prev,
          total: data.total || 0,
        }));
      },
    }
  );

  // Fetch templates for add modal
  const { data: templatesData } = useRequest(() => templatesApi.list(), {
    manual: false,
  });

  // Fetch racks for filters and add modal
  const { data: racksData } = useRequest(() => racksApi.list(), {
    manual: false,
  });

  // Get available U positions for selected rack
  const { data: rackUsageData, run: fetchRackUsage } = useRequest(
    (rackId: string) => racksApi.getUsage(rackId),
    { manual: true }
  );

  const devices: Device[] = devicesData?.data || [];
  const templates: Template[] = templatesData?.data || [];
  const racks: Rack[] = racksData?.data || [];

  // 处理列宽拖拽
  const handleResize = useCallback(
    (key: string) =>
      (_: React.SyntheticEvent, { size }: ResizeCallbackData) => {
        setColumnWidths((prev) => ({
          ...prev,
          [key]: size.width,
        }));
      },
    []
  );

  // Columns definition with resizable widths
  const baseColumns: ColumnsType<Device> = [
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
      width: columnWidths.name,
      render: (text: string, record: Device) => (
        <Button
          type="link"
          onClick={() => navigate(`/devices/${record.id}`)}
        >
          {text}
        </Button>
      ),
    },
    {
      title: '型号',
      dataIndex: 'templateName',
      key: 'templateName',
      width: columnWidths.templateName,
      render: (_: any, record: Device) => {
        const template = templates.find((t) => t.id === record.templateId);
        return template ? `${template.brand} ${template.model}` : '-';
      },
    },
    {
      title: '机柜位置',
      key: 'location',
      width: columnWidths.location,
      render: (_: any, record: Device) => {
        const rack = racks.find((r) => r.id === record.rackId);
        return rack
          ? `${rack.room?.name || ''} - ${rack.name} - U${record.positionU}`
          : '-';
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: columnWidths.status,
      render: (status: string) => (
        <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: columnWidths.action,
      render: (_: any, record: Device) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/devices/${record.id}`)}
          >
            详情
          </Button>
          <Popconfirm
            title="确定删除此设备吗？"
            description="删除后将无法恢复，相关连线也会被删除"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 为列添加 onHeaderCell 以支持拖拽
  const columns = baseColumns.map((col) => ({
    ...col,
    onHeaderCell: (column: any) => ({
      width: column.width,
      onResize: handleResize(column.key as string),
    }),
  }));

  // Handlers
  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (paginationConfig: any) => {
    setPagination({
      current: paginationConfig.current,
      pageSize: paginationConfig.pageSize,
      total: paginationConfig.total,
    });
  };

  const handleAddDevice = () => {
    setIsAddModalVisible(true);
    form.resetFields();
  };

  const handleAddModalOk = async () => {
    try {
      const values = await form.validateFields();
      await devicesApi.create(values);
      message.success('设备添加成功');
      setIsAddModalVisible(false);
      form.resetFields();
      refreshDevices();
    } catch (error: any) {
      if (error.errorFields) {
        // Form validation error
        return;
      }
      message.error(error.message || '添加设备失败');
    }
  };

  const handleAddModalCancel = () => {
    setIsAddModalVisible(false);
    form.resetFields();
  };

  const handleDelete = async (id: string) => {
    try {
      await devicesApi.delete(id);
      message.success('设备删除成功');
      refreshDevices();
    } catch (error: any) {
      message.error(error.message || '删除设备失败');
    }
  };

  const handleBatchStatusChange = async (status: string) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要操作的设备');
      return;
    }

    try {
      await Promise.all(
        selectedRowKeys.map((id) =>
          devicesApi.updateStatus(id as string, status)
        )
      );
      message.success(`已将${selectedRowKeys.length}个设备状态更新为${statusLabels[status]}`);
      setSelectedRowKeys([]);
      refreshDevices();
    } catch (error: any) {
      message.error(error.message || '批量更新状态失败');
    }
  };

  const handleRackChange = (rackId: string) => {
    form.setFieldsValue({ positionU: undefined });
    if (rackId) {
      fetchRackUsage(rackId);
    }
  };

  const getAvailableUPositions = () => {
    const selectedRackId = form.getFieldValue('rackId');
    if (!selectedRackId || !rackUsageData) {
      return [];
    }

    const rack = racks.find((r) => r.id === selectedRackId);
    if (!rack) return [];

    // usedSlots contains { start, end, deviceId, deviceName }
    const occupiedPositions: number[] = [];
    (rackUsageData.usedSlots || []).forEach((slot: any) => {
      for (let i = slot.start; i <= slot.end; i++) {
        occupiedPositions.push(i);
      }
    });

    const selectedTemplateId = form.getFieldValue('templateId');
    const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
    const deviceHeight = selectedTemplate?.sizeU || 1;

    const available = [];
    for (let i = 1; i <= rack.totalU - deviceHeight + 1; i++) {
      let isAvailable = true;
      for (let j = 0; j < deviceHeight; j++) {
        if (occupiedPositions.includes(i + j)) {
          isAvailable = false;
          break;
        }
      }
      if (isAvailable) {
        available.push(i);
      }
    }

    return available;
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>设备管理</h2>

      {/* Filters and Actions */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="搜索设备名称"
              allowClear
              onSearch={handleSearch}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="状态筛选"
              allowClear
              onChange={(value) => {
                setStatusFilter(value);
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
              style={{ width: '100%' }}
            >
              <Option value="ONLINE">在线</Option>
              <Option value="MOVING">搬迁中</Option>
              <Option value="OFFLINE">离线</Option>
              <Option value="ARRIVED">已到达</Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="机柜筛选"
              allowClear
              showSearch
              optionFilterProp="children"
              onChange={(value) => {
                setRackFilter(value);
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
              style={{ width: '100%' }}
            >
              {racks.map((rack) => (
                <Option key={rack.id} value={rack.id}>
                  {rack.room?.name} - {rack.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddDevice}
              >
                新增设备
              </Button>
              <Button
                icon={<UploadOutlined />}
                onClick={() => setIsImportModalVisible(true)}
              >
                导入设备
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Batch Actions */}
        {selectedRowKeys.length > 0 && (
          <Row style={{ marginTop: 16 }}>
            <Col span={24}>
              <Space>
                <span>已选择 {selectedRowKeys.length} 项</span>
                <Button
                  size="small"
                  icon={<SwapOutlined />}
                  onClick={() => handleBatchStatusChange('ONLINE')}
                >
                  设为在线
                </Button>
                <Button
                  size="small"
                  icon={<SwapOutlined />}
                  onClick={() => handleBatchStatusChange('MOVING')}
                >
                  设为搬迁中
                </Button>
                <Button
                  size="small"
                  icon={<SwapOutlined />}
                  onClick={() => handleBatchStatusChange('OFFLINE')}
                >
                  设为离线
                </Button>
                <Button
                  size="small"
                  icon={<SwapOutlined />}
                  onClick={() => handleBatchStatusChange('ARRIVED')}
                >
                  设为已到达
                </Button>
              </Space>
            </Col>
          </Row>
        )}
      </Card>

      {/* Table */}
      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={devices}
        rowKey="id"
        loading={devicesLoading}
        pagination={pagination}
        onChange={handleTableChange}
        components={{
          header: {
            cell: ResizableTitle,
          },
        }}
        scroll={{ x: 'max-content' }}
      />

      {/* Add Device Modal */}
      <Modal
        title="新增设备"
        open={isAddModalVisible}
        onOk={handleAddModalOk}
        onCancel={handleAddModalCancel}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: 'ONLINE' }}
        >
          <Form.Item
            label="设备名称"
            name="name"
            rules={[{ required: true, message: '请输入设备名称' }]}
          >
            <Input placeholder="请输入设备名称" />
          </Form.Item>

          <Form.Item
            label="设备模板"
            name="templateId"
            rules={[{ required: true, message: '请选择设备模板' }]}
          >
            <Select
              placeholder="请选择设备模板"
              showSearch
              optionFilterProp="children"
              onChange={() => {
                form.setFieldsValue({ positionU: undefined });
                const rackId = form.getFieldValue('rackId');
                if (rackId) {
                  fetchRackUsage(rackId);
                }
              }}
            >
              {templates.map((template) => (
                <Option key={template.id} value={template.id}>
                  {template.brand} {template.model} ({template.sizeU}U)
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="目标机柜"
            name="rackId"
            rules={[{ required: true, message: '请选择目标机柜' }]}
          >
            <Select
              placeholder="请选择目标机柜"
              showSearch
              optionFilterProp="children"
              onChange={handleRackChange}
            >
              {racks.map((rack) => (
                <Option key={rack.id} value={rack.id}>
                  {rack.room?.name} - {rack.name} ({rack.totalU}U)
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="U位起始位置"
            name="positionU"
            rules={[{ required: true, message: '请选择U位起始位置' }]}
          >
            <Select placeholder="请选择U位起始位置">
              {getAvailableUPositions().map((pos) => (
                <Option key={pos} value={pos}>
                  U{pos}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="初始状态"
            name="status"
            rules={[{ required: true, message: '请选择初始状态' }]}
          >
            <Select>
              <Option value="ONLINE">在线</Option>
              <Option value="OFFLINE">离线</Option>
              <Option value="MOVING">搬迁中</Option>
              <Option value="ARRIVED">已到达</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Import Modal */}
      <ImportModal
        open={isImportModalVisible}
        title="导入设备数据"
        onClose={() => setIsImportModalVisible(false)}
        onDownloadTemplate={importApi.downloadDevicesTemplate}
        onImport={importApi.importDevices}
        templateName="设备导入模板.xlsx"
        onSuccess={refreshDevices}
      />
    </div>
  );
}
