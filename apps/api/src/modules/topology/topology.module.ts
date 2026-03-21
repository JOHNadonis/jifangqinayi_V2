import { Module } from '@nestjs/common';
import { TopologyService } from './topology.service';
import { TopologyController } from './topology.controller';

@Module({
  providers: [TopologyService],
  controllers: [TopologyController],
  exports: [TopologyService],
})
export class TopologyModule {}
