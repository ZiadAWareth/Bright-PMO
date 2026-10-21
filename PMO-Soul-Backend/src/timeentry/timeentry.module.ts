import { Module } from '@nestjs/common';
import { TimeEntryController } from './timeentry.controller';
import { TimeEntryService } from './timeentry.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [TimeEntryController],
  providers: [TimeEntryService],
})
export class TimeEntryModule {}
