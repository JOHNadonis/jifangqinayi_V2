import { useState } from 'react';
import { useRequest } from 'ahooks';
import { List, Tag, Input, Select, Spin, Empty } from 'antd';
import { LinkOutlined, SearchOutlined } from '@ant-design/icons';
import { cablesApi } from '../../services/api';

const STATUS_COLORS: Record<string, string> = {
  RECORDED: 'default', LABELED: 'blue', VERIFIED: 'green', DISCONNECTED: 'red',
};

export default function MobileCables() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>();

  const { data, loading } = useRequest(
    () => cablesApi.list({ search, status }) as any,
    { refreshDeps: [search, status] }
  );
  const cables: any[] = (data as any) || [];

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>线缆列表</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索追踪码"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
          allowClear
        />
        <Select
          placeholder="状态"
          allowClear
          style={{ width: 110 }}
          value={status}
          onChange={setStatus}
          options={[
            { value: 'RECORDED', label: '已记录' },
            { value: 'LABELED', label: '已标记' },
            { value: 'VERIFIED', label: '已验证' },
            { value: 'DISCONNECTED', label: '已断开' },
          ]}
        />
      </div>
      <Spin spinning={loading}>
        {cables.length === 0 && !loading ? (
          <Empty description="暂无线缆" />
        ) : (
          <List
            dataSource={cables}
            renderItem={(cable: any) => (
              <List.Item
                style={{ background: '#fff', borderRadius: 8, marginBottom: 8, padding: '12px 16px' }}
              >
                <List.Item.Meta
                  avatar={<LinkOutlined style={{ fontSize: 20, color: '#1890ff' }} />}
                  title={cable.traceCode}
                  description={`${cable.srcDevice?.name || '-'} → ${cable.dstDevice?.name || '-'}`}
                />
                <Tag color={STATUS_COLORS[cable.status]}>{cable.status}</Tag>
              </List.Item>
            )}
          />
        )}
      </Spin>
    </div>
  );
}
