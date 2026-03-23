import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { ImportResultDto } from './dto/import.dto';

@Injectable()
export class ImportService {
  constructor(private prisma: PrismaService) {}

  // 设备类型中文到英文的映射
  private readonly deviceTypeMap: Record<string, string> = {
    // 标准中文名称
    '服务器': 'SERVER',
    '交换机': 'SWITCH',
    '路由器': 'ROUTER',
    '防火墙': 'FIREWALL',
    '存储': 'STORAGE',
    '配电单元': 'PDU',
    'PDU': 'PDU',
    '其他': 'OTHER',
    // 英文名称（支持直接输入英文）
    'SERVER': 'SERVER',
    'SWITCH': 'SWITCH',
    'ROUTER': 'ROUTER',
    'FIREWALL': 'FIREWALL',
    'STORAGE': 'STORAGE',
    'OTHER': 'OTHER',
  };

  // 关键词映射，用于模糊匹配
  private readonly deviceTypeKeywords: Array<{ keywords: string[]; type: string }> = [
    { keywords: ['服务器', 'server'], type: 'SERVER' },
    { keywords: ['交换机', 'switch'], type: 'SWITCH' },
    { keywords: ['路由器', 'router'], type: 'ROUTER' },
    { keywords: ['防火墙', 'firewall'], type: 'FIREWALL' },
    { keywords: ['存储', 'storage', 'nas', 'san'], type: 'STORAGE' },
    { keywords: ['配电', 'pdu', '电源'], type: 'PDU' },
  ];

  // 将设备类型转换为标准枚举值
  private normalizeDeviceType(input: string): string {
    if (!input) return 'OTHER';

    const normalized = input.trim();

    // 先尝试精确匹配
    const exactMatch = this.deviceTypeMap[normalized] || this.deviceTypeMap[normalized.toUpperCase()];
    if (exactMatch) {
      return exactMatch;
    }

    // 尝试关键词匹配
    const lowerInput = normalized.toLowerCase();
    for (const { keywords, type } of this.deviceTypeKeywords) {
      for (const keyword of keywords) {
        if (lowerInput.includes(keyword.toLowerCase())) {
          return type;
        }
      }
    }

    // 无法识别的类型归为 OTHER
    return 'OTHER';
  }

  // 安全地获取单元格字符串值
  private getCellStringValue(cellValue: any): string {
    if (cellValue === null || cellValue === undefined) {
      return '';
    }
    // 处理 ExcelJS 的富文本对象
    if (typeof cellValue === 'object') {
      if (cellValue.text) {
        return String(cellValue.text).trim();
      }
      if (cellValue.richText && Array.isArray(cellValue.richText)) {
        return cellValue.richText.map((rt: any) => rt.text || '').join('').trim();
      }
      // 尝试获取 result 属性（公式单元格）
      if (cellValue.result !== undefined) {
        return String(cellValue.result).trim();
      }
      return '';
    }
    return String(cellValue).trim();
  }

  // 生成机柜导入模板
  async generateRacksTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('机柜导入模板');

    sheet.columns = [
      { header: '机柜名称*', key: 'name', width: 20 },
      { header: '所属机房名称*', key: 'roomName', width: 20 },
      { header: 'U位总数*', key: 'totalU', width: 12 },
      { header: '行号', key: 'row', width: 10 },
      { header: '列号', key: 'column', width: 10 },
      { header: '位置描述', key: 'location', width: 25 },
      { header: '备注', key: 'description', width: 30 },
    ];

    // 添加示例数据
    sheet.addRow({
      name: 'A01',
      roomName: '示例机房',
      totalU: 42,
      row: 1,
      column: 1,
      location: 'A区第1排',
      description: '核心交换机柜',
    });
    sheet.addRow({
      name: 'A02',
      roomName: '示例机房',
      totalU: 42,
      row: 1,
      column: 2,
      location: 'A区第1排',
      description: '服务器机柜',
    });

    this.styleTemplate(sheet);
    this.addInstructions(sheet, [
      '填写说明：',
      '1. 带 * 的列为必填项',
      '2. 所属机房名称必须是系统中已存在的机房',
      '3. U位总数一般为42',
      '4. 行号和列号用于机房布局定位',
      '5. 请删除示例数据后再导入',
    ]);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // 生成设备模板导入模板
  async generateTemplatesTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('设备模板导入模板');

    sheet.columns = [
      { header: '品牌*', key: 'brand', width: 15 },
      { header: '型号*', key: 'model', width: 25 },
      { header: '设备类型*', key: 'deviceType', width: 20 },
      { header: 'U高度*', key: 'sizeU', width: 10 },
    ];

    // 添加示例数据
    sheet.addRow({
      brand: 'Dell',
      model: 'PowerEdge R750',
      deviceType: '服务器',
      sizeU: 2,
    });
    sheet.addRow({
      brand: 'Cisco',
      model: 'Nexus 9336C-FX2',
      deviceType: '交换机',
      sizeU: 1,
    });

    this.styleTemplate(sheet);
    this.addInstructions(sheet, [
      '填写说明：',
      '1. 带 * 的列为必填项',
      '2. 设备类型可选值：服务器、交换机、路由器、防火墙、存储、配电单元、其他',
      '3. U高度为设备占用的机柜U位数量，一般为1-4',
      '4. 请删除示例数据后再导入',
    ]);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // 生成设备导入模板
  async generateDevicesTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('设备导入模板');

    sheet.columns = [
      { header: '设备名称*', key: 'name', width: 25 },
      { header: '品牌*', key: 'brand', width: 15 },
      { header: '型号*', key: 'model', width: 20 },
      { header: '资产标签', key: 'assetTag', width: 20 },
      { header: '机柜名称', key: 'rackName', width: 15 },
      { header: 'U位起始', key: 'positionU', width: 12 },
      { header: '状态', key: 'status', width: 12 },
      { header: '备注', key: 'notes', width: 30 },
    ];

    // 添加示例数据
    sheet.addRow({
      name: 'Web-Server-01',
      brand: 'Dell',
      model: 'PowerEdge R750',
      assetTag: 'ASSET-001',
      rackName: 'A01',
      positionU: 1,
      status: 'ONLINE',
      notes: '生产环境Web服务器',
    });
    sheet.addRow({
      name: 'Core-Switch-01',
      brand: 'Cisco',
      model: 'Nexus 9336C-FX2',
      assetTag: 'ASSET-002',
      rackName: 'A01',
      positionU: 40,
      status: 'ONLINE',
      notes: '核心交换机',
    });

    this.styleTemplate(sheet);
    this.addInstructions(sheet, [
      '填写说明：',
      '1. 带 * 的列为必填项',
      '2. 品牌和型号必须与系统中已有的设备模板匹配',
      '3. 机柜名称必须是系统中已存在的机柜',
      '4. U位起始为设备在机柜中的起始U位（从下往上数）',
      '5. 状态可选值：ONLINE(在线)、MOVING(搬迁中)、OFFLINE(离线)、ARRIVED(已到达)',
      '6. 如果不填机柜名称和U位起始，设备将创建但不上架',
      '7. 请删除示例数据后再导入',
    ]);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // 导入机柜
  async importRacks(buffer: Buffer, projectId: string): Promise<ImportResultDto> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('Excel文件为空');
    }

    const result: ImportResultDto = { success: 0, failed: 0, errors: [] };
    const rows: any[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 跳过表头

      const values = row.values as any[];
      if (!values || values.length < 3) return;

      rows.push({
        rowNumber,
        name: this.getCellStringValue(values[1]),
        roomName: this.getCellStringValue(values[2]),
        totalU: parseInt(this.getCellStringValue(values[3])) || 42,
        row: parseInt(this.getCellStringValue(values[4])) || null,
        column: parseInt(this.getCellStringValue(values[5])) || null,
        location: this.getCellStringValue(values[6]) || null,
        description: this.getCellStringValue(values[7]) || null,
      });
    });

    // 获取所有机房
    const rooms = await this.prisma.room.findMany({ where: { projectId } });
    const roomMap = new Map(rooms.map(r => [r.name, r.id]));

    for (const row of rows) {
      try {
        if (!row.name) {
          result.errors.push(`第${row.rowNumber}行：机柜名称不能为空`);
          result.failed++;
          continue;
        }
        if (!row.roomName) {
          result.errors.push(`第${row.rowNumber}行：所属机房不能为空`);
          result.failed++;
          continue;
        }

        const roomId = roomMap.get(row.roomName);
        if (!roomId) {
          result.errors.push(`第${row.rowNumber}行：机房"${row.roomName}"不存在`);
          result.failed++;
          continue;
        }

        await this.prisma.rack.create({
          data: {
            name: row.name,
            roomId,
            totalU: row.totalU,
            row: row.row,
            column: row.column,
            location: row.location,
            description: row.description,
            projectId,
          },
        });
        result.success++;
      } catch (error: any) {
        result.errors.push(`第${row.rowNumber}行：${error.message}`);
        result.failed++;
      }
    }

    return result;
  }

  // 导入设备模板
  async importTemplates(buffer: Buffer, projectId: string): Promise<ImportResultDto> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('Excel文件为空');
    }

    const result: ImportResultDto = { success: 0, failed: 0, errors: [] };
    const rows: any[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const values = row.values as any[];
      if (!values || values.length < 4) return;

      // 使用安全的单元格值获取方法
      const rawDeviceType = this.getCellStringValue(values[3]);
      const deviceType = this.normalizeDeviceType(rawDeviceType);

      rows.push({
        rowNumber,
        brand: this.getCellStringValue(values[1]),
        model: this.getCellStringValue(values[2]),
        deviceType,
        rawDeviceType, // 保留原始值用于日志
        sizeU: parseInt(this.getCellStringValue(values[4])) || 1,
      });
    });

    for (const row of rows) {
      try {
        if (!row.brand) {
          result.errors.push(`第${row.rowNumber}行：品牌不能为空`);
          result.failed++;
          continue;
        }
        if (!row.model) {
          result.errors.push(`第${row.rowNumber}行：型号不能为空`);
          result.failed++;
          continue;
        }

        // 检查是否已存在
        const existing = await this.prisma.deviceTemplate.findFirst({
          where: { brand: row.brand, model: row.model, projectId },
        });
        if (existing) {
          result.errors.push(`第${row.rowNumber}行：模板"${row.brand} ${row.model}"已存在`);
          result.failed++;
          continue;
        }

        await this.prisma.deviceTemplate.create({
          data: {
            brand: row.brand,
            model: row.model,
            deviceType: row.deviceType,
            sizeU: row.sizeU,
            isPublic: true,
            projectId,
          },
        });
        result.success++;
      } catch (error: any) {
        result.errors.push(`第${row.rowNumber}行：${error.message}`);
        result.failed++;
      }
    }

    return result;
  }

  // 导入设备
  async importDevices(buffer: Buffer, projectId: string): Promise<ImportResultDto> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('Excel文件为空');
    }

    const result: ImportResultDto = { success: 0, failed: 0, errors: [] };
    const rows: any[] = [];

    // 状态映射（支持中文）
    const statusMap: Record<string, string> = {
      '在线': 'ONLINE',
      '搬迁中': 'MOVING',
      '离线': 'OFFLINE',
      '已到达': 'ARRIVED',
      'ONLINE': 'ONLINE',
      'MOVING': 'MOVING',
      'OFFLINE': 'OFFLINE',
      'ARRIVED': 'ARRIVED',
    };

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const values = row.values as any[];
      if (!values || values.length < 3) return;

      const rawStatus = this.getCellStringValue(values[7]) || 'ONLINE';
      const status = statusMap[rawStatus] || statusMap[rawStatus.toUpperCase()] || 'ONLINE';

      rows.push({
        rowNumber,
        name: this.getCellStringValue(values[1]),
        brand: this.getCellStringValue(values[2]),
        model: this.getCellStringValue(values[3]),
        assetTag: this.getCellStringValue(values[4]) || null,
        rackName: this.getCellStringValue(values[5]) || null,
        positionU: parseInt(this.getCellStringValue(values[6])) || null,
        status,
        notes: this.getCellStringValue(values[8]) || null,
      });
    });

    // 获取所有模板和机柜
    const templates = await this.prisma.deviceTemplate.findMany({ where: { projectId } });
    const templateMap = new Map(templates.map(t => [`${t.brand}|${t.model}`, t]));

    const racks = await this.prisma.rack.findMany({ where: { projectId } });
    const rackMap = new Map(racks.map(r => [r.name, r.id]));

    for (const row of rows) {
      try {
        if (!row.name) {
          result.errors.push(`第${row.rowNumber}行：设备名称不能为空`);
          result.failed++;
          continue;
        }
        if (!row.brand || !row.model) {
          result.errors.push(`第${row.rowNumber}行：品牌和型号不能为空`);
          result.failed++;
          continue;
        }

        const template = templateMap.get(`${row.brand}|${row.model}`);
        if (!template) {
          result.errors.push(`第${row.rowNumber}行：模板"${row.brand} ${row.model}"不存在，请先导入设备模板`);
          result.failed++;
          continue;
        }

        let rackId = null;
        if (row.rackName) {
          rackId = rackMap.get(row.rackName);
          if (!rackId) {
            result.errors.push(`第${row.rowNumber}行：机柜"${row.rackName}"不存在`);
            result.failed++;
            continue;
          }
        }

        await this.prisma.device.create({
          data: {
            name: row.name,
            templateId: template.id,
            rackId,
            positionU: row.positionU,
            status: row.status,
            assetTag: row.assetTag,
            notes: row.notes,
            projectId,
          },
        });
        result.success++;
      } catch (error: any) {
        result.errors.push(`第${row.rowNumber}行：${error.message}`);
        result.failed++;
      }
    }

    return result;
  }

  private styleTemplate(sheet: ExcelJS.Worksheet) {
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4472C4' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // 示例数据行样式
    [2, 3].forEach(rowNum => {
      const row = sheet.getRow(rowNum);
      if (row) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2CC' },
        };
      }
    });
  }

  private addInstructions(sheet: ExcelJS.Worksheet, instructions: string[]) {
    const startRow = sheet.rowCount + 2;
    instructions.forEach((text, index) => {
      const row = sheet.getRow(startRow + index);
      row.getCell(1).value = text;
      row.getCell(1).font = { color: { argb: '666666' }, italic: index > 0 };
    });
  }
}
