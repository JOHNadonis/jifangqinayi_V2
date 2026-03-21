// ==================== 枚举类型 ====================

export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum RoomType {
  OLD = 'OLD',
  NEW = 'NEW',
}

export enum DeviceType {
  SERVER = 'SERVER',
  SWITCH = 'SWITCH',
  ROUTER = 'ROUTER',
  FIREWALL = 'FIREWALL',
  STORAGE = 'STORAGE',
  PDU = 'PDU',
  OTHER = 'OTHER',
}

export enum DeviceStatus {
  ONLINE = 'ONLINE',
  MOVING = 'MOVING',
  OFFLINE = 'OFFLINE',
  ARRIVED = 'ARRIVED',
}

export enum CableType {
  FIBER = 'FIBER',
  CAT6 = 'CAT6',
  CAT5E = 'CAT5E',
  POWER = 'POWER',
  OTHER = 'OTHER',
}

export enum CableStatus {
  RECORDED = 'RECORDED',
  LABELED = 'LABELED',
  DISCONNECTED = 'DISCONNECTED',
  VERIFIED = 'VERIFIED',
}

export enum PortType {
  RJ45 = 'RJ45',
  SFP = 'SFP',
  SFP_PLUS = 'SFP+',
  QSFP = 'QSFP',
  QSFP_PLUS = 'QSFP+',
  POWER = 'POWER',
  USB = 'USB',
  CONSOLE = 'CONSOLE',
  OTHER = 'OTHER',
}

// ==================== 端口布局类型 ====================

export interface PortDefinition {
  id: string;
  name: string;
  type: PortType;
  x: number;
  y: number;
  row?: number;
  col?: number;
}

export interface PortLayout {
  front?: PortDefinition[];
  rear?: PortDefinition[];
}

// ==================== 实体类型 ====================

export interface User {
  id: string;
  username: string;
  role: Role;
  createdAt: Date;
}

export interface Room {
  id: string;
  name: string;
  location: string;
  type: RoomType;
  racks?: Rack[];
  createdAt: Date;
}

export interface Rack {
  id: string;
  name: string;
  roomId: string;
  room?: Room;
  totalU: number;
  row?: number;
  column?: number;
  devices?: Device[];
  createdAt: Date;
}

export interface DeviceTemplate {
  id: string;
  brand: string;
  model: string;
  sizeU: number;
  deviceType: DeviceType;
  frontImage?: string;
  rearImage?: string;
  portLayout: PortLayout;
  isPublic: boolean;
  createdAt: Date;
}

export interface Device {
  id: string;
  name: string;
  assetTag?: string;
  templateId: string;
  template?: DeviceTemplate;
  rackId?: string;
  rack?: Rack;
  positionU?: number;
  status: DeviceStatus;
  cablesFrom?: Cable[];
  cablesTo?: Cable[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Cable {
  id: string;
  traceCode: string;
  srcDeviceId: string;
  srcDevice?: Device;
  srcPortIndex: string;
  dstDeviceId: string;
  dstDevice?: Device;
  dstPortIndex: string;
  cableType: CableType;
  color?: string;
  purpose?: string;
  photoUrl?: string;
  status: CableStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== API 请求/响应类型 ====================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: Omit<User, 'password'>;
}

export interface CreateRoomRequest {
  name: string;
  location: string;
  type: RoomType;
}

export interface CreateRackRequest {
  name: string;
  roomId: string;
  totalU?: number;
  row?: number;
  column?: number;
}

export interface CreateDeviceTemplateRequest {
  brand: string;
  model: string;
  sizeU: number;
  deviceType: DeviceType;
  frontImage?: string;
  rearImage?: string;
  portLayout: PortLayout;
  isPublic?: boolean;
}

export interface CreateDeviceRequest {
  name: string;
  assetTag?: string;
  templateId: string;
  rackId?: string;
  positionU?: number;
  status?: DeviceStatus;
}

export interface MoveDeviceRequest {
  rackId: string;
  positionU: number;
}

export interface CreateCableRequest {
  srcDeviceId: string;
  srcPortIndex: string;
  dstDeviceId: string;
  dstPortIndex: string;
  cableType: CableType;
  color?: string;
  purpose?: string;
  photoUrl?: string;
}

export interface VerifyCableRequest {
  status: CableStatus;
}

// ==================== 离线同步类型 ====================

export enum SyncActionType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export interface SyncAction {
  id: string;
  entityType: 'device' | 'cable' | 'rack' | 'room';
  actionType: SyncActionType;
  data: unknown;
  timestamp: number;
  synced: boolean;
}

// ==================== 拓扑图类型 ====================

export interface TopologyNode {
  id: string;
  label: string;
  deviceType: DeviceType;
  status: DeviceStatus;
  rackName?: string;
  positionU?: number;
  x?: number;
  y?: number;
}

export interface TopologyEdge {
  id: string;
  source: string;
  sourcePort: string;
  target: string;
  targetPort: string;
  cableType: CableType;
  status: CableStatus;
}

export interface TopologyData {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

// ==================== 分页类型 ====================

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==================== 统计类型 ====================

export interface DashboardStats {
  totalRooms: number;
  totalRacks: number;
  totalDevices: number;
  totalCables: number;
  devicesByStatus: Record<DeviceStatus, number>;
  cablesByStatus: Record<CableStatus, number>;
  migrationProgress: number;
}
