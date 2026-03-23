import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { QueryRoomDto } from './dto/query-room.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectGuard } from '../../common/guards/project.guard';

@ApiTags('机房管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @ApiOperation({ summary: '创建机房' })
  create(@Request() req: any, @Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.create(req.project.id, req.user, createRoomDto);
  }

  @Get()
  @ApiOperation({ summary: '获取机房列表' })
  findAll(@Request() req: any, @Query() query: QueryRoomDto) {
    return this.roomsService.findAll(req.project.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取机房详情' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.roomsService.findOne(id, req.project.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新机房' })
  update(@Request() req: any, @Param('id') id: string, @Body() updateRoomDto: UpdateRoomDto) {
    return this.roomsService.update(id, req.project.id, req.user, updateRoomDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除机房' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.roomsService.remove(id, req.project.id, req.user);
  }
}
