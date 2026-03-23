import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectGuard } from '../../common/guards/project.guard';

@ApiTags('仪表盘')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: '获取仪表盘统计数据' })
  getStats(@Request() req: any) {
    return this.dashboardService.getStats(req.project.id);
  }

  @Get('migration-progress')
  @ApiOperation({ summary: '获取搬迁进度' })
  getMigrationProgress(@Request() req: any) {
    return this.dashboardService.getMigrationProgress(req.project.id);
  }
}
