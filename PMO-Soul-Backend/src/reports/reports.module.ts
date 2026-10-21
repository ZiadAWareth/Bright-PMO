import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportsController } from './reports.controller';
import { ReportEngineService } from './reports.engine.service';
import { SavedReportService } from './saved-report.service';

/**
 * Reporting: an engine proxy (schema introspection + PDF/XLSX generation) and a
 * role-filtered consumer over the SavedReport model. Generic SavedReport CRUD is
 * still served by its own generated module at /api/savedreport.
 */
@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [ReportEngineService, SavedReportService],
  exports: [ReportEngineService, SavedReportService],
})
export class ReportsModule {}
