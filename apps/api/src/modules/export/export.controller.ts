import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('数据导出')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('excel')
  @ApiOperation({ summary: '导出全量 Excel 数据' })
  async exportExcel(@Res() res: Response) {
    const buffer = await this.exportService.exportAllToExcel();

    const filename = `DC-Visualizer-Export-${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('labels')
  @ApiOperation({ summary: '导出线缆标签 Excel' })
  @ApiQuery({ name: 'ids', required: false, description: '线缆ID列表，逗号分隔' })
  async exportLabels(@Res() res: Response, @Query('ids') ids?: string) {
    const cableIds = ids ? ids.split(',').map((id) => id.trim()) : undefined;
    const buffer = await this.exportService.exportLabels(cableIds);

    const filename = `Cable-Labels-${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
