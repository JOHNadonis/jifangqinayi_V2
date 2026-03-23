import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { QueryRoomDto } from './dto/query-room.dto';
import { ActivityLogService } from '../logs/activity-log.service';

@Injectable()
export class RoomsService {
  constructor(
    private prisma: PrismaService,
    private activityLog: ActivityLogService,
  ) {}

  async create(projectId: string, user: any, createRoomDto: CreateRoomDto) {
    const room = await this.prisma.room.create({
      data: { ...createRoomDto, projectId },
    });
    await this.activityLog.record({
      projectId, userId: user.sub, username: user.username,
      action: 'CREATE', entityType: 'Room', entityId: room.id, entityName: room.name,
      after: room,
    });
    return room;
  }

  async findAll(projectId: string, query: QueryRoomDto) {
    const { page = 1, pageSize = 20, search, type } = query;
    const skip = (page - 1) * pageSize;
    const where: any = { projectId };
    if (search) where.OR = [{ name: { contains: search } }, { location: { contains: search } }];
    if (type) where.type = type;

    const [data, total] = await Promise.all([
      this.prisma.room.findMany({
        where, skip, take: pageSize,
        include: { _count: { select: { racks: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.room.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string, projectId: string) {
    const room = await this.prisma.room.findFirst({
      where: { id, projectId },
      include: {
        racks: {
          include: { _count: { select: { devices: true } } },
          orderBy: [{ row: 'asc' }, { column: 'asc' }],
        },
      },
    });
    if (!room) throw new NotFoundException('机房不存在');
    return room;
  }

  async update(id: string, projectId: string, user: any, updateRoomDto: UpdateRoomDto) {
    const before = await this.findOne(id, projectId);
    const room = await this.prisma.room.update({ where: { id }, data: updateRoomDto });
    await this.activityLog.record({
      projectId, userId: user.sub, username: user.username,
      action: 'UPDATE', entityType: 'Room', entityId: id, entityName: room.name,
      before, after: room,
    });
    return room;
  }

  async remove(id: string, projectId: string, user: any) {
    const room = await this.findOne(id, projectId);
    await this.prisma.room.delete({ where: { id } });
    await this.activityLog.record({
      projectId, userId: user.sub, username: user.username,
      action: 'DELETE', entityType: 'Room', entityId: id, entityName: room.name,
      before: room,
    });
  }
}
