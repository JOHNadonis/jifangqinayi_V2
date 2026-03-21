import { Module } from '@nestjs/common';
import { CablesService } from './cables.service';
import { CablesController } from './cables.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CablesController],
  providers: [CablesService],
  exports: [CablesService],
})
export class CablesModule {}
