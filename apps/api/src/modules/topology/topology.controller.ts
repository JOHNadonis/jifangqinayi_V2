import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TopologyService } from './topology.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('拓扑图')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('topology')
export class TopologyController {
  constructor(private readonly topologyService: TopologyService) {}

  @Get('room/:roomId')
  @ApiOperation({ summary: '获取机房拓扑图数据' })
  getTopologyByRoom(@Param('roomId') roomId: string) {
    return this.topologyService.getTopologyByRoom(roomId);
  }

  @Get('device/:deviceId')
  @ApiOperation({ summary: '获取设备连接关系（聚焦模式）' })
  getDeviceConnections(@Param('deviceId') deviceId: string) {
    return this.topologyService.getDeviceConnections(deviceId);
  }
}
