import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRackDto } from './dto/create-rack.dto';
import { UpdateRackDto } from './dto/update-rack.dto';
import { QueryRackDto } from './dto/query-rack.dto';
import { ActivityLogService } from '../logs/activity-log.service';

@Injectable()
export class RacksService {
  constructor(
    private prisma: PrismaService,
    private activityLog: ActivityLogService,
  ) {}

  async create(projectId: string, user: any, createRackDto: CreateRackDto) {
    const room = await this.prisma.room.findFirst({
      where: { id: createRackDto.roomId, projectId },
    });
    if (!room) throw new BadRequestException('机房不存在');

    const rack = await this.prisma.rack.create({
      data: { ...createRackDto, projectId },
      include: { room: true },
    });
    await this.activityLog.record({
      projectId, userId: user.sub, username: user.username,
      action: 'CREATE', entityType: 'Rack', entityId: rack.id, entityName: rack.name,
      after: rack,
    });
    return rack;
  }

  async findAll(projectId: string, query: QueryRackDto) {
    const { page = 1, pageSize = 20, search, roomId } = query;
    const skip = (page - 1) * pageSize;
    const where: any = { projectId };
    if (search) where.name = { contains: search };
    if (roomId) where.roomId = roomId;

    const [data, total] = await Promise.all([
      this.prisma.rack.findMany({
        where, skip, take: pageSize,
        include: {
          room: true,
          devices: { include: { template: true } },
          _count: { select: { devices: true } },
        },
        orderBy: [{ room: { name: 'asc' } }, { name: 'asc' }],
      }),
      this.prisma.rack.count({ where }),
    ]);

    const formattedData = data.map((rack) => {
      let usedU = 0;
      for (const device of rack.devices) {
        if (device.positionU && device.template) usedU += device.template.sizeU;
      }
      return { ...rack, roomName: rack.room?.name, usedU, deviceCount: rack._count.devices, devices: undefined };
    });

    return { data: formattedData, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string, projectId: string) {
    const rack = await this.prisma.rack.findFirst({
      where: { id, projectId },
      include: {
        room: true,
        devices: {
          include: {
            template: true,
            cablesFrom: { include: { dstDevice: { include: { rack: true } } } },
            cablesTo: { include: { srcDevice: { include: { rack: true } } } },
          },
          orderBy: { positionU: 'desc' },
        },
      },
    });
    if (!rack) throw new NotFoundException('机柜不存在');
    return rack;
  }

  async update(id: string, projectId: string, user: any, updateRackDto: UpdateRackDto) {
    const before = await this.findOne(id, projectId);
    const rack = await this.prisma.rack.update({
      where: { id }, data: updateRackDto, include: { room: true },
    });
    await this.activityLog.record({
      projectId, userId: user.sub, username: user.username,
      action: 'UPDATE', entityType: 'Rack', entityId: id, entityName: rack.name,
      before, after: rack,
    });
    return rack;
  }

  async remove(id: string, projectId: string, user: any) {
    const rack = await this.findOne(id, projectId);
    if (rack.devices.length > 0) throw new BadRequestException('机柜内还有设备，无法删除');
    await this.prisma.rack.delete({ where: { id } });
    await this.activityLog.record({
      projectId, userId: user.sub, username: user.username,
      action: 'DELETE', entityType: 'Rack', entityId: id, entityName: rack.name,
      before: rack,
    });
  }

  async getUsage(id: string, projectId: string) {
    const rack = await this.findOne(id, projectId);
    const usedSlots: { start: number; end: number; deviceId: string; deviceName: string }[] = [];
    for (const device of rack.devices) {
      if (device.positionU) {
        usedSlots.push({
          start: device.positionU,
          end: device.positionU + device.template.sizeU - 1,
          deviceId: device.id,
          deviceName: device.name,
        });
      }
    }
    return {
      totalU: rack.totalU,
      usedU: usedSlots.reduce((sum, slot) => sum + (slot.end - slot.start + 1), 0),
      usedSlots,
    };
  }
}
