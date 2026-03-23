import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { QueryDeviceDto } from './dto/query-device.dto';
import { MoveDeviceDto } from './dto/move-device.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectGuard } from '../../common/guards/project.guard';

type DeviceStatus = 'ONLINE' | 'MOVING' | 'OFFLINE' | 'ARRIVED';

@ApiTags('设备管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @ApiOperation({ summary: '创建设备' })
  create(@Request() req: any, @Body() createDeviceDto: CreateDeviceDto) {
    return this.devicesService.create(req.project.id, req.user, createDeviceDto);
  }

  @Get()
  @ApiOperation({ summary: '获取设备列表' })
  findAll(@Request() req: any, @Query() query: QueryDeviceDto) {
    return this.devicesService.findAll(req.project.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取设备详情' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.devicesService.findOne(id, req.project.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新设备' })
  update(@Request() req: any, @Param('id') id: string, @Body() updateDeviceDto: UpdateDeviceDto) {
    return this.devicesService.update(id, req.project.id, req.user, updateDeviceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除设备' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.devicesService.remove(id, req.project.id, req.user);
  }

  @Post(':id/move')
  @ApiOperation({ summary: '设备搬迁' })
  move(@Request() req: any, @Param('id') id: string, @Body() moveDeviceDto: MoveDeviceDto) {
    return this.devicesService.move(id, req.project.id, req.user, moveDeviceDto);
  }

  @Patch(':id/status/:status')
  @ApiOperation({ summary: '更新设备状态' })
  updateStatus(@Request() req: any, @Param('id') id: string, @Param('status') status: DeviceStatus) {
    return this.devicesService.updateStatus(id, req.project.id, status);
  }
}
