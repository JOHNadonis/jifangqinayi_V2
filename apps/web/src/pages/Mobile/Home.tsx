import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Col, List, Row, Spin, Statistic, Tag } from 'antd';
import { CloudSyncOutlined, DisconnectOutlined, PlusOutlined, ScanOutlined, WifiOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { dashboardApi, syncApi } from '../../services/api';
import { clearSyncedActions, getLastSyncTime, getPendingSyncActions, markAsSynced, setLastSyncTime } from '../../services/offline';

export default function MobileHome() {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const { data: stats, loading } = useRequest<any, []>(dashboardApi.getStats, { ready: isOnline });

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    getPendingSyncActions().then((actions) => setPendingCount(actions.length));
  }, []);

  const handleSync = async () => {
    if (!isOnline || syncing) return;

    setSyncing(true);
    try {
      const actions = await getPendingSyncActions();
      if (actions.length > 0) {
        const result: any = await syncApi.push(actions);
        if (result?.success) {
          await markAsSynced(actions.map((action) => action.id));
          await clearSyncedActions();
        }
      }

      const lastSyncTime = await getLastSyncTime();
      await syncApi.pull(lastSyncTime);
      await setLastSyncTime(Date.now());

      const remaining = await getPendingSyncActions();
      setPendingCount(remaining.length);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {isOnline ? <Tag icon={<WifiOutlined />} color="green">Online</Tag> : <Tag icon={<DisconnectOutlined />} color="red">Offline</Tag>}
            {pendingCount > 0 && <Tag color="orange">Pending: {pendingCount}</Tag>}
          </div>
          <Button icon={<CloudSyncOutlined spin={syncing} />} type="primary" size="small" onClick={handleSync} disabled={!isOnline}>
            Sync
          </Button>
        </div>
      </Card>

      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card hoverable style={{ textAlign: 'center' }} onClick={() => navigate('/mobile/scanner')}>
            <ScanOutlined style={{ fontSize: 32 }} />
            <div style={{ marginTop: 8 }}>Scan Cable</div>
          </Card>
        </Col>
        <Col span={12}>
          <Card hoverable style={{ textAlign: 'center' }} onClick={() => navigate('/mobile/record')}>
            <PlusOutlined style={{ fontSize: 32 }} />
            <div style={{ marginTop: 8 }}>Record Cable</div>
          </Card>
        </Col>
      </Row>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : (
        <>
          <Card title="Device Status" size="small" style={{ marginBottom: 16 }}>
            <Row gutter={12}>
              <Col span={8}><Statistic title="Total" value={stats?.overview?.totalDevices ?? 0} /></Col>
              <Col span={8}><Statistic title="Moving" value={stats?.devicesByStatus?.MOVING ?? 0} /></Col>
              <Col span={8}><Statistic title="Arrived" value={stats?.devicesByStatus?.ARRIVED ?? 0} /></Col>
            </Row>
          </Card>

          <Card title="Recent Cables" size="small">
            <List
              size="small"
              dataSource={stats?.recentCables?.slice(0, 5) ?? []}
              renderItem={(item: any) => (
                <List.Item>
                  <Tag>{item.traceCode}</Tag>
                  <span style={{ marginLeft: 8, flex: 1 }}>{item.src} to {item.dst}</span>
                  <Tag>{item.status}</Tag>
                </List.Item>
              )}
            />
          </Card>
        </>
      )}
    </div>
  );
}
