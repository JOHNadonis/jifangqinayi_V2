import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request,
  HttpCode, HttpStatus, Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CablesService } from './cables.service';
import { CreateCableDto } from './dto/create-cable.dto';
import { UpdateCableDto } from './dto/update-cable.dto';
import { QueryCableDto } from './dto/query-cable.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectGuard } from '../../common/guards/project.guard';

@ApiTags('连线管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('cables')
export class CablesController {
  constructor(private readonly cablesService: CablesService) {}

  @Post()
  @ApiOperation({ summary: '创建连线' })
  create(@Request() req: any, @Body() createCableDto: CreateCableDto) {
    return this.cablesService.create(req.project.id, req.user, createCableDto);
  }

  @Get()
  @ApiOperation({ summary: '获取连线列表' })
  findAll(@Request() req: any, @Query() query: QueryCableDto) {
    return this.cablesService.findAll(req.project.id, query);
  }

  @Get('export-labels')
  @ApiOperation({ summary: '导出标签数据（CSV格式）' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="cable-labels.csv"')
  exportLabels(@Request() req: any, @Query() query: QueryCableDto) {
    return this.cablesService.exportLabels(req.project.id, query);
  }

  @Get('trace/:traceCode')
  @ApiOperation({ summary: '通过追踪码查询连线（移动端扫码）' })
  @ApiParam({ name: 'traceCode', description: '追踪码' })
  findByTraceCode(@Request() req: any, @Param('traceCode') traceCode: string) {
    return this.cablesService.findByTraceCode(traceCode, req.project.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取连线详情' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.cablesService.findOne(id, req.project.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新连线信息' })
  update(@Request() req: any, @Param('id') id: string, @Body() updateCableDto: UpdateCableDto) {
    return this.cablesService.update(id, req.project.id, req.user, updateCableDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除连线' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.cablesService.remove(id, req.project.id, req.user);
  }

  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '确认接线' })
  verify(@Request() req: any, @Param('id') id: string) {
    return this.cablesService.verify(id, req.project.id);
  }

  @Post(':id/disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '断开连线' })
  disconnect(@Request() req: any, @Param('id') id: string) {
    return this.cablesService.disconnect(id, req.project.id);
  }
}
