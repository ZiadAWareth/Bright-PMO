import { Module } from '@nestjs/common';
import { ActivityLogController } from './activitylog.controller';
import { ActivityLogService } from './activitylog.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [ActivityLogController],
  providers: [ActivityLogService],
})
export class ActivityLogModule {}
