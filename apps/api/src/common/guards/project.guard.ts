import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException('未登录');

    const projectId =
      request.headers['x-project-id'] ||
      request.params?.projectId ||
      request.query?.projectId;

    if (!projectId) throw new ForbiddenException('未指定项目');

    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: user.sub } },
    });
    if (!member) throw new ForbiddenException('无权访问此项目');
    if (member.status !== 'APPROVED') throw new ForbiddenException('您尚未通过项目审批');

    request.project = { id: projectId, role: member.role };
    return true;
  }
}

@Injectable()
export class ProjectAdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException('未登录');

    const projectId =
      request.headers['x-project-id'] ||
      request.params?.projectId ||
      request.query?.projectId;

    if (!projectId) throw new ForbiddenException('未指定项目');

    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: user.sub } },
    });
    if (!member) throw new ForbiddenException('无权访问此项目');
    if (member.status !== 'APPROVED') throw new ForbiddenException('您尚未通过项目审批');
    if (member.role !== 'ADMIN') throw new ForbiddenException('需要管理员权限');

    request.project = { id: projectId, role: member.role };
    return true;
  }
}
