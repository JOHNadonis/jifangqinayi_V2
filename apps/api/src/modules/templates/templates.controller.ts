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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { QueryTemplateDto } from './dto/query-template.dto';
import { GeneratePortsDto } from './dto/generate-ports.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('设备模板管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @ApiOperation({ summary: '创建设备模板' })
  create(@Body() createTemplateDto: CreateTemplateDto) {
    return this.templatesService.create(createTemplateDto);
  }

  @Get()
  @ApiOperation({ summary: '获取设备模板列表' })
  findAll(@Query() query: QueryTemplateDto) {
    return this.templatesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取设备模板详情' })
  @ApiParam({ name: 'id', description: '模板ID' })
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新设备模板' })
  @ApiParam({ name: 'id', description: '模板ID' })
  update(@Param('id') id: string, @Body() updateTemplateDto: UpdateTemplateDto) {
    return this.templatesService.update(id, updateTemplateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除设备模板' })
  @ApiParam({ name: 'id', description: '模板ID' })
  remove(@Param('id') id: string) {
    return this.templatesService.remove(id);
  }

  @Post(':id/generate-ports')
  @ApiOperation({
    summary: '快速生成端口布局',
    description: '根据端口数量和配置自动生成矩阵式端口布局。支持自定义端口类型、前缀、起始编号、每行端口数、间距等参数。',
  })
  @ApiParam({ name: 'id', description: '模板ID' })
  generatePorts(
    @Param('id') id: string,
    @Body() generatePortsDto: GeneratePortsDto,
  ) {
    return this.templatesService.generatePorts(id, generatePortsDto);
  }
}
