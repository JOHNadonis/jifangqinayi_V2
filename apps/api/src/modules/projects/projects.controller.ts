import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

@ApiTags('项目管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: '创建项目' })
  create(@Request() req: any, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: '我的项目列表' })
  findMine(@Request() req: any) {
    return this.projectsService.findMyProjects(req.user.sub);
  }

  @Get('search')
  @ApiOperation({ summary: '搜索项目' })
  search(@Request() req: any, @Query('q') q: string) {
    return this.projectsService.search(q || '', req.user.sub);
  }

  @Post('join-by-code')
  @ApiOperation({ summary: '通过邀请码加入项目' })
  joinByCode(@Request() req: any, @Body('inviteCode') inviteCode: string) {
    return this.projectsService.joinByCode(req.user.sub, inviteCode);
  }

  @Get(':id')
  @ApiOperation({ summary: '项目详情' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.projectsService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新项目' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, req.user.sub, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除项目' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.projectsService.remove(id, req.user.sub);
  }

  @Get(':id/members')
  @ApiOperation({ summary: '成员列表' })
  getMembers(@Request() req: any, @Param('id') id: string) {
    return this.projectsService.getMembers(id, req.user.sub);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: '移除成员' })
  removeMember(@Request() req: any, @Param('id') id: string, @Param('userId') userId: string) {
    return this.projectsService.removeMember(id, userId, req.user.sub);
  }

  @Post(':id/regenerate-code')
  @ApiOperation({ summary: '重新生成邀请码' })
  regenerateCode(@Request() req: any, @Param('id') id: string) {
    return this.projectsService.regenerateCode(id, req.user.sub);
  }
}
