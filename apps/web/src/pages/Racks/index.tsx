import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequest } from 'ahooks';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Modal,
  Form,
  InputNumber,
  message,
  Popconfirm,
  Card,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  UploadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { racksApi, roomsApi, importApi, exportApi } from '@/services/api';
import ImportModal from '@/components/ImportModal';
import type { ColumnsType } from 'antd/es/table';

interface Rack {
  id: string;
  name: string;
  roomId: string;
  roomName?: string;
  totalU: number;
  usedU: number;
  deviceCount: number;
  location?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface RackFormValues {
  name: string;
  roomId: string;
  totalU: number;
  location?: string;
  description?: string;
}

const RacksPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<RackFormValues>();

  const [searchText, setSearchText] = useState('');
  const [roomFilter, setRoomFilter] = useState<string | undefined>();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [editingRack, setEditingRack] = useState<Rack | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });

  // 获取机柜列表
  const { data: racksData, loading, refresh } = useRequest(
    () => racksApi.list({
      page: pagination.current,
      pageSize: pagination.pageSize,
      search: searchText,
      roomId: roomFilter,
    }),
    {
      refreshDeps: [pagination.current, pagination.pageSize, searchText, roomFilter],
    }
  );

  // 获取机房列表用于筛选
  const { data: roomsData } = useRequest(() => roomsApi.list());

  // 创建机柜
  const { runAsync: createRack, loading: creating } = useRequest(
    (values: RackFormValues) => racksApi.create(values),
    {
      manual: true,
      onSuccess: () => {
        message.success('机柜创建成功');
        setIsModalVisible(false);
        form.resetFields();
        refresh();
      },
      onError: (error) => {
        message.error(`创建失败: ${error.message}`);
      },
    }
  );

  // 更新机柜
  const { runAsync: updateRack, loading: updating } = useRequest(
    (id: string, values: RackFormValues) => racksApi.update(id, values),
    {
      manual: true,
      onSuccess: () => {
        message.success('机柜更新成功');
        setIsModalVisible(false);
        setEditingRack(null);
        form.resetFields();
        refresh();
      },
      onError: (error) => {
        message.error(`更新失败: ${error.message}`);
      },
    }
  );

  // 删除机柜
  const { runAsync: deleteRack } = useRequest(
    (id: string) => racksApi.delete(id),
    {
      manual: true,
      onSuccess: () => {
        message.success('机柜删除成功');
        refresh();
      },
      onError: (error) => {
        message.error(`删除失败: ${error.message}`);
      },
    }
  );

  const columns: ColumnsType<Rack> = [
    {
      title: '机柜名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '所属机房',
      dataIndex: 'roomName',
      key: 'roomName',
      width: 150,
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location',
      width: 120,
    },
    {
      title: 'U位总数',
      dataIndex: 'totalU',
      key: 'totalU',
      width: 100,
      align: 'center',
    },
    {
      title: '已使用U位',
      dataIndex: 'usedU',
      key: 'usedU',
      width: 120,
      align: 'center',
      render: (usedU: number, record: Rack) => (
        <span style={{ color: usedU > record.totalU * 0.8 ? '#ff4d4f' : undefined }}>
          {usedU}
        </span>
      ),
    },
    {
      title: '使用率',
      key: 'usageRate',
      width: 120,
      align: 'center',
      render: (_, record: Rack) => {
        const rate = ((record.usedU / record.totalU) * 100).toFixed(1);
        return (
          <span style={{ color: parseFloat(rate) > 80 ? '#ff4d4f' : undefined }}>
            {rate}%
          </span>
        );
      },
    },
    {
      title: '设备数量',
      dataIndex: 'deviceCount',
      key: 'deviceCount',
      width: 100,
      align: 'center',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 180,
      render: (_, record: Rack) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/racks/${record.id}`)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description={`确定要删除机柜 "${record.name}" 吗？${record.deviceCount > 0 ? '该机柜中还有设备！' : ''}`}
            onConfirm={() => deleteRack(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleEdit = (record: Rack) => {
    setEditingRack(record);
    form.setFieldsValue({
      name: record.name,
      roomId: record.roomId,
      totalU: record.totalU,
      location: record.location,
      description: record.description,
    });
    setIsModalVisible(true);
  };

  const handleAdd = () => {
    setEditingRack(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingRack) {
        await updateRack(editingRack.id, values);
      } else {
        await createRack(values);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setEditingRack(null);
    form.resetFields();
  };

  const handleTableChange = (newPagination: any) => {
    setPagination({
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    });
  };

  const handleExport = async () => {
    try {
      const blob = await exportApi.exportExcel();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `机柜数据导出_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch {
      message.error('导出失败');
    }
  };

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 搜索和筛选区域 */}
        <Space wrap>
          <Input
            placeholder="搜索机柜名称"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            placeholder="选择机房"
            style={{ width: 200 }}
            value={roomFilter}
            onChange={setRoomFilter}
            allowClear
            options={roomsData?.data?.map((room: any) => ({
              label: room.name,
              value: room.id,
            }))}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            新增机柜
          </Button>
          <Button
            icon={<UploadOutlined />}
            onClick={() => setIsImportModalVisible(true)}
          >
            导入机柜
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            导出Excel
          </Button>
        </Space>

        {/* 表格 */}
        <Table
          columns={columns}
          dataSource={racksData?.data || []}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            total: racksData?.total || 0,
            showTotal: (total) => `共 ${total} 条`,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Space>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingRack ? '编辑机柜' : '新增机柜'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={creating || updating}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            totalU: 42,
          }}
        >
          <Form.Item
            name="name"
            label="机柜名称"
            rules={[
              { required: true, message: '请输入机柜名称' },
              { max: 50, message: '机柜名称不能超过50个字符' },
            ]}
          >
            <Input placeholder="请输入机柜名称" />
          </Form.Item>

          <Form.Item
            name="roomId"
            label="所属机房"
            rules={[{ required: true, message: '请选择所属机房' }]}
          >
            <Select
              placeholder="请选择所属机房"
              options={roomsData?.data?.map((room: any) => ({
                label: room.name,
                value: room.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="totalU"
            label="U位总数"
            rules={[
              { required: true, message: '请输入U位总数' },
              { type: 'number', min: 1, max: 100, message: 'U位总数必须在1-100之间' },
            ]}
          >
            <InputNumber
              placeholder="请输入U位总数"
              style={{ width: '100%' }}
              min={1}
              max={100}
            />
          </Form.Item>

          <Form.Item
            name="location"
            label="位置"
            rules={[{ max: 100, message: '位置描述不能超过100个字符' }]}
          >
            <Input placeholder="请输入位置（如：A区第3排）" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
            rules={[{ max: 500, message: '描述不能超过500个字符' }]}
          >
            <Input.TextArea
              placeholder="请输入描述信息"
              rows={4}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 导入弹窗 */}
      <ImportModal
        open={isImportModalVisible}
        title="导入机柜数据"
        onClose={() => setIsImportModalVisible(false)}
        onDownloadTemplate={importApi.downloadRacksTemplate}
        onImport={importApi.importRacks}
        templateName="机柜导入模板.xlsx"
        onSuccess={refresh}
      />
    </Card>
  );
};

export default RacksPage;
