import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { QueryTemplateDto } from './dto/query-template.dto';
import { GeneratePortsDto } from './dto/generate-ports.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectGuard } from '../../common/guards/project.guard';

@ApiTags('设备模板管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @ApiOperation({ summary: '创建设备模板' })
  create(@Request() req: any, @Body() createTemplateDto: CreateTemplateDto) {
    return this.templatesService.create(req.project.id, req.user, createTemplateDto);
  }

  @Get()
  @ApiOperation({ summary: '获取设备模板列表' })
  findAll(@Request() req: any, @Query() query: QueryTemplateDto) {
    return this.templatesService.findAll(req.project.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取设备模板详情' })
  @ApiParam({ name: 'id', description: '模板ID' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.templatesService.findOne(id, req.project.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新设备模板' })
  @ApiParam({ name: 'id', description: '模板ID' })
  update(@Request() req: any, @Param('id') id: string, @Body() updateTemplateDto: UpdateTemplateDto) {
    return this.templatesService.update(id, req.project.id, req.user, updateTemplateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除设备模板' })
  @ApiParam({ name: 'id', description: '模板ID' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.templatesService.remove(id, req.project.id, req.user);
  }

  @Post(':id/generate-ports')
  @ApiOperation({ summary: '快速生成端口布局' })
  @ApiParam({ name: 'id', description: '模板ID' })
  generatePorts(@Request() req: any, @Param('id') id: string, @Body() generatePortsDto: GeneratePortsDto) {
    return this.templatesService.generatePorts(id, req.project.id, generatePortsDto);
  }
}
