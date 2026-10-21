
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimeEntryDto } from './dto/create-timeentry.dto';
import { UpdateTimeEntryDto } from './dto/update-timeentry.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { TimeEntryLogic } from '../shared/timeentry-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class TimeEntryService {
  private readonly logic: TimeEntryLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.timeEntry);
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
    this.logic = new TimeEntryLogic(repo, hooks);
  }

  async getAllTimeEntrys(params?: {
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
  async aggregateTimeEntry(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getTimeEntryById(id: number) {
    return this.logic.getById(id);
  }

  async createTimeEntry(dto: CreateTimeEntryDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateTimeEntry(id: number, dto: UpdateTimeEntryDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteTimeEntry(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getUser(id: number) {
    return this.prisma.timeEntry.findUnique({
      where: { id },
      include: { user: true } as Prisma.TimeEntryInclude
    });
  }

  async getProject(id: number) {
    return this.prisma.timeEntry.findUnique({
      where: { id },
      include: { project: true } as Prisma.TimeEntryInclude
    });
  }

  async getWorkItem(id: number) {
    return this.prisma.timeEntry.findUnique({
      where: { id },
      include: { workitem: true } as Prisma.TimeEntryInclude
    });
  }

  async getTimesheet(id: number) {
    return this.prisma.timeEntry.findUnique({
      where: { id },
      include: { timesheet: true } as Prisma.TimeEntryInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.timeEntry.findUnique({
      where: { id },
      include: { organization: true } as Prisma.TimeEntryInclude
    });
  }

}
