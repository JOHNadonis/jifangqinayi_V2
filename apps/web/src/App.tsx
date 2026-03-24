import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import MainLayout from './layouts/MainLayout';
import MobileLayout from './layouts/MobileLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import ProjectSelect from './pages/ProjectSelect';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import RoomDetail from './pages/Rooms/Detail';
import Racks from './pages/Racks';
import RackDetail from './pages/Racks/Detail';
import Devices from './pages/Devices';
import DeviceDetail from './pages/Devices/Detail';
import Templates from './pages/Templates';
import Cables from './pages/Cables';
import Topology from './pages/Topology';
import Logs from './pages/Logs';
import ProjectSettings from './pages/ProjectSettings';
import MobileHome from './pages/Mobile/Home';
import MobileScanner from './pages/Mobile/Scanner';
import MobileRecord from './pages/Mobile/Record';
import MobileRooms from './pages/Mobile/Rooms';
import MobileRoomDetail from './pages/Mobile/RoomDetail';
import MobileDevices from './pages/Mobile/Devices';
import MobileDeviceDetail from './pages/Mobile/DeviceDetail';
import MobileCables from './pages/Mobile/Cables';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, currentProject } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!currentProject) return <Navigate to="/projects" replace />;
  return <>{children}</>;
}

function ProjectsRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <ProjectSelect />;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/projects" replace /> : <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
        <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />
        <Route path="/projects" element={<ProjectsRoute />} />

        {/* PC端路由 */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="rooms" element={<Rooms />} />
          <Route path="rooms/:id" element={<RoomDetail />} />
          <Route path="racks" element={<Racks />} />
          <Route path="racks/:id" element={<RackDetail />} />
          <Route path="devices" element={<Devices />} />
          <Route path="devices/:id" element={<DeviceDetail />} />
          <Route path="templates" element={<Templates />} />
          <Route path="cables" element={<Cables />} />
          <Route path="topology" element={<Topology />} />
          <Route path="logs" element={<Logs />} />
          <Route path="project-settings" element={<ProjectSettings />} />
        </Route>

        {/* 移动端路由 */}
        <Route
          path="/mobile"
          element={
            <PrivateRoute>
              <MobileLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<MobileHome />} />
          <Route path="scanner" element={<MobileScanner />} />
          <Route path="record" element={<MobileRecord />} />
          <Route path="rooms" element={<MobileRooms />} />
          <Route path="rooms/:id" element={<MobileRoomDetail />} />
          <Route path="devices" element={<MobileDevices />} />
          <Route path="devices/:id" element={<MobileDeviceDetail />} />
          <Route path="cables" element={<MobileCables />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
