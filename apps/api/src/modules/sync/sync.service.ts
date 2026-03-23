import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface SyncAction {
  id: string;
  entityType: 'device' | 'cable' | 'rack' | 'room';
  actionType: 'CREATE' | 'UPDATE' | 'DELETE';
  data: any;
  timestamp: number;
  clientId: string;
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  conflicts: SyncConflict[];
}

export interface SyncConflict {
  actionId: string;
  entityType: string;
  entityId: string;
  reason: string;
  serverData?: any;
  clientData?: any;
}

@Injectable()
export class SyncService {
  constructor(private prisma: PrismaService) {}

  async syncFromClient(actions: SyncAction[], projectId: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      conflicts: [],
    };

    // 按时间戳排序
    const sortedActions = [...actions].sort((a, b) => a.timestamp - b.timestamp);

    for (const action of sortedActions) {
      try {
        await this.processAction(action, projectId);
        result.syncedCount++;

        // 记录同步日志
        await this.prisma.syncLog.create({
          data: {
            entityType: action.entityType,
            entityId: action.data?.id || 'unknown',
            action: action.actionType,
            data: action.data,
            clientId: action.clientId,
          },
        });
      } catch (error: any) {
        result.failedCount++;
        result.conflicts.push({
          actionId: action.id,
          entityType: action.entityType,
          entityId: action.data?.id,
          reason: error.message,
          clientData: action.data,
        });
      }
    }

    result.success = result.failedCount === 0;
    return result;
  }

  private async processAction(action: SyncAction, projectId: string) {
    switch (action.entityType) {
      case 'cable':
        await this.syncCable(action, projectId);
        break;
      case 'device':
        await this.syncDevice(action, projectId);
        break;
      case 'rack':
        await this.syncRack(action);
        break;
      case 'room':
        await this.syncRoom(action);
        break;
      default:
        throw new BadRequestException(`不支持的实体类型: ${action.entityType}`);
    }
  }

  private async syncCable(action: SyncAction, projectId: string) {
    const { actionType, data } = action;

    switch (actionType) {
      case 'CREATE':
        // 检查是否已存在（可能已被其他客户端创建）
        const existing = await this.prisma.cable.findUnique({
          where: { traceCode: data.traceCode },
        });
        if (existing) {
          throw new Error(`线缆 ${data.traceCode} 已存在`);
        }
        await this.prisma.cable.create({
          data: {
            id: data.id,
            traceCode: data.traceCode,
            srcDeviceId: data.srcDeviceId,
            srcPortIndex: data.srcPortIndex,
            dstDeviceId: data.dstDeviceId,
            dstPortIndex: data.dstPortIndex,
            cableType: data.cableType,
            color: data.color,
            purpose: data.purpose,
            photoUrl: data.photoUrl,
            status: data.status || 'RECORDED',
            projectId,
          },
        });
        break;

      case 'UPDATE':
        const cable = await this.prisma.cable.findUnique({
          where: { id: data.id },
        });
        if (!cable) {
          throw new Error(`线缆 ${data.id} 不存在`);
        }
        // 冲突检测：比较更新时间
        if (cable.updatedAt.getTime() > action.timestamp) {
          throw new Error('服务器数据更新，存在冲突');
        }
        await this.prisma.cable.update({
          where: { id: data.id },
          data: {
            color: data.color,
            purpose: data.purpose,
            photoUrl: data.photoUrl,
            status: data.status,
          },
        });
        break;

      case 'DELETE':
        await this.prisma.cable.delete({
          where: { id: data.id },
        }).catch(() => {
          // 可能已被删除，忽略
        });
        break;
    }
  }

  private async syncDevice(action: SyncAction, projectId: string) {
    const { actionType, data } = action;

    switch (actionType) {
      case 'UPDATE':
        const device = await this.prisma.device.findUnique({
          where: { id: data.id },
        });
        if (!device) {
          throw new Error(`设备 ${data.id} 不存在`);
        }
        if (device.updatedAt.getTime() > action.timestamp) {
          throw new Error('服务器数据更新，存在冲突');
        }
        await this.prisma.device.update({
          where: { id: data.id },
          data: {
            rackId: data.rackId,
            positionU: data.positionU,
            status: data.status,
            notes: data.notes,
          },
        });
        break;

      default:
        throw new Error('移动端不支持创建/删除设备');
    }
  }

  private async syncRack(action: SyncAction) {
    // 机柜同步逻辑（移动端一般只读）
    throw new Error('移动端不支持修改机柜');
  }

  private async syncRoom(action: SyncAction) {
    // 机房同步逻辑（移动端一般只读）
    throw new Error('移动端不支持修改机房');
  }

  // 获取客户端需要同步的数据（增量同步）
  async getUpdatesForClient(clientId: string, lastSyncTime: number, projectId: string) {
    const since = new Date(lastSyncTime);

    const [devices, cables, racks, rooms] = await Promise.all([
      this.prisma.device.findMany({
        where: { projectId, updatedAt: { gt: since } },
        include: {
          template: true,
          rack: { include: { room: true } },
        },
      }),
      this.prisma.cable.findMany({
        where: { projectId, updatedAt: { gt: since } },
        include: {
          srcDevice: { include: { rack: true } },
          dstDevice: { include: { rack: true } },
        },
      }),
      this.prisma.rack.findMany({
        where: { projectId, updatedAt: { gt: since } },
        include: { room: true },
      }),
      this.prisma.room.findMany({
        where: { projectId, updatedAt: { gt: since } },
      }),
    ]);

    return {
      devices,
      cables,
      racks,
      rooms,
      serverTime: Date.now(),
    };
  }
}
