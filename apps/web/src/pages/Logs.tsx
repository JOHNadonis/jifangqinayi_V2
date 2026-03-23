import { useState } from 'react';
import { useRequest } from 'ahooks';
import { Table, Tag, Select, Button, Space, Typography, Card, Row, Col } from 'antd';
import { FileTextOutlined, ReloadOutlined } from '@ant-design/icons';
import { logsApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';

const { Title } = Typography;

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
};

const ENTITY_LABELS: Record<string, string> = {
  Room: '机房',
  Rack: '机柜',
  Device: '设备',
  Cable: '线缆',
  DeviceTemplate: '设备模板',
};

export default function Logs() {
  const { currentProject } = useAuthStore();
  const isAdmin = currentProject?.role === 'ADMIN';
  const [activeTab, setActiveTab] = useState<'activity' | 'errors'>('activity');
  const [filters, setFilters] = useState<Record<string, any>>({ page: 1, pageSize: 20 });

  const { data: activityData, loading: activityLoading, refresh: refreshActivity } = useRequest(
    () => logsApi.getActivity(filters) as any,
    { refreshDeps: [filters] }
  );

  const { data: errorData, loading: errorLoading, refresh: refreshErrors } = useRequest(
    () => logsApi.getErrors({ page: 1, pageSize: 20 }) as any,
    { ready: isAdmin && activeTab === 'errors' }
  );

  const activityColumns = [
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 180,
      render: (v: string) => new Date(v).toLocaleString('zh-CN') },
    { title: '操作人', dataIndex: 'username', key: 'username', width: 100 },
    { title: '操作', dataIndex: 'action', key: 'action', width: 80,
      render: (v: string) => <Tag color={ACTION_COLORS[v] || 'default'}>{v}</Tag> },
    { title: '对象类型', dataIndex: 'entityType', key: 'entityType', width: 100,
      render: (v: string) => ENTITY_LABELS[v] || v },
    { title: '对象名称', dataIndex: 'entityName', key: 'entityName' },
  ];

  const errorColumns = [
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 180,
      render: (v: string) => new Date(v).toLocaleString('zh-CN') },
    { title: '用户', dataIndex: 'username', key: 'username', width: 100 },
    { title: '方法', dataIndex: 'method', key: 'method', width: 80 },
    { title: '路径', dataIndex: 'path', key: 'path', width: 200 },
    { title: '状态码', dataIndex: 'statusCode', key: 'statusCode', width: 80,
      render: (v: number) => <Tag color={v >= 500 ? 'red' : 'orange'}>{v}</Tag> },
    { title: '错误信息', dataIndex: 'message', key: 'message', ellipsis: true },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <FileTextOutlined style={{ marginRight: 8 }} />
          操作日志
        </Title>
        <Button icon={<ReloadOutlined />} onClick={activeTab === 'activity' ? refreshActivity : refreshErrors}>
          刷新
        </Button>
      </div>

      {isAdmin && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col>
            <Button
              type={activeTab === 'activity' ? 'primary' : 'default'}
              onClick={() => setActiveTab('activity')}
            >
              操作日志
            </Button>
          </Col>
          <Col>
            <Button
              type={activeTab === 'errors' ? 'primary' : 'default'}
              onClick={() => setActiveTab('errors')}
            >
              错误日志
            </Button>
          </Col>
        </Row>
      )}

      {activeTab === 'activity' && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Space wrap>
              <Select
                placeholder="操作类型"
                allowClear
                style={{ width: 120 }}
                options={[
                  { value: 'CREATE', label: '创建' },
                  { value: 'UPDATE', label: '更新' },
                  { value: 'DELETE', label: '删除' },
                ]}
                onChange={(v) => setFilters((f) => ({ ...f, action: v, page: 1 }))}
              />
              <Select
                placeholder="对象类型"
                allowClear
                style={{ width: 120 }}
                options={Object.entries(ENTITY_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                onChange={(v) => setFilters((f) => ({ ...f, entityType: v, page: 1 }))}
              />
            </Space>
          </Card>
          <Table
            dataSource={(activityData as any)?.data || []}
            columns={activityColumns}
            rowKey="id"
            loading={activityLoading}
            pagination={{
              current: filters.page,
              pageSize: filters.pageSize,
              total: (activityData as any)?.total || 0,
              onChange: (page) => setFilters((f) => ({ ...f, page })),
            }}
          />
        </>
      )}

      {activeTab === 'errors' && isAdmin && (
        <Table
          dataSource={(errorData as any)?.data || []}
          columns={errorColumns}
          rowKey="id"
          loading={errorLoading}
          pagination={{ pageSize: 20 }}
        />
      )}
    </div>
  );
}
