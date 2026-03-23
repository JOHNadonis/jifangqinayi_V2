import { Module } from '@nestjs/common';
import { RacksService } from './racks.service';
import { RacksController } from './racks.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [PrismaModule, LogsModule],
  providers: [RacksService],
  controllers: [RacksController],
  exports: [RacksService],
})
export class RacksModule {}
