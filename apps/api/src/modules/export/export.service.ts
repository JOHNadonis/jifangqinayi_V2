import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  // 导出所有数据为 Excel
  async exportAllToExcel(projectId: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DC-Visualizer';
    workbook.created = new Date();

    // 1. 机房数据
    await this.addRoomsSheet(workbook, projectId);

    // 2. 机柜数据
    await this.addRacksSheet(workbook, projectId);

    // 3. 设备模板数据
    await this.addTemplatesSheet(workbook, projectId);

    // 4. 设备数据
    await this.addDevicesSheet(workbook, projectId);

    // 5. 连线数据
    await this.addCablesSheet(workbook, projectId);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async addRoomsSheet(workbook: ExcelJS.Workbook, projectId: string) {
    const sheet = workbook.addWorksheet('机房列表');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 40 },
      { header: '名称', key: 'name', width: 20 },
      { header: '位置', key: 'location', width: 40 },
      { header: '类型', key: 'type', width: 10 },
      { header: '机柜数量', key: 'rackCount', width: 12 },
      { header: '创建时间', key: 'createdAt', width: 20 },
    ];

    const rooms = await this.prisma.room.findMany({
      where: { projectId },
      include: { _count: { select: { racks: true } } },
    });

    rooms.forEach((room) => {
      sheet.addRow({
        id: room.id,
        name: room.name,
        location: room.location,
        type: room.type === 'OLD' ? '旧机房' : '新机房',
        rackCount: room._count.racks,
        createdAt: room.createdAt.toISOString(),
      });
    });

    this.styleHeader(sheet);
  }

  private async addRacksSheet(workbook: ExcelJS.Workbook, projectId: string) {
    const sheet = workbook.addWorksheet('机柜列表');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 40 },
      { header: '名称', key: 'name', width: 15 },
      { header: '所属机房', key: 'roomName', width: 20 },
      { header: 'U位数量', key: 'totalU', width: 10 },
      { header: '行', key: 'row', width: 8 },
      { header: '列', key: 'column', width: 8 },
      { header: '设备数量', key: 'deviceCount', width: 12 },
      { header: '创建时间', key: 'createdAt', width: 20 },
    ];

    const racks = await this.prisma.rack.findMany({
      where: { projectId },
      include: { room: true, _count: { select: { devices: true } } },
    });

    racks.forEach((rack) => {
      sheet.addRow({
        id: rack.id,
        name: rack.name,
        roomName: rack.room.name,
        totalU: rack.totalU,
        row: rack.row,
        column: rack.column,
        deviceCount: rack._count.devices,
        createdAt: rack.createdAt.toISOString(),
      });
    });

    this.styleHeader(sheet);
  }

  private async addTemplatesSheet(workbook: ExcelJS.Workbook, projectId: string) {
    const sheet = workbook.addWorksheet('设备模板');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 40 },
      { header: '品牌', key: 'brand', width: 15 },
      { header: '型号', key: 'model', width: 25 },
      { header: '设备类型', key: 'deviceType', width: 12 },
      { header: 'U高度', key: 'sizeU', width: 10 },
      { header: '是否公开', key: 'isPublic', width: 10 },
      { header: '使用数量', key: 'deviceCount', width: 12 },
    ];

    const templates = await this.prisma.deviceTemplate.findMany({
      where: { projectId },
      include: { _count: { select: { devices: true } } },
    });

    const deviceTypeMap: Record<string, string> = {
      SERVER: '服务器',
      SWITCH: '交换机',
      ROUTER: '路由器',
      FIREWALL: '防火墙',
      STORAGE: '存储',
      PDU: '配电单元',
      OTHER: '其他',
    };

    templates.forEach((template) => {
      sheet.addRow({
        id: template.id,
        brand: template.brand,
        model: template.model,
        deviceType: deviceTypeMap[template.deviceType] || template.deviceType,
        sizeU: template.sizeU,
        isPublic: template.isPublic ? '是' : '否',
        deviceCount: template._count.devices,
      });
    });

    this.styleHeader(sheet);
  }

  private async addDevicesSheet(workbook: ExcelJS.Workbook, projectId: string) {
    const sheet = workbook.addWorksheet('设备列表');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 40 },
      { header: '名称', key: 'name', width: 25 },
      { header: '资产标签', key: 'assetTag', width: 20 },
      { header: '品牌', key: 'brand', width: 12 },
      { header: '型号', key: 'model', width: 20 },
      { header: '设备类型', key: 'deviceType', width: 12 },
      { header: '机房', key: 'roomName', width: 15 },
      { header: '机柜', key: 'rackName', width: 10 },
      { header: 'U位', key: 'positionU', width: 8 },
      { header: '状态', key: 'status', width: 10 },
      { header: '连线数量', key: 'cableCount', width: 12 },
      { header: '备注', key: 'notes', width: 30 },
    ];

    const devices = await this.prisma.device.findMany({
      where: { projectId },
      include: {
        template: true,
        rack: { include: { room: true } },
        _count: { select: { cablesFrom: true, cablesTo: true } },
      },
    });

    const statusMap: Record<string, string> = {
      ONLINE: '在线',
      MOVING: '搬迁中',
      OFFLINE: '离线',
      ARRIVED: '已到达',
    };

    const deviceTypeMap: Record<string, string> = {
      SERVER: '服务器',
      SWITCH: '交换机',
      ROUTER: '路由器',
      FIREWALL: '防火墙',
      STORAGE: '存储',
      PDU: '配电单元',
      OTHER: '其他',
    };

    devices.forEach((device) => {
      sheet.addRow({
        id: device.id,
        name: device.name,
        assetTag: device.assetTag || '',
        brand: device.template.brand,
        model: device.template.model,
        deviceType: deviceTypeMap[device.template.deviceType] || device.template.deviceType,
        roomName: device.rack?.room?.name || '未分配',
        rackName: device.rack?.name || '未分配',
        positionU: device.positionU || '',
        status: statusMap[device.status] || device.status,
        cableCount: device._count.cablesFrom + device._count.cablesTo,
        notes: device.notes || '',
      });
    });

    this.styleHeader(sheet);
  }

  private async addCablesSheet(workbook: ExcelJS.Workbook, projectId: string) {
    const sheet = workbook.addWorksheet('连线列表');

    sheet.columns = [
      { header: '追溯码', key: 'traceCode', width: 20 },
      { header: '源设备', key: 'srcDevice', width: 25 },
      { header: '源机柜', key: 'srcRack', width: 10 },
      { header: '源端口', key: 'srcPort', width: 12 },
      { header: '目标设备', key: 'dstDevice', width: 25 },
      { header: '目标机柜', key: 'dstRack', width: 10 },
      { header: '目标端口', key: 'dstPort', width: 12 },
      { header: '线缆类型', key: 'cableType', width: 12 },
      { header: '颜色', key: 'color', width: 10 },
      { header: '用途', key: 'purpose', width: 20 },
      { header: '状态', key: 'status', width: 10 },
    ];

    const cables = await this.prisma.cable.findMany({
      where: { projectId },
      include: {
        srcDevice: { include: { rack: true } },
        dstDevice: { include: { rack: true } },
      },
    });

    const cableTypeMap: Record<string, string> = {
      FIBER: '光纤',
      CAT6: 'CAT6网线',
      CAT5E: 'CAT5E网线',
      POWER: '电源线',
      OTHER: '其他',
    };

    const statusMap: Record<string, string> = {
      RECORDED: '已记录',
      LABELED: '已贴标',
      DISCONNECTED: '已断开',
      VERIFIED: '已确认',
    };

    cables.forEach((cable) => {
      sheet.addRow({
        traceCode: cable.traceCode,
        srcDevice: cable.srcDevice.name,
        srcRack: cable.srcDevice.rack?.name || '',
        srcPort: cable.srcPortIndex,
        dstDevice: cable.dstDevice.name,
        dstRack: cable.dstDevice.rack?.name || '',
        dstPort: cable.dstPortIndex,
        cableType: cableTypeMap[cable.cableType] || cable.cableType,
        color: cable.color || '',
        purpose: cable.purpose || '',
        status: statusMap[cable.status] || cable.status,
      });
    });

    this.styleHeader(sheet);
  }

  private styleHeader(sheet: ExcelJS.Worksheet) {
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4472C4' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // 添加边框
    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });
  }

  // 导出标签数据
  async exportLabels(projectId: string, cableIds?: string[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('线缆标签');

    sheet.columns = [
      { header: '追溯码', key: 'traceCode', width: 20 },
      { header: 'A端设备', key: 'srcDevice', width: 25 },
      { header: 'A端机柜', key: 'srcRack', width: 10 },
      { header: 'A端端口', key: 'srcPort', width: 12 },
      { header: 'B端设备', key: 'dstDevice', width: 25 },
      { header: 'B端机柜', key: 'dstRack', width: 10 },
      { header: 'B端端口', key: 'dstPort', width: 12 },
      { header: '线缆类型', key: 'cableType', width: 12 },
      { header: '颜色', key: 'color', width: 10 },
    ];

    const where = cableIds ? { projectId, id: { in: cableIds } } : { projectId };

    const cables = await this.prisma.cable.findMany({
      where,
      include: {
        srcDevice: { include: { rack: true } },
        dstDevice: { include: { rack: true } },
      },
    });

    const cableTypeMap: Record<string, string> = {
      FIBER: '光纤',
      CAT6: 'CAT6',
      CAT5E: 'CAT5E',
      POWER: '电源',
      OTHER: '其他',
    };

    cables.forEach((cable) => {
      sheet.addRow({
        traceCode: cable.traceCode,
        srcDevice: cable.srcDevice.name,
        srcRack: cable.srcDevice.rack?.name || '',
        srcPort: cable.srcPortIndex,
        dstDevice: cable.dstDevice.name,
        dstRack: cable.dstDevice.rack?.name || '',
        dstPort: cable.dstPortIndex,
        cableType: cableTypeMap[cable.cableType] || cable.cableType,
        color: cable.color || '',
      });
    });

    this.styleHeader(sheet);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
