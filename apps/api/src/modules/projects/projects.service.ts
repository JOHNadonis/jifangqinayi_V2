import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateProjectDto) {
    let inviteCode: string;
    let attempts = 0;
    do {
      inviteCode = generateInviteCode();
      attempts++;
      const existing = await this.prisma.project.findUnique({ where: { inviteCode } });
      if (!existing) break;
    } while (attempts < 10);

    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        inviteCode,
        members: {
          create: { userId, role: 'ADMIN' },
        },
      },
    });
    return project;
  }

  async findMyProjects(userId: string) {
    const members = await this.prisma.projectMember.findMany({
      where: { userId },
      include: {
        project: {
          include: { _count: { select: { members: true, rooms: true, devices: true } } },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
    return members.map((m) => ({
      ...m.project,
      myRole: m.role,
    }));
  }

  async findOne(projectId: string, userId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) throw new ForbiddenException('无权访问此项目');

    return this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        _count: { select: { members: true, rooms: true, racks: true, devices: true, cables: true } },
      },
    });
  }

  async update(projectId: string, userId: string, dto: UpdateProjectDto) {
    await this.requireAdmin(projectId, userId);
    return this.prisma.project.update({ where: { id: projectId }, data: dto });
  }

  async remove(projectId: string, userId: string) {
    await this.requireAdmin(projectId, userId);
    await this.prisma.project.delete({ where: { id: projectId } });
  }

  async joinByCode(userId: string, inviteCode: string) {
    const project = await this.prisma.project.findUnique({ where: { inviteCode } });
    if (!project) throw new NotFoundException('邀请码无效');

    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId } },
    });
    if (existing) throw new ConflictException('您已是该项目成员');

    await this.prisma.projectMember.create({
      data: { projectId: project.id, userId, role: 'MEMBER' },
    });
    return { message: '加入成功', project: { id: project.id, name: project.name } };
  }

  async search(query: string, userId: string) {
    const projects = await this.prisma.project.findMany({
      where: { name: { contains: query } },
      include: { _count: { select: { members: true } } },
      take: 20,
    });
    // mark which ones the user is already in
    const myMemberships = await this.prisma.projectMember.findMany({
      where: { userId, projectId: { in: projects.map((p) => p.id) } },
    });
    const mySet = new Set(myMemberships.map((m) => m.projectId));
    return projects.map((p) => ({ ...p, isMember: mySet.has(p.id) }));
  }

  async getMembers(projectId: string, userId: string) {
    await this.requireAdmin(projectId, userId);
    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, username: true, name: true } } },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async removeMember(projectId: string, targetUserId: string, requesterId: string) {
    await this.requireAdmin(projectId, requesterId);
    if (targetUserId === requesterId) throw new ForbiddenException('不能移除自己');
    await this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });
  }

  async regenerateCode(projectId: string, userId: string) {
    await this.requireAdmin(projectId, userId);
    let inviteCode: string;
    let attempts = 0;
    do {
      inviteCode = generateInviteCode();
      attempts++;
      const existing = await this.prisma.project.findUnique({ where: { inviteCode } });
      if (!existing) break;
    } while (attempts < 10);
    return this.prisma.project.update({ where: { id: projectId }, data: { inviteCode } });
  }

  async requireAdmin(projectId: string, userId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) throw new ForbiddenException('无权访问此项目');
    if (member.role !== 'ADMIN') throw new ForbiddenException('需要管理员权限');
    return member;
  }

  async getMembership(projectId: string, userId: string) {
    return this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
  }
}
