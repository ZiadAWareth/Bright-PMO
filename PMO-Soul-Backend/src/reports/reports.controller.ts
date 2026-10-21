import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../guards/auth.guard';
import { ReportEngineService } from './reports.engine.service';
import { SavedReportService, Principal } from './saved-report.service';

@UseGuards(AuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly engine: ReportEngineService,
    private readonly saved: SavedReportService,
  ) {}

  private principal(req: any): Principal {
    return {
      userId: req.userId,
      userRoleId: req.userRoleId,
      isPlatformAdmin: !!req.isPlatformAdmin,
    };
  }

  // ── Report builder: schema introspection + generation ──
  @Post('tables')
  tables() {
    return this.engine.tables();
  }

  @Post('columns')
  columns(@Body() body: { tableName?: string }) {
    return this.engine.columns(body);
  }

  @Post('relationships')
  relationships(@Body() body: { tableName?: string }) {
    return this.engine.relationships(body);
  }

  @Post('preview')
  async preview(@Body() body: any, @Res() res: Response) {
    const result = await this.engine.preview(body);
    const ext =
      result.extension || (body?.reportType === 'excel' ? 'xlsx' : 'pdf');
    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${body?.primaryTable || 'report'}_report.${ext}"`,
    );
    res.end(result.buffer);
  }

  // ── Saved reports for the current user (role-filtered) ──
  @Get('saved/mine')
  mine(@Req() req: any) {
    return this.saved.listForRole(this.principal(req));
  }

  @Get('saved/:id/download')
  async download(
    @Req() req: any,
    @Param('id') id: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const fmt: 'pdf' | 'xlsx' = format === 'pdf' ? 'pdf' : 'xlsx';
    const result = await this.saved.download(Number(id), fmt, this.principal(req));
    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.end(result.buffer);
  }
}
