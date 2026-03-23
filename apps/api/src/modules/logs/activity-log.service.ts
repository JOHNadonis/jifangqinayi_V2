import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ActivityLogService {
  constructor(private prisma: PrismaService) {}

  async record(params: {
    projectId: string;
    userId: string;
    username: string;
    action: string;
    entityType: string;
    entityId: string;
    entityName?: string;
    before?: any;
    after?: any;
  }) {
    try {
      await this.prisma.activityLog.create({
        data: {
          projectId: params.projectId,
          userId: params.userId,
          username: params.username,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          entityName: params.entityName,
          before: params.before ? JSON.stringify(params.before) : null,
          after: params.after ? JSON.stringify(params.after) : null,
        },
      });
    } catch {
      // log recording should never break the main operation
    }
  }

  async findAll(projectId: string, params: {
    page?: number;
    pageSize?: number;
    entityType?: string;
    action?: string;
  }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = { projectId };
    if (params.entityType) where.entityType = params.entityType;
    if (params.action) where.action = params.action;

    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }
}
