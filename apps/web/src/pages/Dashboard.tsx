import { Card, Col, Progress, Row, Spin, Statistic, Table, Tag } from 'antd';
import { AppstoreOutlined, HddOutlined, HomeOutlined, LinkOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { dashboardApi } from '../services/api';

const statusColor: Record<string, string> = {
  ONLINE: 'green',
  MOVING: 'orange',
  OFFLINE: 'red',
  ARRIVED: 'blue',
  RECORDED: 'default',
  LABELED: 'processing',
  DISCONNECTED: 'warning',
  VERIFIED: 'success',
};

interface DashboardStats {
  overview?: {
    totalRooms?: number;
    totalRacks?: number;
    totalDevices?: number;
    totalCables?: number;
    migrationProgress?: number;
    cableRecoveryRate?: number;
  };
  devicesByStatus?: Record<string, number>;
  cablesByStatus?: Record<string, number>;
  recentDevices?: Array<{ id: string; name: string; template: string; location: string; status: string }>;
  recentCables?: Array<{ id: string; traceCode: string; src: string; dst: string; status: string }>;
}

export default function Dashboard() {
  const { data, loading } = useRequest<DashboardStats, []>(dashboardApi.getStats);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 96 }}>
        <Spin size="large" />
      </div>
    );
  }

  const deviceColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Template', dataIndex: 'template', key: 'template' },
    { title: 'Location', dataIndex: 'location', key: 'location' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => <Tag color={statusColor[value]}>{value}</Tag>,
    },
  ];

  const cableColumns = [
    { title: 'Trace Code', dataIndex: 'traceCode', key: 'traceCode' },
    { title: 'Source', dataIndex: 'src', key: 'src' },
    { title: 'Target', dataIndex: 'dst', key: 'dst' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => <Tag color={statusColor[value]}>{value}</Tag>,
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Dashboard</h2>

      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Rooms" value={data?.overview?.totalRooms ?? 0} prefix={<HomeOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Racks" value={data?.overview?.totalRacks ?? 0} prefix={<AppstoreOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Devices" value={data?.overview?.totalDevices ?? 0} prefix={<HddOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Cables" value={data?.overview?.totalCables ?? 0} prefix={<LinkOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Migration Progress">
            <Progress percent={data?.overview?.migrationProgress ?? 0} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Cable Recovery">
            <Progress percent={data?.overview?.cableRecoveryRate ?? 0} status="active" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Recent Devices">
            <Table rowKey="id" pagination={false} size="small" columns={deviceColumns} dataSource={data?.recentDevices ?? []} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Recent Cables">
            <Table rowKey="id" pagination={false} size="small" columns={cableColumns} dataSource={data?.recentCables ?? []} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
