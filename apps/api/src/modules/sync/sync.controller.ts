import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SyncService, SyncAction } from './sync.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('离线同步')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  @ApiOperation({ summary: '推送离线操作到服务器' })
  async pushChanges(@Body() actions: SyncAction[], @Request() req: any) {
    // 为每个 action 添加 clientId
    const actionsWithClient = actions.map((action) => ({
      ...action,
      clientId: req.user.sub,
    }));
    return this.syncService.syncFromClient(actionsWithClient);
  }

  @Get('pull')
  @ApiOperation({ summary: '拉取服务器更新' })
  @ApiQuery({ name: 'lastSyncTime', required: true, description: '上次同步时间戳' })
  async pullChanges(@Query('lastSyncTime') lastSyncTime: string, @Request() req: any) {
    return this.syncService.getUpdatesForClient(req.user.sub, parseInt(lastSyncTime, 10));
  }
}
