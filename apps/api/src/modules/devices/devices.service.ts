import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { QueryDeviceDto } from './dto/query-device.dto';
import { MoveDeviceDto } from './dto/move-device.dto';
import { ActivityLogService } from '../logs/activity-log.service';

type DeviceStatus = 'ONLINE' | 'MOVING' | 'OFFLINE' | 'ARRIVED';

@Injectable()
export class DevicesService {
  constructor(
    private prisma: PrismaService,
    private activityLog: ActivityLogService,
  ) {}

  async create(projectId: string, user: any, createDeviceDto: CreateDeviceDto) {
    const template = await this.prisma.deviceTemplate.findFirst({
      where: { id: createDeviceDto.templateId, projectId },
    });
    if (!template) throw new BadRequestException('设备模板不存在');

    if (createDeviceDto.rackId && createDeviceDto.positionU) {
      const rack = await this.prisma.rack.findFirst({ where: { id: createDeviceDto.rackId, projectId } });
      if (!rack) throw new BadRequestException('机柜不存在');
      await this.validateUPosition(createDeviceDto.rackId, createDeviceDto.positionU, template.sizeU);
    }

    const device = await this.prisma.device.create({
      data: { ...createDeviceDto, projectId },
      include: { template: true, rack: { include: { room: true } } },
    });
    await this.activityLog.record({
      projectId, userId: user.sub, username: user.username,
      action: 'CREATE', entityType: 'Device', entityId: device.id, entityName: device.name,
      after: device,
    });
    return device;
  }

  async findAll(projectId: string, query: QueryDeviceDto) {
    const { page = 1, pageSize = 20, search, status, rackId, templateId } = query;
    const skip = (page - 1) * pageSize;
    const where: any = { projectId };
    if (search) where.OR = [{ name: { contains: search } }, { assetTag: { contains: search } }];
    if (status) where.status = status;
    if (rackId) where.rackId = rackId;
    if (templateId) where.templateId = templateId;

    const [data, total] = await Promise.all([
      this.prisma.device.findMany({
        where, skip, take: pageSize,
        include: {
          template: true,
          rack: { include: { room: true } },
          _count: { select: { cablesFrom: true, cablesTo: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.device.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string, projectId: string) {
    const device = await this.prisma.device.findFirst({
      where: { id, projectId },
      include: {
        template: true,
        rack: { include: { room: true } },
        cablesFrom: {
          include: { dstDevice: { include: { template: true, rack: { include: { room: true } } } } },
        },
        cablesTo: {
          include: { srcDevice: { include: { template: true, rack: { include: { room: true } } } } },
        },
      },
    });
    if (!device) throw new NotFoundException('设备不存在');
    return device;
  }

  async update(id: string, projectId: string, user: any, updateDeviceDto: UpdateDeviceDto) {
    const device = await this.findOne(id, projectId);

    if (updateDeviceDto.rackId || updateDeviceDto.positionU !== undefined) {
      const rackId = updateDeviceDto.rackId || device.rackId;
      const positionU = updateDeviceDto.positionU ?? device.positionU;
      if (rackId && positionU) {
        let sizeU = device.template.sizeU;
        if (updateDeviceDto.templateId && updateDeviceDto.templateId !== device.templateId) {
          const newTemplate = await this.prisma.deviceTemplate.findUnique({ where: { id: updateDeviceDto.templateId } });
          if (!newTemplate) throw new BadRequestException('设备模板不存在');
          sizeU = newTemplate.sizeU;
        }
        await this.validateUPosition(rackId, positionU, sizeU, id);
      }
    }

    const updated = await this.prisma.device.update({
      where: { id }, data: updateDeviceDto,
      include: { template: true, rack: { include: { room: true } } },
    });
    await this.activityLog.record({
      projectId, userId: user.sub, username: user.username,
      action: 'UPDATE', entityType: 'Device', entityId: id, entityName: updated.name,
      before: device, after: updated,
    });
    return updated;
  }

  async remove(id: string, projectId: string, user: any) {
    const device = await this.findOne(id, projectId);
    const cableCount = device.cablesFrom.length + device.cablesTo.length;
    if (cableCount > 0) throw new BadRequestException(`设备还有 ${cableCount} 条连线，无法删除。请先删除相关连线。`);
    await this.prisma.device.delete({ where: { id } });
    await this.activityLog.record({
      projectId, userId: user.sub, username: user.username,
      action: 'DELETE', entityType: 'Device', entityId: id, entityName: device.name,
      before: device,
    });
  }

  async move(id: string, projectId: string, user: any, moveDeviceDto: MoveDeviceDto) {
    const device = await this.findOne(id, projectId);
    const { targetRackId, targetPositionU } = moveDeviceDto;
    const targetRack = await this.prisma.rack.findFirst({ where: { id: targetRackId, projectId } });
    if (!targetRack) throw new BadRequestException('目标机柜不存在');
    await this.validateUPosition(targetRackId, targetPositionU, device.template.sizeU, id);
    const updated = await this.prisma.device.update({
      where: { id },
      data: { rackId: targetRackId, positionU: targetPositionU, status: 'MOVING' },
      include: { template: true, rack: { include: { room: true } } },
    });
    await this.activityLog.record({
      projectId, userId: user.sub, username: user.username,
      action: 'UPDATE', entityType: 'Device', entityId: id, entityName: device.name,
      before: { rackId: device.rackId, positionU: device.positionU },
      after: { rackId: targetRackId, positionU: targetPositionU },
    });
    return updated;
  }

  async updateStatus(id: string, projectId: string, status: DeviceStatus) {
    await this.findOne(id, projectId);
    return this.prisma.device.update({
      where: { id }, data: { status },
      include: { template: true, rack: { include: { room: true } } },
    });
  }

  private async validateUPosition(rackId: string, positionU: number, sizeU: number, excludeDeviceId?: string) {
    const rack = await this.prisma.rack.findUnique({ where: { id: rackId } });
    if (!rack) throw new BadRequestException('机柜不存在');
    const endU = positionU + sizeU - 1;
    if (endU > rack.totalU) throw new BadRequestException(`U位超出机柜范围。设备需要 ${sizeU}U，从 ${positionU} 到 ${endU}，但机柜只有 ${rack.totalU}U`);

    const where: any = { rackId, positionU: { not: null } };
    if (excludeDeviceId) where.id = { not: excludeDeviceId };
    const devicesInRack = await this.prisma.device.findMany({ where, include: { template: true } });

    for (const existing of devicesInRack) {
      const existingStart = existing.positionU!;
      const existingEnd = existingStart + existing.template.sizeU - 1;
      if ((positionU >= existingStart && positionU <= existingEnd) ||
          (endU >= existingStart && endU <= existingEnd) ||
          (positionU <= existingStart && endU >= existingEnd)) {
        throw new BadRequestException(`U位冲突：设备 "${existing.name}" 占用 ${existingStart}-${existingEnd}U，与目标位置 ${positionU}-${endU}U 冲突`);
      }
    }
  }
}
