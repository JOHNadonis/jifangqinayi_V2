import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { HomeOutlined, ScanOutlined, PlusCircleOutlined } from '@ant-design/icons';

export default function MobileLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { key: '/mobile', title: '首页', icon: <HomeOutlined /> },
    { key: '/mobile/scanner', title: '扫码', icon: <ScanOutlined /> },
    { key: '/mobile/record', title: '录入', icon: <PlusCircleOutlined /> },
  ];

  const isActive = (key: string) => location.pathname === key;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto', background: '#f5f5f5' }}>
        <Outlet />
      </div>
      <div
        style={{
          borderTop: '1px solid #eee',
          background: '#fff',
          display: 'flex',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {tabs.map((tab) => (
          <div
            key={tab.key}
            onClick={() => navigate(tab.key)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '8px 0',
              cursor: 'pointer',
              color: isActive(tab.key) ? '#1890ff' : '#666',
            }}
          >
            <span style={{ fontSize: 22 }}>{tab.icon}</span>
            <span style={{ fontSize: 12, marginTop: 2 }}>{tab.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
