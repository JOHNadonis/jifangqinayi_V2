import { Module } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { ErrorLogService } from './error-log.service';
import { LogsController } from './logs.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ActivityLogService, ErrorLogService],
  controllers: [LogsController],
  exports: [ActivityLogService, ErrorLogService],
})
export class LogsModule {}
