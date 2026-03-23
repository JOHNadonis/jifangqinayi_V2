import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RacksService } from './racks.service';
import { CreateRackDto } from './dto/create-rack.dto';
import { UpdateRackDto } from './dto/update-rack.dto';
import { QueryRackDto } from './dto/query-rack.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectGuard } from '../../common/guards/project.guard';

@ApiTags('机柜管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('racks')
export class RacksController {
  constructor(private readonly racksService: RacksService) {}

  @Post()
  @ApiOperation({ summary: '创建机柜' })
  create(@Request() req: any, @Body() createRackDto: CreateRackDto) {
    return this.racksService.create(req.project.id, req.user, createRackDto);
  }

  @Get()
  @ApiOperation({ summary: '获取机柜列表' })
  findAll(@Request() req: any, @Query() query: QueryRackDto) {
    return this.racksService.findAll(req.project.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取机柜详情' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.racksService.findOne(id, req.project.id);
  }

  @Get(':id/usage')
  @ApiOperation({ summary: '获取机柜U位使用情况' })
  getUsage(@Request() req: any, @Param('id') id: string) {
    return this.racksService.getUsage(id, req.project.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新机柜' })
  update(@Request() req: any, @Param('id') id: string, @Body() updateRackDto: UpdateRackDto) {
    return this.racksService.update(id, req.project.id, req.user, updateRackDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除机柜' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.racksService.remove(id, req.project.id, req.user);
  }
}
