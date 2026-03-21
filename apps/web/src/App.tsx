import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import MainLayout from './layouts/MainLayout';
import MobileLayout from './layouts/MobileLayout';
import Login from './pages/Login';
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
import MobileHome from './pages/Mobile/Home';
import MobileScanner from './pages/Mobile/Scanner';
import MobileRecord from './pages/Mobile/Record';

// 璺敱瀹堝崼
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

// 妫€娴嬫槸鍚︾Щ鍔ㄧ
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* PC绔矾鐢?*/}
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
        </Route>

        {/* 绉诲姩绔矾鐢?*/}
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

