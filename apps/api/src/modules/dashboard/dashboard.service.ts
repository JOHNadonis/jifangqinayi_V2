import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

type DeviceStatus = 'ONLINE' | 'MOVING' | 'OFFLINE' | 'ARRIVED';
type CableStatus = 'RECORDED' | 'LABELED' | 'DISCONNECTED' | 'VERIFIED';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(projectId: string) {
    const where = { projectId };
    const [
      totalRooms, totalRacks, totalDevices, totalCables,
      devicesByStatus, cablesByStatus, recentDevices, recentCables,
    ] = await Promise.all([
      this.prisma.room.count({ where }),
      this.prisma.rack.count({ where }),
      this.prisma.device.count({ where }),
      this.prisma.cable.count({ where }),
      this.prisma.device.groupBy({ by: ['status'], where, _count: true }),
      this.prisma.cable.groupBy({ by: ['status'], where, _count: true }),
      this.prisma.device.findMany({
        where, take: 5, orderBy: { updatedAt: 'desc' },
        include: { template: true, rack: { include: { room: true } } },
      }),
      this.prisma.cable.findMany({
        where, take: 5, orderBy: { updatedAt: 'desc' },
        include: { srcDevice: { include: { rack: true } }, dstDevice: { include: { rack: true } } },
      }),
    ]);

    const deviceStatusCounts: Record<DeviceStatus, number> = { ONLINE: 0, MOVING: 0, OFFLINE: 0, ARRIVED: 0 };
    devicesByStatus.forEach((item) => { deviceStatusCounts[item.status as DeviceStatus] = item._count; });

    const cableStatusCounts: Record<CableStatus, number> = { RECORDED: 0, LABELED: 0, DISCONNECTED: 0, VERIFIED: 0 };
    cablesByStatus.forEach((item) => { cableStatusCounts[item.status as CableStatus] = item._count; });

    const migrationProgress = Math.round(((deviceStatusCounts.ARRIVED || 0) / (totalDevices || 1)) * 100);
    const cableRecoveryRate = Math.round(((cableStatusCounts.VERIFIED || 0) / (totalCables || 1)) * 100);

    return {
      overview: { totalRooms, totalRacks, totalDevices, totalCables, migrationProgress, cableRecoveryRate },
      devicesByStatus: deviceStatusCounts,
      cablesByStatus: cableStatusCounts,
      recentDevices: recentDevices.map((d) => ({
        id: d.id, name: d.name, status: d.status,
        template: `${d.template.brand} ${d.template.model}`,
        location: d.rack ? `${d.rack.room?.name} / ${d.rack.name}` : '未分配',
        updatedAt: d.updatedAt,
      })),
      recentCables: recentCables.map((c) => ({
        id: c.id, traceCode: c.traceCode, status: c.status,
        src: `${c.srcDevice.name} (${c.srcPortIndex})`,
        dst: `${c.dstDevice.name} (${c.dstPortIndex})`,
        updatedAt: c.updatedAt,
      })),
    };
  }

  async getMigrationProgress(projectId: string) {
    const rooms = await this.prisma.room.findMany({
      where: { projectId },
      include: { racks: { include: { devices: true } } },
    });
    return rooms.map((room) => {
      const devices = room.racks.flatMap((r) => r.devices);
      const total = devices.length;
      const arrived = devices.filter((d) => d.status === 'ARRIVED').length;
      const moving = devices.filter((d) => d.status === 'MOVING').length;
      return {
        roomId: room.id, roomName: room.name, roomType: room.type,
        totalDevices: total, arrivedDevices: arrived, movingDevices: moving,
        progress: total > 0 ? Math.round((arrived / total) * 100) : 0,
      };
    });
  }
}
