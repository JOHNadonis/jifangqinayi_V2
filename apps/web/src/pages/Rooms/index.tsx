import { useCallback, useState } from 'react';
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
  message,
  Popconfirm,
  Card,
  Tag,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import { Resizable, ResizeCallbackData } from 'react-resizable';
import { roomsApi, exportApi } from '@/services/api';

const { Option } = Select;

const ResizableTitle = (props: any) => {
  const { onResize, width, ...restProps } = props;
  if (!width) return <th {...restProps} />;
  return (
    <Resizable
      width={width}
      height={0}
      handle={<span className="react-resizable-handle" style={{ position: 'absolute', right: -5, bottom: 0, width: 10, height: '100%', cursor: 'col-resize', zIndex: 1 }} onClick={(e) => e.stopPropagation()} />}
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} />
    </Resizable>
  );
};

interface Room {
  id: string;
  name: string;
  type: 'OLD' | 'NEW';
  location?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export default function Rooms() {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form] = Form.useForm();
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    name: 200, type: 110, location: 200, createdAt: 180, action: 160,
  });

  const handleResize = useCallback(
    (key: string) => (_: React.SyntheticEvent, { size }: ResizeCallbackData) => {
      setColWidths((prev) => ({ ...prev, [key]: size.width }));
    },
    []
  );

  // 获取机房列表
  const { data, loading, run: fetchRooms } = useRequest(
    () => roomsApi.list({ search: searchText, type: typeFilter }),
    {
      refreshDeps: [searchText, typeFilter],
      debounceWait: 300,
    }
  );

  // 创建机房
  const { run: createRoom, loading: creating } = useRequest(
    (values) => roomsApi.create(values),
    {
      manual: true,
      onSuccess: () => {
        message.success('机房创建成功');
        setIsModalVisible(false);
        form.resetFields();
        fetchRooms();
      },
      onError: (error: any) => {
        message.error(error?.message || '创建失败');
      },
    }
  );

  // 更新机房
  const { run: updateRoom, loading: updating } = useRequest(
    (id: string, values: any) => roomsApi.update(id, values),
    {
      manual: true,
      onSuccess: () => {
        message.success('机房更新成功');
        setIsModalVisible(false);
        setEditingRoom(null);
        form.resetFields();
        fetchRooms();
      },
      onError: (error: any) => {
        message.error(error?.message || '更新失败');
      },
    }
  );

  // 删除机房
  const { run: deleteRoom } = useRequest(
    (id: string) => roomsApi.delete(id),
    {
      manual: true,
      onSuccess: () => {
        message.success('机房删除成功');
        fetchRooms();
      },
      onError: (error: any) => {
        message.error(error?.message || '删除失败');
      },
    }
  );

  const handleAdd = () => {
    setEditingRoom(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: Room) => {
    setEditingRoom(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = (id: string) => {
    deleteRoom(id);
  };

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      if (editingRoom) {
        updateRoom(editingRoom.id, values);
      } else {
        createRoom(values);
      }
    });
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setEditingRoom(null);
    form.resetFields();
  };

  const handleExport = async () => {
    try {
      const blob = await exportApi.exportExcel();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `机房数据导出_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch {
      message.error('导出失败');
    }
  };

  const handleRowClick = (record: Room) => {
    navigate(`/rooms/${record.id}`);
  };

  const baseColumns = [
    {
      title: '机房名称',
      dataIndex: 'name',
      key: 'name',
      width: colWidths.name,
      sorter: (a: Room, b: Room) => a.name.localeCompare(b.name),
      showSorterTooltip: false,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: colWidths.type,
      sorter: (a: Room, b: Room) => a.type.localeCompare(b.type),
      showSorterTooltip: false,
      render: (type: string) => (
        <Tag color={type === 'OLD' ? 'orange' : 'green'}>
          {type === 'OLD' ? '旧机房' : '新机房'}
        </Tag>
      ),
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location',
      width: colWidths.location,
      sorter: (a: Room, b: Room) => (a.location || '').localeCompare(b.location || ''),
      showSorterTooltip: false,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: colWidths.createdAt,
      sorter: (a: Room, b: Room) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      showSorterTooltip: false,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: colWidths.action,
      fixed: 'right' as const,
      render: (_: any, record: Room) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(record);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此机房吗？"
            onConfirm={(e) => {
              e?.stopPropagation();
              handleDelete(record.id);
            }}
            onCancel={(e) => e?.stopPropagation()}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const columns = baseColumns.map((col) => ({
    ...col,
    onHeaderCell: (column: any) => ({
      width: column.width,
      onResize: handleResize(col.key as string),
    }),
  }));

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>机房管理</h2>

      <Card>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Input
              placeholder="搜索机房名称"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Select
              placeholder="筛选类型"
              value={typeFilter}
              onChange={setTypeFilter}
              style={{ width: 150 }}
              allowClear
            >
              <Option value="OLD">旧机房</Option>
              <Option value="NEW">新机房</Option>
            </Select>
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增机房
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出Excel
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={loading}
          components={{ header: { cell: ResizableTitle } }}
          scroll={{ x: 'max-content' }}
          pagination={{
            total: data?.total || 0,
            pageSize: data?.pageSize || 10,
            current: data?.page || 1,
            showTotal: (total) => `共 ${total} 条`,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      <Modal
        title={editingRoom ? '编辑机房' : '新增机房'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={creating || updating}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ type: 'OLD' }}
        >
          <Form.Item
            name="name"
            label="机房名称"
            rules={[{ required: true, message: '请输入机房名称' }]}
          >
            <Input placeholder="请输入机房名称" />
          </Form.Item>

          <Form.Item
            name="type"
            label="机房类型"
            rules={[{ required: true, message: '请选择机房类型' }]}
          >
            <Select placeholder="请选择机房类型">
              <Option value="OLD">旧机房</Option>
              <Option value="NEW">新机房</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="location"
            label="位置"
          >
            <Input placeholder="请输入位置信息" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={4} placeholder="请输入机房描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
