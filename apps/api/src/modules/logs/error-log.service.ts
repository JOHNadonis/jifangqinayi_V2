import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ErrorLogService {
  constructor(private prisma: PrismaService) {}

  async record(params: {
    userId?: string;
    username?: string;
    method: string;
    path: string;
    statusCode: number;
    message: string;
    stack?: string;
  }) {
    try {
      await this.prisma.errorLog.create({ data: params });
    } catch {
      // never break on log failure
    }
  }

  async findAll(params: { page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.errorLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.errorLog.count(),
    ]);

    return { data, total, page, pageSize };
  }
}
