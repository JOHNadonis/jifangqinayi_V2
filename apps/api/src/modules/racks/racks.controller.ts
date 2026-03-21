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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RacksService } from './racks.service';
import { CreateRackDto } from './dto/create-rack.dto';
import { UpdateRackDto } from './dto/update-rack.dto';
import { QueryRackDto } from './dto/query-rack.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('机柜管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('racks')
export class RacksController {
  constructor(private readonly racksService: RacksService) {}

  @Post()
  @ApiOperation({ summary: '创建机柜' })
  create(@Body() createRackDto: CreateRackDto) {
    return this.racksService.create(createRackDto);
  }

  @Get()
  @ApiOperation({ summary: '获取机柜列表' })
  findAll(@Query() query: QueryRackDto) {
    return this.racksService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取机柜详情' })
  findOne(@Param('id') id: string) {
    return this.racksService.findOne(id);
  }

  @Get(':id/usage')
  @ApiOperation({ summary: '获取机柜U位使用情况' })
  getUsage(@Param('id') id: string) {
    return this.racksService.getUsage(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新机柜' })
  update(@Param('id') id: string, @Body() updateRackDto: UpdateRackDto) {
    return this.racksService.update(id, updateRackDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除机柜' })
  remove(@Param('id') id: string) {
    return this.racksService.remove(id);
  }
}
