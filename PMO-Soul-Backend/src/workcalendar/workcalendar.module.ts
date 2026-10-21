import { Module } from '@nestjs/common';
import { WorkCalendarController } from './workcalendar.controller';
import { WorkCalendarService } from './workcalendar.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [WorkCalendarController],
  providers: [WorkCalendarService],
})
export class WorkCalendarModule {}
