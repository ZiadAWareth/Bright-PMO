
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { UpdateTimesheetDto } from './dto/update-timesheet.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { TimesheetLogic } from '../shared/timesheet-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class TimesheetService {
  private readonly logic: TimesheetLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.timesheet);
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
    this.logic = new TimesheetLogic(repo, hooks);
  }

  async getAllTimesheets(params?: {
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
  async aggregateTimesheet(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getTimesheetById(id: number) {
    return this.logic.getById(id);
  }

  async createTimesheet(dto: CreateTimesheetDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateTimesheet(id: number, dto: UpdateTimesheetDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteTimesheet(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getUser(id: number) {
    return this.prisma.timesheet.findUnique({
      where: { id },
      include: { user: true } as Prisma.TimesheetInclude
    });
  }

  async getProject(id: number) {
    return this.prisma.timesheet.findUnique({
      where: { id },
      include: { project: true } as Prisma.TimesheetInclude
    });
  }

  async getUserApprovedBy(id: number) {
    return this.prisma.timesheet.findUnique({
      where: { id },
      include: { userApprovedBy: true } as Prisma.TimesheetInclude
    });
  }

  async getTimeEntrys(id: number) {
    return this.prisma.timesheet.findUnique({
      where: { id },
      include: { timeentrys: true } as Prisma.TimesheetInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.timesheet.findUnique({
      where: { id },
      include: { organization: true } as Prisma.TimesheetInclude
    });
  }

}
