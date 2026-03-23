import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Button, Tag, theme } from 'antd';
import {
  DashboardOutlined,
  HomeOutlined,
  AppstoreOutlined,
  HddOutlined,
  DatabaseOutlined,
  LinkOutlined,
  ApartmentOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  DownloadOutlined,
  MobileOutlined,
  SwapOutlined,
  FileTextOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { exportApi } from '../services/api';

const { Header, Sider, Content } = Layout;

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, currentProject, logout, setCurrentProject } = useAuthStore();
  const { token: themeToken } = theme.useToken();

  const isAdmin = currentProject?.role === 'ADMIN';

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
    { key: '/rooms', icon: <HomeOutlined />, label: '机房管理' },
    { key: '/racks', icon: <AppstoreOutlined />, label: '机柜管理' },
    { key: '/templates', icon: <DatabaseOutlined />, label: '设备模板' },
    { key: '/devices', icon: <HddOutlined />, label: '设备管理' },
    { key: '/cables', icon: <LinkOutlined />, label: '连线管理' },
    { key: '/topology', icon: <ApartmentOutlined />, label: '拓扑图' },
    { key: '/logs', icon: <FileTextOutlined />, label: '操作日志' },
    ...(isAdmin ? [{ key: '/project-settings', icon: <SettingOutlined />, label: '项目设置' }] : []),
  ];

  const handleMenuClick = (e: any) => {
    navigate(e.key);
  };

  const handleExportExcel = async () => {
    try {
      const response: any = await exportApi.exportExcel();
      const blob = new Blob([response], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DC-Visualizer-Export-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: user?.name || user?.username,
    },
    {
      key: 'switch-project',
      icon: <SwapOutlined />,
      label: '切换项目',
      onClick: () => {
        setCurrentProject(null);
        navigate('/projects');
      },
    },
    {
      key: 'mobile',
      icon: <MobileOutlined />,
      label: '移动端',
      onClick: () => navigate('/mobile'),
    },
    {
      key: 'export',
      icon: <DownloadOutlined />,
      label: '导出全量Excel',
      onClick: handleExportExcel,
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        style={{ boxShadow: '2px 0 8px rgba(0,0,0,0.1)' }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0',
            padding: '0 8px',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: collapsed ? 16 : 18,
              fontWeight: 600,
              color: themeToken.colorPrimary,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {collapsed ? 'DC' : 'DC-Visualizer'}
          </h1>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
            {currentProject && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 500, color: '#333' }}>{currentProject.name}</span>
                <Tag color={isAdmin ? 'blue' : 'default'} style={{ margin: 0 }}>
                  {isAdmin ? '管理员' : '成员'}
                </Tag>
              </div>
            )}
          </div>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user?.name || user?.username}</span>
            </div>
          </Dropdown>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: '#fff',
            borderRadius: 8,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
