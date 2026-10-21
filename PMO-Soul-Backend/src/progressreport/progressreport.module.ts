import { Module } from '@nestjs/common';
import { ProgressReportController } from './progressreport.controller';
import { ProgressReportService } from './progressreport.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [ProgressReportController],
  providers: [ProgressReportService],
})
export class ProgressReportModule {}
