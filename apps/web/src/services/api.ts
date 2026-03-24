import axios, { type AxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const { token, currentProject } = useAuthStore.getState();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (currentProject) {
      config.headers['X-Project-Id'] = currentProject.id;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  },
);

const get = <T = any>(url: string, config?: AxiosRequestConfig) =>
  api.get<any, T>(url, config);
const post = <T = any>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  api.post<any, T>(url, data, config);
const patch = <T = any>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  api.patch<any, T>(url, data, config);
const del = <T = any>(url: string, config?: AxiosRequestConfig) =>
  api.delete<any, T>(url, config);
const getBlob = (url: string, config?: AxiosRequestConfig) =>
  api.get<Blob, Blob>(url, { ...config, responseType: 'blob' });

export default api;

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const authApi = {
  login: (data: { username: string; password: string }) => post('/auth/login', data),
  register: (data: { username: string; password: string; name: string }) => post('/auth/register', data),
  getProfile: () => get('/auth/profile'),
};

export const dashboardApi = {
  getStats: () => get('/dashboard/stats'),
  getMigrationProgress: () => get('/dashboard/migration-progress'),
};

export const roomsApi = {
  list: (params?: Record<string, unknown>) => get('/rooms', { params }),
  get: (id: string) => get(`/rooms/${id}`),
  create: (data: unknown) => post('/rooms', data),
  update: (id: string, data: unknown) => patch(`/rooms/${id}`, data),
  delete: (id: string) => del(`/rooms/${id}`),
};

export const racksApi = {
  list: (params?: Record<string, unknown>) => get('/racks', { params }),
  get: (id: string) => get(`/racks/${id}`),
  getUsage: (id: string) => get(`/racks/${id}/usage`),
  create: (data: unknown) => post('/racks', data),
  update: (id: string, data: unknown) => patch(`/racks/${id}`, data),
  delete: (id: string) => del(`/racks/${id}`),
};

export const templatesApi = {
  list: (params?: Record<string, unknown>) => get('/templates', { params }),
  get: (id: string) => get(`/templates/${id}`),
  create: (data: unknown) => post('/templates', data),
  update: (id: string, data: unknown) => patch(`/templates/${id}`, data),
  delete: (id: string) => del(`/templates/${id}`),
  generatePorts: (id: string, data: unknown) => post(`/templates/${id}/generate-ports`, data),
};

export const devicesApi = {
  list: (params?: Record<string, unknown>) => get('/devices', { params }),
  get: (id: string) => get(`/devices/${id}`),
  create: (data: unknown) => post('/devices', data),
  update: (id: string, data: unknown) => patch(`/devices/${id}`, data),
  delete: (id: string) => del(`/devices/${id}`),
  move: (id: string, data: unknown) => post(`/devices/${id}/move`, data),
  updateStatus: (id: string, status: string) => patch(`/devices/${id}/status/${status}`),
};

export const cablesApi = {
  list: (params?: Record<string, unknown>) => get('/cables', { params }),
  get: (id: string) => get(`/cables/${id}`),
  getByTraceCode: (traceCode: string) => get(`/cables/trace/${traceCode}`),
  create: (data: unknown) => post('/cables', data),
  update: (id: string, data: unknown) => patch(`/cables/${id}`, data),
  delete: (id: string) => del(`/cables/${id}`),
  verify: (id: string) => post(`/cables/${id}/verify`),
  disconnect: (id: string) => post(`/cables/${id}/disconnect`),
  exportLabels: (ids?: string[]) => get('/cables/export-labels', { params: { ids: ids?.join(',') } }),
};

export const topologyApi = {
  getByRoom: (roomId: string) => get(`/topology/room/${roomId}`),
  getDeviceConnections: (deviceId: string) => get(`/topology/device/${deviceId}`),
};

export const exportApi = {
  exportExcel: () => getBlob('/export/excel'),
  exportLabels: (ids?: string[]) => getBlob('/export/labels', { params: { ids: ids?.join(',') } }),
};

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export const importApi = {
  downloadRacksTemplate: () => getBlob('/import/template/racks'),
  downloadTemplatesTemplate: () => getBlob('/import/template/templates'),
  downloadDevicesTemplate: () => getBlob('/import/template/devices'),
  importRacks: (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    return post('/import/racks', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importTemplates: (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    return post('/import/templates', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importDevices: (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    return post('/import/devices', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const syncApi = {
  push: (actions: unknown[]) => post('/sync/push', actions),
  pull: (lastSyncTime: number) => get('/sync/pull', { params: { lastSyncTime } }),
};

export const projectsApi = {
  list: () => get('/projects'),
  get: (id: string) => get(`/projects/${id}`),
  create: (data: { name: string; description?: string }) => post('/projects', data),
  update: (id: string, data: { name?: string; description?: string }) => patch(`/projects/${id}`, data),
  delete: (id: string) => del(`/projects/${id}`),
  joinByCode: (inviteCode: string) => post('/projects/join-by-code', { inviteCode }),
  applyToJoin: (id: string) => post(`/projects/${id}/apply`),
  search: (q: string) => get('/projects/search', { params: { q } }),
  getMembers: (id: string) => get(`/projects/${id}/members`),
  getPendingRequests: (id: string) => get(`/projects/${id}/pending`),
  approveRequest: (id: string, userId: string) => post(`/projects/${id}/members/${userId}/approve`),
  rejectRequest: (id: string, userId: string) => post(`/projects/${id}/members/${userId}/reject`),
  updateMemberRole: (id: string, userId: string, role: string) => patch(`/projects/${id}/members/${userId}/role`, { role }),
  removeMember: (id: string, userId: string) => del(`/projects/${id}/members/${userId}`),
  regenerateCode: (id: string) => post(`/projects/${id}/regenerate-code`),
};

export const logsApi = {
  getActivity: (params?: Record<string, unknown>) => get('/logs/activity', { params }),
  getErrors: (params?: Record<string, unknown>) => get('/logs/errors', { params }),
};
