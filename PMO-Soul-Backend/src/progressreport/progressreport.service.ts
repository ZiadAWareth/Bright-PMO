
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProgressReportDto } from './dto/create-progressreport.dto';
import { UpdateProgressReportDto } from './dto/update-progressreport.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { ProgressReportLogic } from '../shared/progressreport-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class ProgressReportService {
  private readonly logic: ProgressReportLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.progressReport);
    const hooks: EntityLifecycleHooks = {
      internal: {
        // PULSE is the engine: every entity event is dispatched to the pulse
        // runner. Fire-and-forget — a workflow failure must never fail the write.
        onEntityEvent: (entityName: string, event: string, data: any) => {
          this.workflowRunner.onEntityEvent(entityName, event, data).catch((err) =>
            console.error(`Workflow trigger failed:`, err),
          );
        },
      },
    };
    this.logic = new ProgressReportLogic(repo, hooks);
  }

  async getAllProgressReports(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    q?: string;
    filters?: any;
  }) {
    return this.logic.getAll(params);
  }

  /** One number for a dashboard card. All five folds, one call — see shared/aggregate.ts. */
  async aggregateProgressReport(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getProgressReportById(id: number) {
    return this.logic.getById(id);
  }

  async createProgressReport(dto: CreateProgressReportDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateProgressReport(id: number, dto: UpdateProgressReportDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteProgressReport(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getWorkItem(id: number) {
    return this.prisma.progressReport.findUnique({
      where: { id },
      include: { workitem: true } as Prisma.ProgressReportInclude
    });
  }

  async getResourceAssignment(id: number) {
    return this.prisma.progressReport.findUnique({
      where: { id },
      include: { resourceassignment: true } as Prisma.ProgressReportInclude
    });
  }

  async getUser(id: number) {
    return this.prisma.progressReport.findUnique({
      where: { id },
      include: { user: true } as Prisma.ProgressReportInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.progressReport.findUnique({
      where: { id },
      include: { organization: true } as Prisma.ProgressReportInclude
    });
  }

}
