import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequest } from 'ahooks';
import { List, Tag, Input, Select, Spin, Empty } from 'antd';
import { HddOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import { devicesApi } from '../../services/api';

const STATUS_COLORS: Record<string, string> = {
  ONLINE: 'green', MOVING: 'orange', OFFLINE: 'red', ARRIVED: 'blue',
};
const STATUS_LABELS: Record<string, string> = {
  ONLINE: '在线', MOVING: '搬迁中', OFFLINE: '离线', ARRIVED: '已到达',
};

export default function MobileDevices() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>();

  const { data, loading } = useRequest(
    () => devicesApi.list({ search, status }) as any,
    { refreshDeps: [search, status] }
  );
  const devices: any[] = (data as any) || [];

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>设备列表</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索设备名称"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
          allowClear
        />
        <Select
          placeholder="状态"
          allowClear
          style={{ width: 100 }}
          value={status}
          onChange={setStatus}
          options={Object.entries(STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))}
        />
      </div>
      <Spin spinning={loading}>
        {devices.length === 0 && !loading ? (
          <Empty description="暂无设备" />
        ) : (
          <List
            dataSource={devices}
            renderItem={(device: any) => (
              <List.Item
                onClick={() => navigate(`/mobile/devices/${device.id}`)}
                style={{ background: '#fff', borderRadius: 8, marginBottom: 8, padding: '12px 16px', cursor: 'pointer' }}
              >
                <List.Item.Meta
                  avatar={<HddOutlined style={{ fontSize: 20, color: '#1890ff' }} />}
                  title={device.name}
                  description={`${device.template?.brand} ${device.template?.model}`}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag color={STATUS_COLORS[device.status]}>{STATUS_LABELS[device.status]}</Tag>
                  <RightOutlined style={{ color: '#ccc' }} />
                </div>
              </List.Item>
            )}
          />
        )}
      </Spin>
    </div>
  );
}
