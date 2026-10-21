import { Module } from '@nestjs/common';
import { EvmSnapshotController } from './evmsnapshot.controller';
import { EvmSnapshotService } from './evmsnapshot.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [EvmSnapshotController],
  providers: [EvmSnapshotService],
})
export class EvmSnapshotModule {}
