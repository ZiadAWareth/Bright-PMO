import { Module } from '@nestjs/common';
import { CalendarExceptionController } from './calendarexception.controller';
import { CalendarExceptionService } from './calendarexception.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [CalendarExceptionController],
  providers: [CalendarExceptionService],
})
export class CalendarExceptionModule {}
