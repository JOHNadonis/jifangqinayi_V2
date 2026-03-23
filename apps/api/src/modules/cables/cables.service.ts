import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCableDto } from './dto/create-cable.dto';
import { UpdateCableDto } from './dto/update-cable.dto';
import { QueryCableDto, CableStatus } from './dto/query-cable.dto';
import { ActivityLogService } from '../logs/activity-log.service';

@Injectable()
export class CablesService {
  constructor(
    private prisma: PrismaService,
    private activityLog: ActivityLogService,
  ) {}

  private async generateTraceCode(deviceId: string): Promise<string> {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId }, include: { rack: true } });
    const year = new Date().getFullYear();
    const rackName = device?.rack?.name || 'XXX';
    const latestCable = await this.prisma.cable.findFirst({
      where: { traceCode: { startsWith: `CBL-${year}-${rackName}-` } },
      orderBy: { traceCode: 'desc' },
    });
    let sequence = 1;
    if (latestCable) {
      const match = latestCable.traceCode.match(/-(\d+)$/);
      if (match) sequence = parseInt(match[1], 10) + 1;
    }
    return `CBL-${year}-${rackName}-${sequence.toString().padStart(3, '0')}`;
  }

  private async validatePort(deviceId: string, portIndex: string, excludeCableId?: string): Promise<void> {
    const where: any = {
      OR: [
        { srcDeviceId: deviceId, srcPortIndex: portIndex },
        { dstDeviceId: deviceId, dstPortIndex: portIndex },
      ],
      status: { not: CableStatus.DISCONNECTED },
    };
    if (excludeCableId) where.id = { not: excludeCableId };
    const existingCable = await this.prisma.cable.findFirst({ where });
    if (existingCable) throw new BadRequestException(`端口 ${portIndex} 已被连线 ${existingCable.traceCode} 占用`);
  }

  private checkCableTypeMatch(srcDevice: any, dstDevice: any, cableType: string, srcPortIndex: string, dstPortIndex: string): string[] {
    const warnings: string[] = [];
    const srcPortLayout = srcDevice.template?.portLayout || {};
    const dstPortLayout = dstDevice.template?.portLayout || {};
    const srcPortType = this.getPortType(srcPortLayout, srcPortIndex);
    const dstPortType = this.getPortType(dstPortLayout, dstPortIndex);
    if (cableType === 'FIBER' && (srcPortType === 'RJ45' || dstPortType === 'RJ45'))
      warnings.push('警告：使用光纤连线连接网口，请确认是否正确');
    if ((cableType === 'CAT6' || cableType === 'CAT5E') && (srcPortType === 'SFP' || srcPortType === 'SFP+' || dstPortType === 'SFP' || dstPortType === 'SFP+'))
      warnings.push('警告：使用网线连接光纤端口，请确认是否正确');
    return warnings;
  }

  private getPortType(portLayout: any, portIndex: string): string | null {
    if (!portLayout || typeof portLayout !== 'object') return null;
    for (const section of Object.values(portLayout)) {
      if (Array.isArray(section)) {
        const port = section.find((p: any) => p.index === portIndex);
        if (port) return port.type;
      }
    }
    return null;
  }

  async create(projectId: string, user: any, createCableDto: CreateCableDto) {
    const { srcDeviceId, srcPortIndex, dstDeviceId, dstPortIndex, cableType, ...rest } = createCableDto;
    const [srcDevice, dstDevice] = await Promise.all([
      this.prisma.device.findFirst({ where: { id: srcDeviceId, projectId }, include: { rack: true, template: true } }),
      this.prisma.device.findFirst({ where: { id: dstDeviceId, projectId }, include: { rack: true, template: true } }),
    ]);
    if (!srcDevice) throw new NotFoundException('源设备不存在');
    if (!dstDevice) throw new NotFoundException('目标设备不存在');
    await this.validatePort(srcDeviceId, srcPortIndex);
    await this.validatePort(dstDeviceId, dstPortIndex);
    const warnings = this.checkCableTypeMatch(srcDevice, dstDevice, cableType, srcPortIndex, dstPortIndex);
    const traceCode = await this.generateTraceCode(srcDeviceId);
    const cable = await this.prisma.cable.create({
      data: { traceCode, srcDeviceId, srcPortIndex, dstDeviceId, dstPortIndex, cableType, projectId, ...rest },
      include: {
        srcDevice: { include: { rack: true, template: true } },
        dstDevice: { include: { rack: true, template: true } },
      },
    });
    await this.activityLog.record({
      projectId, userId: user.sub, username: user.username,
      action: 'CREATE', entityType: 'Cable', entityId: cable.id, entityName: cable.traceCode,
      after: cable,
    });
    return { ...cable, warnings: warnings.length > 0 ? warnings : undefined };
  }

  async findAll(projectId: string, query: QueryCableDto) {
    const { page = 1, pageSize = 20, search, status, cableType, deviceId } = query;
    const skip = (page - 1) * pageSize;
    const where: any = { projectId };
    if (search) where.traceCode = { contains: search };
    if (status) where.status = status;
    if (cableType) where.cableType = cableType;
    if (deviceId) where.OR = [{ srcDeviceId: deviceId }, { dstDeviceId: deviceId }];

    const [data, total] = await Promise.all([
      this.prisma.cable.findMany({
        where, skip, take: pageSize,
        include: {
          srcDevice: { include: { rack: { include: { room: true } } } },
          dstDevice: { include: { rack: { include: { room: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.cable.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string, projectId: string) {
    const cable = await this.prisma.cable.findFirst({
      where: { id, projectId },
      include: {
        srcDevice: { include: { rack: { include: { room: true } }, template: true } },
        dstDevice: { include: { rack: { include: { room: true } }, template: true } },
      },
    });
    if (!cable) throw new NotFoundException('连线不存在');
    return cable;
  }

  async findByTraceCode(traceCode: string, projectId: string) {
    const cable = await this.prisma.cable.findFirst({
      where: { traceCode, projectId },
      include: {
        srcDevice: { include: { rack: { include: { room: true } }, template: true } },
        dstDevice: { include: { rack: { include: { room: true } }, template: true } },
      },
    });
    if (!cable) throw new NotFoundException('连线不存在或追踪码错误');
    return cable;
  }

  async update(id: string, projectId: string, user: any, updateCableDto: UpdateCableDto) {
    const before = await this.findOne(id, projectId);
    const cable = await this.prisma.cable.update({
      where: { id }, data: updateCableDto,
      include: {
        srcDevice: { include: { rack: true, template: true } },
        dstDevice: { include: { rack: true, template: true } },
      },
    });
    await this.activityLog.record({
      projectId, userId: user.sub, username: user.username,
      action: 'UPDATE', entityType: 'Cable', entityId: id, entityName: cable.traceCode,
      before, after: cable,
    });
    return cable;
  }

  async remove(id: string, projectId: string, user: any) {
    const cable = await this.findOne(id, projectId);
    await this.prisma.cable.delete({ where: { id } });
    await this.activityLog.record({
      projectId, userId: user.sub, username: user.username,
      action: 'DELETE', entityType: 'Cable', entityId: id, entityName: cable.traceCode,
      before: cable,
    });
  }

  async verify(id: string, projectId: string) {
    const cable = await this.findOne(id, projectId);
    if (cable.status === CableStatus.VERIFIED) throw new BadRequestException('连线已确认，无需重复操作');
    return this.prisma.cable.update({
      where: { id }, data: { status: CableStatus.VERIFIED },
      include: { srcDevice: { include: { rack: true } }, dstDevice: { include: { rack: true } } },
    });
  }

  async disconnect(id: string, projectId: string) {
    const cable = await this.findOne(id, projectId);
    if (cable.status === CableStatus.DISCONNECTED) throw new BadRequestException('连线已断开，无需重复操作');
    return this.prisma.cable.update({
      where: { id }, data: { status: CableStatus.DISCONNECTED },
      include: { srcDevice: { include: { rack: true } }, dstDevice: { include: { rack: true } } },
    });
  }

  async exportLabels(projectId: string, query: QueryCableDto): Promise<string> {
    const { status, cableType, deviceId } = query;
    const where: any = { projectId };
    if (status) where.status = status;
    if (cableType) where.cableType = cableType;
    if (deviceId) where.OR = [{ srcDeviceId: deviceId }, { dstDeviceId: deviceId }];

    const cables = await this.prisma.cable.findMany({
      where,
      include: {
        srcDevice: { include: { rack: { include: { room: true } } } },
        dstDevice: { include: { rack: { include: { room: true } } } },
      },
      orderBy: { traceCode: 'asc' },
    });

    const headers = ['追踪码','源机房','源机柜','源设备','源端口','目标机房','目标机柜','目标设备','目标端口','连线类型','颜色','长度(米)','用途','状态'];
    const rows = cables.map(cable => [
      cable.traceCode,
      cable.srcDevice.rack?.room?.name || '',
      cable.srcDevice.rack?.name || '',
      cable.srcDevice.name,
      cable.srcPortIndex,
      cable.dstDevice.rack?.room?.name || '',
      cable.dstDevice.rack?.name || '',
      cable.dstDevice.name,
      cable.dstPortIndex,
      cable.cableType,
      cable.color || '',
      cable.length?.toString() || '',
      cable.purpose || '',
      cable.status,
    ]);
    return [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
  }
}
