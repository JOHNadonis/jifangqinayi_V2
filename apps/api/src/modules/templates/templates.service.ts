import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTemplateDto, PortLayoutData, PortDefinition } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { QueryTemplateDto } from './dto/query-template.dto';
import { GeneratePortsDto, PortGeneratePosition } from './dto/generate-ports.dto';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async create(createTemplateDto: CreateTemplateDto) {
    // 检查是否已存在相同品牌和型号的模板
    const existing = await this.prisma.deviceTemplate.findUnique({
      where: {
        brand_model: {
          brand: createTemplateDto.brand,
          model: createTemplateDto.model,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`模板 ${createTemplateDto.brand} ${createTemplateDto.model} 已存在`);
    }

    return this.prisma.deviceTemplate.create({
      data: {
        brand: createTemplateDto.brand,
        model: createTemplateDto.model,
        sizeU: createTemplateDto.sizeU,
        deviceType: createTemplateDto.deviceType,
        frontImage: createTemplateDto.frontImage,
        rearImage: createTemplateDto.rearImage,
        portLayout: JSON.stringify(createTemplateDto.portLayout || {}),
        isPublic: createTemplateDto.isPublic ?? false,
      },
    });
  }

  async findAll(query: QueryTemplateDto) {
    const { page = 1, pageSize = 20, search, brand, model, deviceType } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    // 搜索关键词（品牌或型号）- SQLite 使用 LIKE 代替 mode: 'insensitive'
    if (search) {
      where.OR = [
        { brand: { contains: search } },
        { model: { contains: search } },
      ];
    }

    // 品牌筛选
    if (brand) {
      where.brand = { contains: brand };
    }

    // 型号筛选
    if (model) {
      where.model = { contains: model };
    }

    // 设备类型筛选
    if (deviceType) {
      where.deviceType = deviceType;
    }

    const [data, total] = await Promise.all([
      this.prisma.deviceTemplate.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          _count: {
            select: { devices: true },
          },
        },
        orderBy: [
          { brand: 'asc' },
          { model: 'asc' },
        ],
      }),
      this.prisma.deviceTemplate.count({ where }),
    ]);

    // Parse portLayout JSON string to object
    const parsedData = data.map((template) => ({
      ...template,
      portLayout: template.portLayout ? JSON.parse(template.portLayout as string) : { front: [], rear: [] },
    }));

    return {
      data: parsedData,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string) {
    const template = await this.prisma.deviceTemplate.findUnique({
      where: { id },
      include: {
        _count: {
          select: { devices: true },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('设备模板不存在');
    }

    // Parse portLayout JSON string to object
    return {
      ...template,
      portLayout: template.portLayout ? JSON.parse(template.portLayout as string) : { front: [], rear: [] },
    };
  }

  async update(id: string, updateTemplateDto: UpdateTemplateDto) {
    await this.findOne(id);

    // 如果要更新品牌或型号，检查是否会造成冲突
    if (updateTemplateDto.brand || updateTemplateDto.model) {
      const current = await this.prisma.deviceTemplate.findUnique({
        where: { id },
      });

      if (!current) {
        throw new NotFoundException('设备模板不存在');
      }

      const newBrand = updateTemplateDto.brand || current.brand;
      const newModel = updateTemplateDto.model || current.model;

      // 只有当品牌或型号确实发生变化时才检查冲突
      if (newBrand !== current.brand || newModel !== current.model) {
        const existing = await this.prisma.deviceTemplate.findUnique({
          where: {
            brand_model: {
              brand: newBrand,
              model: newModel,
            },
          },
        });

        if (existing && existing.id !== id) {
          throw new ConflictException(`模板 ${newBrand} ${newModel} 已存在`);
        }
      }
    }

    return this.prisma.deviceTemplate.update({
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
  }

  async remove(id: string) {
    const template = await this.findOne(id);

    // 检查是否有设备在使用此模板
    const deviceCount = await this.prisma.device.count({
      where: { templateId: id },
    });

    if (deviceCount > 0) {
      throw new ConflictException(`该模板正在被 ${deviceCount} 个设备使用，无法删除`);
    }

    return this.prisma.deviceTemplate.delete({
      where: { id },
    });
  }

  /**
   * 快速生成端口布局
   * 根据输入的端口数和配置自动生成矩阵式端口布局
   */
  async generatePorts(id: string, generatePortsDto: GeneratePortsDto) {
    const template = await this.findOne(id);

    const {
      count,
      portType,
      position = PortGeneratePosition.FRONT,
      prefix = 'port',
      startIndex = 0,
      portsPerRow = 8,
      spacing = 40,
      startX = 20,
      startY = 20,
      rowSpacing = 50,
    } = generatePortsDto;

    // 生成端口定义数组
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

    // 获取当前的端口布局
    const currentLayoutStr = template.portLayout as string;
    const currentLayout: PortLayoutData = currentLayoutStr ? JSON.parse(currentLayoutStr) : { front: [], rear: [] };

    // 根据位置参数更新布局
    let newLayout: PortLayoutData = { ...currentLayout };

    if (position === PortGeneratePosition.FRONT) {
      newLayout.front = ports;
    } else if (position === PortGeneratePosition.REAR) {
      newLayout.rear = ports;
    } else if (position === PortGeneratePosition.BOTH) {
      newLayout.front = ports;
      newLayout.rear = ports;
    }

    // 更新模板
    return this.prisma.deviceTemplate.update({
      where: { id },
      data: {
        portLayout: JSON.stringify(newLayout),
      },
    });
  }
}
