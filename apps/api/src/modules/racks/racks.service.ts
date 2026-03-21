import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRackDto } from './dto/create-rack.dto';
import { UpdateRackDto } from './dto/update-rack.dto';
import { QueryRackDto } from './dto/query-rack.dto';

@Injectable()
export class RacksService {
  constructor(private prisma: PrismaService) {}

  async create(createRackDto: CreateRackDto) {
    // 验证机房是否存在
    const room = await this.prisma.room.findUnique({
      where: { id: createRackDto.roomId },
    });
    if (!room) {
      throw new BadRequestException('机房不存在');
    }

    return this.prisma.rack.create({
      data: createRackDto,
      include: {
        room: true,
      },
    });
  }

  async findAll(query: QueryRackDto) {
    const { page = 1, pageSize = 20, search, roomId } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    // SQLite 使用 LIKE 代替 mode: 'insensitive'
    if (search) {
      where.name = { contains: search };
    }
    if (roomId) {
      where.roomId = roomId;
    }

    const [data, total] = await Promise.all([
      this.prisma.rack.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          room: true,
          devices: {
            include: {
              template: true,
            },
          },
          _count: {
            select: { devices: true },
          },
        },
        orderBy: [{ room: { name: 'asc' } }, { name: 'asc' }],
      }),
      this.prisma.rack.count({ where }),
    ]);

    // 转换数据格式以匹配前端期望
    const formattedData = data.map((rack) => {
      // 计算已使用的U位
      let usedU = 0;
      for (const device of rack.devices) {
        if (device.positionU && device.template) {
          usedU += device.template.sizeU;
        }
      }

      return {
        ...rack,
        roomName: rack.room?.name,
        usedU,
        deviceCount: rack._count.devices,
        devices: undefined, // 不在列表中返回完整设备数据
      };
    });

    return {
      data: formattedData,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string) {
    const rack = await this.prisma.rack.findUnique({
      where: { id },
      include: {
        room: true,
        devices: {
          include: {
            template: true,
            cablesFrom: {
              include: {
                dstDevice: {
                  include: { rack: true },
                },
              },
            },
            cablesTo: {
              include: {
                srcDevice: {
                  include: { rack: true },
                },
              },
            },
          },
          orderBy: { positionU: 'desc' },
        },
      },
    });

    if (!rack) {
      throw new NotFoundException('机柜不存在');
    }

    return rack;
  }

  async update(id: string, updateRackDto: UpdateRackDto) {
    await this.findOne(id);
    return this.prisma.rack.update({
      where: { id },
      data: updateRackDto,
      include: {
        room: true,
      },
    });
  }

  async remove(id: string) {
    const rack = await this.findOne(id);
    if (rack.devices.length > 0) {
      throw new BadRequestException('机柜内还有设备，无法删除');
    }
    return this.prisma.rack.delete({
      where: { id },
    });
  }

  // 获取机柜的U位使用情况
  async getUsage(id: string) {
    const rack = await this.findOne(id);
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
