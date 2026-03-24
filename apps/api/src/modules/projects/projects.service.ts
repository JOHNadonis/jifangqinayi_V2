import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
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
          create: { userId, role: 'ADMIN', status: 'APPROVED' },
        },
      },
    });
    return project;
  }

  async findMyProjects(userId: string) {
    const members = await this.prisma.projectMember.findMany({
      where: { userId, status: 'APPROVED' },
      include: {
        project: {
          include: { _count: { select: { members: true, rooms: true, devices: true } } },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
    return members.map((m) => ({
      ...m.project,
      role: m.role,
    }));
  }

  async findOne(projectId: string, userId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member || member.status !== 'APPROVED') throw new ForbiddenException('无权访问此项目');

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

  // 通过邀请码直接加入（改为需要审批）
  async joinByCode(userId: string, inviteCode: string) {
    const project = await this.prisma.project.findUnique({ where: { inviteCode } });
    if (!project) throw new NotFoundException('邀请码无效');

    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId } },
    });
    if (existing) {
      if (existing.status === 'APPROVED') throw new ConflictException('您已是该项目成员');
      if (existing.status === 'PENDING') throw new ConflictException('您已申请加入，请等待管理员审批');
      if (existing.status === 'REJECTED') {
        // 如果之前被拒绝，允许重新申请
        await this.prisma.projectMember.update({
          where: { id: existing.id },
          data: { status: 'PENDING', role: 'MEMBER' },
        });
        return { message: '已重新提交申请，请等待管理员审批', projectName: project.name };
      }
    }

    await this.prisma.projectMember.create({
      data: { projectId: project.id, userId, role: 'MEMBER', status: 'PENDING' },
    });
    return { message: '申请已提交，请等待管理员审批', projectName: project.name };
  }

  // 搜索项目时申请加入
  async applyToJoin(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('项目不存在');

    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (existing) {
      if (existing.status === 'APPROVED') throw new ConflictException('您已是该项目成员');
      if (existing.status === 'PENDING') throw new ConflictException('您已申请加入，请等待管理员审批');
      if (existing.status === 'REJECTED') {
        await this.prisma.projectMember.update({
          where: { id: existing.id },
          data: { status: 'PENDING', role: 'MEMBER' },
        });
        return { message: '已重新提交申请，请等待管理员审批' };
      }
    }

    await this.prisma.projectMember.create({
      data: { projectId, userId, role: 'MEMBER', status: 'PENDING' },
    });
    return { message: '申请已提交，请等待管理员审批' };
  }

  async search(query: string, userId: string) {
    const projects = await this.prisma.project.findMany({
      where: { name: { contains: query } },
      include: { _count: { select: { members: true } } },
      take: 20,
    });
    // 查找用户与这些项目的关系
    const myMemberships = await this.prisma.projectMember.findMany({
      where: { userId, projectId: { in: projects.map((p) => p.id) } },
    });
    const membershipMap = new Map(myMemberships.map((m) => [m.projectId, m]));
    return projects.map((p) => ({
      ...p,
      isMember: membershipMap.has(p.id) && membershipMap.get(p.id)!.status === 'APPROVED',
      isPending: membershipMap.has(p.id) && membershipMap.get(p.id)!.status === 'PENDING',
      role: membershipMap.get(p.id)?.role,
    }));
  }

  async getMembers(projectId: string, userId: string) {
    await this.requireAdmin(projectId, userId);
    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, username: true, name: true } } },
      orderBy: { joinedAt: 'asc' },
    });
  }

  // 获取待审批列表
  async getPendingRequests(projectId: string, userId: string) {
    await this.requireAdmin(projectId, userId);
    return this.prisma.projectMember.findMany({
      where: { projectId, status: 'PENDING' },
      include: { user: { select: { id: true, username: true, name: true } } },
      orderBy: { joinedAt: 'desc' },
    });
  }

  // 审批通过
  async approveRequest(projectId: string, targetUserId: string, requesterId: string) {
    await this.requireAdmin(projectId, requesterId);
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });
    if (!member) throw new NotFoundException('未找到该申请');
    if (member.status !== 'PENDING') throw new BadRequestException('该申请不在待审批状态');

    return this.prisma.projectMember.update({
      where: { id: member.id },
      data: { status: 'APPROVED' },
    });
  }

  // 审批拒绝
  async rejectRequest(projectId: string, targetUserId: string, requesterId: string) {
    await this.requireAdmin(projectId, requesterId);
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });
    if (!member) throw new NotFoundException('未找到该申请');
    if (member.status !== 'PENDING') throw new BadRequestException('该申请不在待审批状态');

    return this.prisma.projectMember.update({
      where: { id: member.id },
      data: { status: 'REJECTED' },
    });
  }

  // 更新成员角色
  async updateMemberRole(projectId: string, targetUserId: string, role: string, requesterId: string) {
    await this.requireAdmin(projectId, requesterId);
    if (targetUserId === requesterId) throw new ForbiddenException('不能修改自己的角色');
    if (!['ADMIN', 'MEMBER'].includes(role)) throw new BadRequestException('无效的角色');

    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });
    if (!member) throw new NotFoundException('未找到该成员');
    if (member.status !== 'APPROVED') throw new BadRequestException('该用户尚未通过审批');

    return this.prisma.projectMember.update({
      where: { id: member.id },
      data: { role },
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
    if (member.status !== 'APPROVED') throw new ForbiddenException('您尚未通过审批');
    if (member.role !== 'ADMIN') throw new ForbiddenException('需要管理员权限');
    return member;
  }

  async getMembership(projectId: string, userId: string) {
    return this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
  }
}
