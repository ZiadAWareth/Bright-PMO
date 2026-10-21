import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportEngineService } from './reports.engine.service';

export interface Principal {
  userId?: number;
  userRoleId?: number;
  isPlatformAdmin?: boolean;
}

/**
 * Reads the SavedReport table for the role-filtered consumer + role-gated
 * downloads. Organization isolation is enforced automatically by the Prisma
 * tenant middleware; this layer adds APP-LEVEL role scoping via allowedRoleIds.
 */
@Injectable()
export class SavedReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: ReportEngineService,
  ) {}

  private get repo(): any {
    return (this.prisma as any).savedReport;
  }

  /** Active reports the caller's role is allowed to run (platform admin sees all). */
  async listForRole(principal: Principal) {
    const all = await this.repo.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    if (principal.isPlatformAdmin) return all;
    const roleId = principal.userRoleId;
    return all.filter(
      (r: any) =>
        Array.isArray(r.allowedRoleIds) &&
        roleId != null &&
        r.allowedRoleIds.includes(roleId),
    );
  }

  private canAccess(report: any, principal: Principal): boolean {
    if (principal.isPlatformAdmin) return true;
    return (
      Array.isArray(report.allowedRoleIds) &&
      principal.userRoleId != null &&
      report.allowedRoleIds.includes(principal.userRoleId)
    );
  }

  async download(id: number, format: 'xlsx' | 'pdf', principal: Principal) {
    const report = await this.repo.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
    if (!principal.isPlatformAdmin && !report.isActive) {
      throw new ForbiddenException('This report is not active');
    }
    if (!this.canAccess(report, principal)) {
      throw new ForbiddenException('You do not have access to this report');
    }

    const def = report.definition as any;
    if (!def || !def.primaryTable) {
      throw new BadRequestException('Report definition is invalid');
    }
    const requestBody = { ...def, reportType: format === 'pdf' ? 'pdf' : 'excel' };
    const result = await this.engine.preview(requestBody);
    const slug =
      (report.name || 'report')
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'report';
    return {
      buffer: result.buffer,
      contentType: result.contentType,
      filename: `${slug}.${result.extension || (format === 'pdf' ? 'pdf' : 'xlsx')}`,
    };
  }
}
