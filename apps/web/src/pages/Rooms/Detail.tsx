import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRequest } from 'ahooks';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Spin,
  Tag,
  message,
} from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { racksApi, roomsApi } from '@/services/api';

interface RackItem {
  id: string;
  name: string;
  roomId: string;
  totalU: number;
  usedU?: number;
  location?: string;
  description?: string;
}

interface RoomDetailData {
  id: string;
  name: string;
  type: 'OLD' | 'NEW';
  location?: string;
  description?: string;
  createdAt: string;
}

interface RackForm {
  name: string;
  totalU: number;
  location?: string;
  description?: string;
}

interface Paged<T> {
  data: T[];
}

const roomTypeLabels: Record<string, string> = {
  OLD: '旧机房',
  NEW: '新机房',
};

export default function RoomDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editingRack, setEditingRack] = useState<RackItem | null>(null);
  const [form] = Form.useForm<RackForm>();

  const { data: room, loading: roomLoading } = useRequest<RoomDetailData, []>(() => roomsApi.get(id!), { ready: !!id });

  const { data: racksResp, loading: racksLoading, refresh } = useRequest<Paged<RackItem>, []>(
    () => racksApi.list({ roomId: id, pageSize: 200 }),
    { ready: !!id },
  );

  const racks = racksResp?.data ?? [];

  const { runAsync: createRack, loading: creating } = useRequest((payload: any) => racksApi.create(payload), { manual: true });
  const { runAsync: updateRack, loading: updating } = useRequest((rackId: string, payload: any) => racksApi.update(rackId, payload), {
    manual: true,
  });
  const { runAsync: deleteRack } = useRequest((rackId: string) => racksApi.delete(rackId), { manual: true });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingRack) {
        await updateRack(editingRack.id, values);
        message.success('机柜更新成功');
      } else {
        await createRack({ ...values, roomId: id });
        message.success('机柜创建成功');
      }
      setOpen(false);
      setEditingRack(null);
      form.resetFields();
      refresh();
    } catch (error: any) {
      if (!error?.errorFields) {
        message.error(error?.message || '保存失败');
      }
    }
  };

  const handleDelete = async (rackId: string) => {
    await deleteRack(rackId);
    message.success('机柜删除成功');
    refresh();
  };

  if (roomLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/rooms')}>
          返回
        </Button>
      </div>

      <Card title="机房信息" style={{ marginBottom: 16 }}>
        <Descriptions column={2}>
          <Descriptions.Item label="名称">{room?.name}</Descriptions.Item>
          <Descriptions.Item label="类型">
            <Tag color={room?.type === 'OLD' ? 'orange' : 'green'}>{roomTypeLabels[room?.type || ''] || room?.type}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="位置">{room?.location || '-'}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{room?.createdAt ? new Date(room.createdAt).toLocaleString() : '-'}</Descriptions.Item>
          <Descriptions.Item label="描述" span={2}>
            {room?.description || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title={`机柜列表 (${racks.length})`}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingRack(null);
              form.resetFields();
              form.setFieldValue('totalU', 42);
              setOpen(true);
            }}
          >
            新增机柜
          </Button>
        }
      >
        <Spin spinning={racksLoading}>
          <Row gutter={[12, 12]}>
            {racks.map((rack) => (
              <Col key={rack.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  onClick={() => navigate(`/racks/${rack.id}`)}
                  actions={[
                    <EditOutlined
                      key="edit"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingRack(rack);
                        form.setFieldsValue({
                          name: rack.name,
                          totalU: rack.totalU,
                          location: rack.location,
                          description: rack.description,
                        });
                        setOpen(true);
                      }}
                    />,
                    <Popconfirm
                      key="delete"
                      title="确定删除此机柜？"
                      okText="确定"
                      cancelText="取消"
                      onConfirm={(event) => {
                        event?.stopPropagation();
                        handleDelete(rack.id);
                      }}
                    >
                      <DeleteOutlined
                        onClick={(event) => event.stopPropagation()}
                        style={{ color: '#ff4d4f' }}
                      />
                    </Popconfirm>,
                  ]}
                >
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{rack.name}</div>
                  <div>总U位: {rack.totalU}</div>
                  <div>已用U位: {rack.usedU ?? 0}</div>
                  {rack.location && <div>位置: {rack.location}</div>}
                </Card>
              </Col>
            ))}
          </Row>
        </Spin>
      </Card>

      <Modal
        title={editingRack ? '编辑机柜' : '新增机柜'}
        open={open}
        onCancel={() => {
          setOpen(false);
          setEditingRack(null);
          form.resetFields();
        }}
        onOk={handleSubmit}
        confirmLoading={creating || updating}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入机柜名称' }]}>
            <Input placeholder="例如：A01" />
          </Form.Item>
          <Form.Item name="totalU" label="总U位" rules={[{ required: true, message: '请输入总U位' }]}>
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="location" label="位置">
            <Input placeholder="例如：A区第1排" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="机柜用途描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
