import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { QueryDeviceDto } from './dto/query-device.dto';
import { MoveDeviceDto } from './dto/move-device.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type DeviceStatus = 'ONLINE' | 'MOVING' | 'OFFLINE' | 'ARRIVED';

@ApiTags('设备管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @ApiOperation({ summary: '创建设备' })
  create(@Body() createDeviceDto: CreateDeviceDto) {
    return this.devicesService.create(createDeviceDto);
  }

  @Get()
  @ApiOperation({ summary: '获取设备列表' })
  findAll(@Query() query: QueryDeviceDto) {
    return this.devicesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取设备详情' })
  findOne(@Param('id') id: string) {
    return this.devicesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新设备' })
  update(@Param('id') id: string, @Body() updateDeviceDto: UpdateDeviceDto) {
    return this.devicesService.update(id, updateDeviceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除设备' })
  remove(@Param('id') id: string) {
    return this.devicesService.remove(id);
  }

  @Post(':id/move')
  @ApiOperation({ summary: '设备搬迁' })
  move(@Param('id') id: string, @Body() moveDeviceDto: MoveDeviceDto) {
    return this.devicesService.move(id, moveDeviceDto);
  }

  @Patch(':id/status/:status')
  @ApiOperation({ summary: '更新设备状态' })
  updateStatus(
    @Param('id') id: string,
    @Param('status') status: DeviceStatus,
  ) {
    return this.devicesService.updateStatus(id, status);
  }
}
