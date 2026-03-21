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
  HttpCode,
  HttpStatus,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CablesService } from './cables.service';
import { CreateCableDto } from './dto/create-cable.dto';
import { UpdateCableDto } from './dto/update-cable.dto';
import { QueryCableDto } from './dto/query-cable.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('连线管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cables')
export class CablesController {
  constructor(private readonly cablesService: CablesService) {}

  @Post()
  @ApiOperation({ summary: '创建连线' })
  @ApiResponse({ status: 201, description: '创建成功，返回连线信息及追踪码' })
  @ApiResponse({ status: 400, description: '参数错误或端口已被占用' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  create(@Body() createCableDto: CreateCableDto) {
    return this.cablesService.create(createCableDto);
  }

  @Get()
  @ApiOperation({ summary: '获取连线列表' })
  @ApiResponse({ status: 200, description: '返回分页数据' })
  findAll(@Query() query: QueryCableDto) {
    return this.cablesService.findAll(query);
  }

  @Get('export-labels')
  @ApiOperation({ summary: '导出标签数据（CSV格式）' })
  @ApiResponse({ status: 200, description: '返回CSV格式的标签数据' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="cable-labels.csv"')
  async exportLabels(@Query() query: QueryCableDto) {
    return this.cablesService.exportLabels(query);
  }

  @Get('trace/:traceCode')
  @ApiOperation({ summary: '通过追踪码查询连线（移动端扫码）' })
  @ApiParam({ name: 'traceCode', description: '追踪码', example: 'CBL-2025-A01-001' })
  @ApiResponse({ status: 200, description: '返回连线详情' })
  @ApiResponse({ status: 404, description: '连线不存在或追踪码错误' })
  findByTraceCode(@Param('traceCode') traceCode: string) {
    return this.cablesService.findByTraceCode(traceCode);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取连线详情' })
  @ApiResponse({ status: 200, description: '返回连线详情' })
  @ApiResponse({ status: 404, description: '连线不存在' })
  findOne(@Param('id') id: string) {
    return this.cablesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新连线信息' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '连线不存在' })
  update(@Param('id') id: string, @Body() updateCableDto: UpdateCableDto) {
    return this.cablesService.update(id, updateCableDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除连线' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '连线不存在' })
  remove(@Param('id') id: string) {
    return this.cablesService.remove(id);
  }

  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '确认接线（状态变为 VERIFIED）' })
  @ApiResponse({ status: 200, description: '确认成功' })
  @ApiResponse({ status: 400, description: '连线已确认' })
  @ApiResponse({ status: 404, description: '连线不存在' })
  verify(@Param('id') id: string) {
    return this.cablesService.verify(id);
  }

  @Post(':id/disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '断开连线（状态变为 DISCONNECTED）' })
  @ApiResponse({ status: 200, description: '断开成功' })
  @ApiResponse({ status: 400, description: '连线已断开' })
  @ApiResponse({ status: 404, description: '连线不存在' })
  disconnect(@Param('id') id: string) {
    return this.cablesService.disconnect(id);
  }
}
