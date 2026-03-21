import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { QueryDeviceDto } from './dto/query-device.dto';
import { MoveDeviceDto } from './dto/move-device.dto';

type DeviceStatus = 'ONLINE' | 'MOVING' | 'OFFLINE' | 'ARRIVED';

@Injectable()
export class DevicesService {
  constructor(private prisma: PrismaService) {}

  async create(createDeviceDto: CreateDeviceDto) {
    // 验证设备模板是否存在
    const template = await this.prisma.deviceTemplate.findUnique({
      where: { id: createDeviceDto.templateId },
    });
    if (!template) {
      throw new BadRequestException('设备模板不存在');
    }

    // 如果指定了机柜和U位，验证机柜是否存在及U位冲突
    if (createDeviceDto.rackId && createDeviceDto.positionU) {
      const rack = await this.prisma.rack.findUnique({
        where: { id: createDeviceDto.rackId },
      });
      if (!rack) {
        throw new BadRequestException('机柜不存在');
      }

      // 验证U位冲突
      await this.validateUPosition(
        createDeviceDto.rackId,
        createDeviceDto.positionU,
        template.sizeU,
      );
    }

    return this.prisma.device.create({
      data: createDeviceDto,
      include: {
        template: true,
        rack: {
          include: {
            room: true,
          },
        },
      },
    });
  }

  async findAll(query: QueryDeviceDto) {
    const { page = 1, pageSize = 20, search, status, rackId, templateId } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    // 搜索条件：设备名称或资产编号 - SQLite 使用 LIKE 代替 mode: 'insensitive'
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { assetTag: { contains: search } },
      ];
    }

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 机柜筛选
    if (rackId) {
      where.rackId = rackId;
    }

    // 模板筛选
    if (templateId) {
      where.templateId = templateId;
    }

    const [data, total] = await Promise.all([
      this.prisma.device.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          template: true,
          rack: {
            include: {
              room: true,
            },
          },
          _count: {
            select: {
              cablesFrom: true,
              cablesTo: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.device.count({ where }),
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
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: {
        template: true,
        rack: {
          include: {
            room: true,
          },
        },
        cablesFrom: {
          include: {
            dstDevice: {
              include: {
                template: true,
                rack: {
                  include: {
                    room: true,
                  },
                },
              },
            },
          },
        },
        cablesTo: {
          include: {
            srcDevice: {
              include: {
                template: true,
                rack: {
                  include: {
                    room: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!device) {
      throw new NotFoundException('设备不存在');
    }

    return device;
  }

  async update(id: string, updateDeviceDto: UpdateDeviceDto) {
    const device = await this.findOne(id);

    // 如果更新了机柜或U位，需要验证
    if (updateDeviceDto.rackId || updateDeviceDto.positionU !== undefined) {
      const rackId = updateDeviceDto.rackId || device.rackId;
      const positionU = updateDeviceDto.positionU ?? device.positionU;

      if (rackId && positionU) {
        // 如果更新了模板ID，需要获取新模板的sizeU
        let sizeU = device.template.sizeU;
        if (updateDeviceDto.templateId && updateDeviceDto.templateId !== device.templateId) {
          const newTemplate = await this.prisma.deviceTemplate.findUnique({
            where: { id: updateDeviceDto.templateId },
          });
          if (!newTemplate) {
            throw new BadRequestException('设备模板不存在');
          }
          sizeU = newTemplate.sizeU;
        }

        // 验证U位冲突（排除当前设备）
        await this.validateUPosition(rackId, positionU, sizeU, id);
      }
    }

    return this.prisma.device.update({
      where: { id },
      data: updateDeviceDto,
      include: {
        template: true,
        rack: {
          include: {
            room: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const device = await this.findOne(id);

    // 检查是否有连线
    const cableCount = device.cablesFrom.length + device.cablesTo.length;
    if (cableCount > 0) {
      throw new BadRequestException(
        `设备还有 ${cableCount} 条连线，无法删除。请先删除相关连线。`
      );
    }

    return this.prisma.device.delete({
      where: { id },
    });
  }

  async move(id: string, moveDeviceDto: MoveDeviceDto) {
    const device = await this.findOne(id);
    const { targetRackId, targetPositionU } = moveDeviceDto;

    // 验证目标机柜是否存在
    const targetRack = await this.prisma.rack.findUnique({
      where: { id: targetRackId },
    });
    if (!targetRack) {
      throw new BadRequestException('目标机柜不存在');
    }

    // 验证目标U位是否冲突（排除当前设备）
    await this.validateUPosition(
      targetRackId,
      targetPositionU,
      device.template.sizeU,
      id,
    );

    // 更新设备位置并将状态设置为 MOVING
    return this.prisma.device.update({
      where: { id },
      data: {
        rackId: targetRackId,
        positionU: targetPositionU,
        status: 'MOVING',
      },
      include: {
        template: true,
        rack: {
          include: {
            room: true,
          },
        },
      },
    });
  }

  async updateStatus(id: string, status: DeviceStatus) {
    await this.findOne(id);

    return this.prisma.device.update({
      where: { id },
      data: { status },
      include: {
        template: true,
        rack: {
          include: {
            room: true,
          },
        },
      },
    });
  }

  /**
   * 验证U位是否冲突
   * @param rackId 机柜ID
   * @param positionU U位起始位置
   * @param sizeU 设备占用的U位数
   * @param excludeDeviceId 排除的设备ID（用于更新时）
   */
  private async validateUPosition(
    rackId: string,
    positionU: number,
    sizeU: number,
    excludeDeviceId?: string,
  ) {
    // 检查U位范围是否超出机柜总U位数
    const rack = await this.prisma.rack.findUnique({
      where: { id: rackId },
    });
    if (!rack) {
      throw new BadRequestException('机柜不存在');
    }

    const endU = positionU + sizeU - 1;
    if (endU > rack.totalU) {
      throw new BadRequestException(
        `U位超出机柜范围。设备需要 ${sizeU}U，从 ${positionU} 到 ${endU}，但机柜只有 ${rack.totalU}U`
      );
    }

    // 查询该机柜内的所有设备（排除当前设备）
    const where: any = {
      rackId,
      positionU: { not: null },
    };
    if (excludeDeviceId) {
      where.id = { not: excludeDeviceId };
    }

    const devicesInRack = await this.prisma.device.findMany({
      where,
      include: {
        template: true,
      },
    });

    // 检查U位冲突
    for (const existingDevice of devicesInRack) {
      const existingStart = existingDevice.positionU!;
      const existingEnd = existingStart + existingDevice.template.sizeU - 1;
      const newStart = positionU;
      const newEnd = positionU + sizeU - 1;

      // 检查是否有重叠
      if (
        (newStart >= existingStart && newStart <= existingEnd) ||
        (newEnd >= existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      ) {
        throw new BadRequestException(
          `U位冲突：设备 "${existingDevice.name}" 占用 ${existingStart}-${existingEnd}U，与目标位置 ${newStart}-${newEnd}U 冲突`
        );
      }
    }
  }
}
