import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('仪表盘')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: '获取仪表盘统计数据' })
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('migration-progress')
  @ApiOperation({ summary: '获取搬迁进度' })
  getMigrationProgress() {
    return this.dashboardService.getMigrationProgress();
  }
}
