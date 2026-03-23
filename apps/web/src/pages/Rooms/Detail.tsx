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
        message.success('Rack updated');
      } else {
        await createRack({ ...values, roomId: id });
        message.success('Rack created');
      }
      setOpen(false);
      setEditingRack(null);
      form.resetFields();
      refresh();
    } catch (error: any) {
      if (!error?.errorFields) {
        message.error(error?.message || 'Save failed');
      }
    }
  };

  const handleDelete = async (rackId: string) => {
    await deleteRack(rackId);
    message.success('Rack deleted');
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
          Back
        </Button>
      </div>

      <Card title="Room" style={{ marginBottom: 16 }}>
        <Descriptions column={2}>
          <Descriptions.Item label="Name">{room?.name}</Descriptions.Item>
          <Descriptions.Item label="Type">
            <Tag color={room?.type === 'OLD' ? 'orange' : 'green'}>{room?.type}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Location">{room?.location || '-'}</Descriptions.Item>
          <Descriptions.Item label="Created At">{room?.createdAt ? new Date(room.createdAt).toLocaleString() : '-'}</Descriptions.Item>
          <Descriptions.Item label="Description" span={2}>
            {room?.description || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title={`Racks (${racks.length})`}
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
            New Rack
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
                      title="Delete this rack?"
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
                  <div>Total U: {rack.totalU}</div>
                  <div>Used U: {rack.usedU ?? 0}</div>
                  {rack.location && <div>Location: {rack.location}</div>}
                </Card>
              </Col>
            ))}
          </Row>
        </Spin>
      </Card>

      <Modal
        title={editingRack ? 'Edit Rack' : 'Create Rack'}
        open={open}
        onCancel={() => {
          setOpen(false);
          setEditingRack(null);
          form.resetFields();
        }}
        onOk={handleSubmit}
        confirmLoading={creating || updating}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="totalU" label="Total U" rules={[{ required: true }]}>
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="location" label="Location">
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
