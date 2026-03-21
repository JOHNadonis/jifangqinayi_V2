import { Module } from '@nestjs/common';
import { RacksService } from './racks.service';
import { RacksController } from './racks.controller';

@Module({
  providers: [RacksService],
  controllers: [RacksController],
  exports: [RacksService],
})
export class RacksModule {}
