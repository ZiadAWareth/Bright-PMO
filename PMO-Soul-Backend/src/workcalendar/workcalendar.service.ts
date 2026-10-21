
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkCalendarDto } from './dto/create-workcalendar.dto';
import { UpdateWorkCalendarDto } from './dto/update-workcalendar.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { WorkCalendarLogic } from '../shared/workcalendar-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class WorkCalendarService {
  private readonly logic: WorkCalendarLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.workCalendar);
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
    this.logic = new WorkCalendarLogic(repo, hooks);
  }

  async getAllWorkCalendars(params?: {
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
  async aggregateWorkCalendar(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getWorkCalendarById(id: number) {
    return this.logic.getById(id);
  }

  async createWorkCalendar(dto: CreateWorkCalendarDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateWorkCalendar(id: number, dto: UpdateWorkCalendarDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteWorkCalendar(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getOrganization(id: number) {
    return this.prisma.workCalendar.findUnique({
      where: { id },
      include: { organization: true } as Prisma.WorkCalendarInclude
    });
  }

  async getCalendarExceptions(id: number) {
    return this.prisma.workCalendar.findUnique({
      where: { id },
      include: { calendarexceptions: true } as Prisma.WorkCalendarInclude
    });
  }

  async getProjects(id: number) {
    return this.prisma.workCalendar.findUnique({
      where: { id },
      include: { projects: true } as Prisma.WorkCalendarInclude
    });
  }

}
