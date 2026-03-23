import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined, ScanOutlined, HddOutlined, LinkOutlined, AppstoreOutlined,
  UserOutlined, LogoutOutlined, SwapOutlined,
} from '@ant-design/icons';
import { Dropdown } from 'antd';
import { useAuthStore } from '../stores/authStore';

export default function MobileLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, currentProject, logout, setCurrentProject } = useAuthStore();

  const tabs = [
    { key: '/mobile', title: '首页', icon: <HomeOutlined /> },
    { key: '/mobile/rooms', title: '机房', icon: <AppstoreOutlined /> },
    { key: '/mobile/devices', title: '设备', icon: <HddOutlined /> },
    { key: '/mobile/cables', title: '线缆', icon: <LinkOutlined /> },
    { key: '/mobile/scanner', title: '扫码', icon: <ScanOutlined /> },
  ];

  const isActive = (key: string) =>
    key === '/mobile' ? location.pathname === key : location.pathname.startsWith(key);

  const userMenuItems = [
    {
      key: 'switch',
      icon: <SwapOutlined />,
      label: '切换项目',
      onClick: () => { setCurrentProject(null); navigate('/projects'); },
    },
    {
      key: 'pc',
      icon: <HomeOutlined />,
      label: 'PC端',
      onClick: () => navigate('/dashboard'),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => { logout(); navigate('/login'); },
    },
  ];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部 Header */}
      <div style={{
        background: '#1890ff',
        color: '#fff',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 'calc(12px + env(safe-area-inset-top))',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{currentProject?.name || 'DC-Visualizer'}</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>{user?.name || user?.username}</div>
        </div>
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <UserOutlined style={{ fontSize: 18 }} />
          </div>
        </Dropdown>
      </div>

      {/* 内容区 */}
      <div style={{ flex: 1, overflow: 'auto', background: '#f5f5f5' }}>
        <Outlet />
      </div>

      {/* 底部 Tab */}
      <div style={{
        borderTop: '1px solid #eee',
        background: '#fff',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom)',
        flexShrink: 0,
      }}>
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
