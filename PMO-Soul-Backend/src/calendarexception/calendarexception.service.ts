
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCalendarExceptionDto } from './dto/create-calendarexception.dto';
import { UpdateCalendarExceptionDto } from './dto/update-calendarexception.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { CalendarExceptionLogic } from '../shared/calendarexception-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class CalendarExceptionService {
  private readonly logic: CalendarExceptionLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.calendarException);
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
    this.logic = new CalendarExceptionLogic(repo, hooks);
  }

  async getAllCalendarExceptions(params?: {
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
  async aggregateCalendarException(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getCalendarExceptionById(id: number) {
    return this.logic.getById(id);
  }

  async createCalendarException(dto: CreateCalendarExceptionDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateCalendarException(id: number, dto: UpdateCalendarExceptionDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteCalendarException(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getWorkCalendar(id: number) {
    return this.prisma.calendarException.findUnique({
      where: { id },
      include: { workcalendar: true } as Prisma.CalendarExceptionInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.calendarException.findUnique({
      where: { id },
      include: { organization: true } as Prisma.CalendarExceptionInclude
    });
  }

}
