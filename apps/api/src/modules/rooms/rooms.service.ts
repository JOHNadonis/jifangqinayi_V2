import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { QueryRoomDto } from './dto/query-room.dto';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async create(createRoomDto: CreateRoomDto) {
    return this.prisma.room.create({
      data: createRoomDto,
    });
  }

  async findAll(query: QueryRoomDto) {
    const { page = 1, pageSize = 20, search, type } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    // SQLite 使用 LIKE 代替 mode: 'insensitive'
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { location: { contains: search } },
      ];
    }
    if (type) {
      where.type = type;
    }

    const [data, total] = await Promise.all([
      this.prisma.room.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          _count: {
            select: { racks: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.room.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        racks: {
          include: {
            _count: {
              select: { devices: true },
            },
          },
          orderBy: [{ row: 'asc' }, { column: 'asc' }],
        },
      },
    });

    if (!room) {
      throw new NotFoundException('机房不存在');
    }

    return room;
  }

  async update(id: string, updateRoomDto: UpdateRoomDto) {
    await this.findOne(id);
    return this.prisma.room.update({
      where: { id },
      data: updateRoomDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.room.delete({
      where: { id },
    });
  }
}
