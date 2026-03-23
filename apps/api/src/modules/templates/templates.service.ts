import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTemplateDto, PortLayoutData, PortDefinition } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { QueryTemplateDto } from './dto/query-template.dto';
import { GeneratePortsDto, PortGeneratePosition } from './dto/generate-ports.dto';
import { ActivityLogService } from '../logs/activity-log.service';

@Injectable()
export class TemplatesService {
  constructor(
    private prisma: PrismaService,
    private activityLog: ActivityLogService,
  ) {}

  async create(projectId: string, user: any, createTemplateDto: CreateTemplateDto) {
    const template = await this.prisma.deviceTemplate.create({
      data: {
        brand: createTemplateDto.brand,
        model: createTemplateDto.model,
        sizeU: createTemplateDto.sizeU,
        deviceType: createTemplateDto.deviceType,
        frontImage: createTemplateDto.frontImage,
        rearImage: createTemplateDto.rearImage,
        portLayout: JSON.stringify(createTemplateDto.portLayout || {}),
        isPublic: createTemplateDto.isPublic ?? false,
        projectId,
      },
    });
    await this.activityLog.record({
      projectId, userId: user.sub, username: user.username,
      action: 'CREATE', entityType: 'Template', entityId: template.id,
      entityName: `${template.brand} ${template.model}`, after: template,
    });
    return template;
  }

  async findAll(projectId: string, query: QueryTemplateDto) {
    const { page = 1, pageSize = 20, search, brand, model, deviceType } = query;
    const skip = (page - 1) * pageSize;
    const where: any = { projectId };
    if (search) where.OR = [{ brand: { contains: search } }, { model: { contains: search } }];
    if (brand) where.brand = { contains: brand };
    if (model) where.model = { contains: model };
    if (deviceType) where.deviceType = deviceType;

    const [data, total] = await Promise.all([
      this.prisma.deviceTemplate.findMany({
        where, skip, take: pageSize,
        include: { _count: { select: { devices: true } } },
        orderBy: [{ brand: 'asc' }, { model: 'asc' }],
      }),
      this.prisma.deviceTemplate.count({ where }),
    ]);

    const parsedData = data.map((t) => ({
      ...t,
      portLayout: t.portLayout ? JSON.parse(t.portLayout as string) : { front: [], rear: [] },
    }));
    return { data: parsedData, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string, projectId: string) {
    const template = await this.prisma.deviceTemplate.findFirst({
      where: { id, projectId },
      include: { _count: { select: { devices: true } } },
    });
    if (!template) throw new NotFoundException('设备模板不存在');
    return {
      ...template,
      portLayout: template.portLayout ? JSON.parse(template.portLayout as string) : { front: [], rear: [] },
    };
  }

  async update(id: string, projectId: string, user: any, updateTemplateDto: UpdateTemplateDto) {
    const before = await this.findOne(id, projectId);
    const updated = await this.prisma.deviceTemplate.update({
      where: { id },
      data: {
        brand: updateTemplateDto.brand,
        model: updateTemplateDto.model,
        sizeU: updateTemplateDto.sizeU,
        deviceType: updateTemplateDto.deviceType,
        frontImage: updateTemplateDto.frontImage,
        rearImage: updateTemplateDto.rearImage,
        portLayout: updateTemplateDto.portLayout ? JSON.stringify(updateTemplateDto.portLayout) : undefined,
        isPublic: updateTemplateDto.isPublic,
      },
    });
    await this.activityLog.record({
      projectId, userId: user.sub, username: user.username,
      action: 'UPDATE', entityType: 'Template', entityId: id,
      entityName: `${updated.brand} ${updated.model}`, before, after: updated,
    });
    return updated;
  }

  async remove(id: string, projectId: string, user: any) {
    const template = await this.findOne(id, projectId);
    const deviceCount = await this.prisma.device.count({ where: { templateId: id } });
    if (deviceCount > 0) throw new ConflictException(`该模板正在被 ${deviceCount} 个设备使用，无法删除`);
    await this.prisma.deviceTemplate.delete({ where: { id } });
    await this.activityLog.record({
      projectId, userId: user.sub, username: user.username,
      action: 'DELETE', entityType: 'Template', entityId: id,
      entityName: `${template.brand} ${template.model}`, before: template,
    });
  }

  async generatePorts(id: string, projectId: string, generatePortsDto: GeneratePortsDto) {
    const template = await this.findOne(id, projectId);
    const {
      count, portType, position = PortGeneratePosition.FRONT, prefix = 'port',
      startIndex = 0, portsPerRow = 8, spacing = 40, startX = 20, startY = 20, rowSpacing = 50,
    } = generatePortsDto;

    const ports: PortDefinition[] = [];
    for (let i = 0; i < count; i++) {
      const portIndex = startIndex + i;
      const row = Math.floor(i / portsPerRow);
      const col = i % portsPerRow;
      ports.push({
        index: `${prefix}${portIndex}`,
        type: portType,
        label: `${portType} ${portIndex}`,
        positionX: startX + col * spacing,
        positionY: startY + row * rowSpacing,
      });
    }

    const currentLayout: PortLayoutData = template.portLayout
      ? (typeof template.portLayout === 'string' ? JSON.parse(template.portLayout) : template.portLayout)
      : { front: [], rear: [] };

    const newLayout: PortLayoutData = { ...currentLayout };
    if (position === PortGeneratePosition.FRONT) newLayout.front = ports;
    else if (position === PortGeneratePosition.REAR) newLayout.rear = ports;
    else if (position === PortGeneratePosition.BOTH) { newLayout.front = ports; newLayout.rear = ports; }

    return this.prisma.deviceTemplate.update({ where: { id }, data: { portLayout: JSON.stringify(newLayout) } });
  }
}
