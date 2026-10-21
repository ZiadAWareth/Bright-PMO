import { Module } from '@nestjs/common';
import { SavedReportController } from './savedreport.controller';
import { SavedReportService } from './savedreport.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [SavedReportController],
  providers: [SavedReportService],
})
export class SavedReportModule {}
