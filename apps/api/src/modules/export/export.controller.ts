import { Controller, Get, Query, Res, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectGuard } from '../../common/guards/project.guard';

@ApiTags('数据导出')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('excel')
  @ApiOperation({ summary: '导出全量 Excel 数据' })
  async exportExcel(@Request() req: any, @Res() res: Response) {
    const buffer = await this.exportService.exportAllToExcel(req.project.id);
    const filename = `DC-Visualizer-Export-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('labels')
  @ApiOperation({ summary: '导出线缆标签 Excel' })
  @ApiQuery({ name: 'ids', required: false })
  async exportLabels(@Request() req: any, @Res() res: Response, @Query('ids') ids?: string) {
    const cableIds = ids ? ids.split(',').map((id) => id.trim()) : undefined;
    const buffer = await this.exportService.exportLabels(req.project.id, cableIds);
    const filename = `Cable-Labels-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
