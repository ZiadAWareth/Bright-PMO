import { Module } from '@nestjs/common';
import { SprintSnapshotController } from './sprintsnapshot.controller';
import { SprintSnapshotService } from './sprintsnapshot.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [SprintSnapshotController],
  providers: [SprintSnapshotService],
})
export class SprintSnapshotModule {}
