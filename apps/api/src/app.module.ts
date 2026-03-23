import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { RacksModule } from './modules/racks/racks.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { DevicesModule } from './modules/devices/devices.module';
import { CablesModule } from './modules/cables/cables.module';
import { TopologyModule } from './modules/topology/topology.module';
import { ExportModule } from './modules/export/export.module';
import { ImportModule } from './modules/import/import.module';
import { SyncModule } from './modules/sync/sync.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { LogsModule } from './modules/logs/logs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    RoomsModule,
    RacksModule,
    TemplatesModule,
    DevicesModule,
    CablesModule,
    TopologyModule,
    ExportModule,
    ImportModule,
    SyncModule,
    DashboardModule,
    LogsModule,
  ],
})
export class AppModule {}
