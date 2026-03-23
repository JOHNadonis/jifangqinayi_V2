import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectGuard } from '../../common/guards/project.guard';
import { ActivityLogService } from './activity-log.service';
import { ErrorLogService } from './error-log.service';

@ApiTags('日志')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('logs')
export class LogsController {
  constructor(
    private activityLogService: ActivityLogService,
    private errorLogService: ErrorLogService,
  ) {}

  @Get('activity')
  @ApiOperation({ summary: '操作日志' })
  getActivity(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
  ) {
    return this.activityLogService.findAll(req.project.id, {
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
      entityType,
      action,
    });
  }

  @Get('errors')
  @ApiOperation({ summary: '错误日志' })
  getErrors(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.errorLogService.findAll({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
    });
  }
}
