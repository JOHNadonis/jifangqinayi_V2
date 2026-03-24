import { Button, Card, Col, Progress, Row, Spin, Statistic, Table, Tag, message } from 'antd';
import { AppstoreOutlined, DownloadOutlined, HddOutlined, HomeOutlined, LinkOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { dashboardApi, exportApi } from '../services/api';

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

  const handleExport = async () => {
    try {
      const blob = await exportApi.exportExcel();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `全量数据导出_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch {
      message.error('导出失败');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 96 }}>
        <Spin size="large" />
      </div>
    );
  }

  const deviceColumns = [
    { title: '设备名称', dataIndex: 'name', key: 'name' },
    { title: '模板', dataIndex: 'template', key: 'template' },
    { title: '位置', dataIndex: 'location', key: 'location' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => <Tag color={statusColor[value]}>{value}</Tag>,
    },
  ];

  const cableColumns = [
    { title: '追溯码', dataIndex: 'traceCode', key: 'traceCode' },
    { title: '源端', dataIndex: 'src', key: 'src' },
    { title: '目标', dataIndex: 'dst', key: 'dst' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => <Tag color={statusColor[value]}>{value}</Tag>,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>仪表盘</h2>
        <Button icon={<DownloadOutlined />} onClick={handleExport}>
          导出全部数据
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="机房" value={data?.overview?.totalRooms ?? 0} prefix={<HomeOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="机柜" value={data?.overview?.totalRacks ?? 0} prefix={<AppstoreOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="设备" value={data?.overview?.totalDevices ?? 0} prefix={<HddOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="线缆" value={data?.overview?.totalCables ?? 0} prefix={<LinkOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="搬迁进度">
            <Progress percent={data?.overview?.migrationProgress ?? 0} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="线缆回收率">
            <Progress percent={data?.overview?.cableRecoveryRate ?? 0} status="active" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="最近设备">
            <Table rowKey="id" pagination={false} size="small" columns={deviceColumns} dataSource={data?.recentDevices ?? []} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="最近线缆">
            <Table rowKey="id" pagination={false} size="small" columns={cableColumns} dataSource={data?.recentCables ?? []} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
