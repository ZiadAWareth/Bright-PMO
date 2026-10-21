
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityLogDto } from './dto/create-activitylog.dto';
import { UpdateActivityLogDto } from './dto/update-activitylog.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { ActivityLogLogic } from '../shared/activitylog-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class ActivityLogService {
  private readonly logic: ActivityLogLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.activityLog);
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
    this.logic = new ActivityLogLogic(repo, hooks);
  }

  async getAllActivityLogs(params?: {
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
  async aggregateActivityLog(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getActivityLogById(id: number) {
    return this.logic.getById(id);
  }

  async createActivityLog(dto: CreateActivityLogDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateActivityLog(id: number, dto: UpdateActivityLogDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteActivityLog(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getUser(id: number) {
    return this.prisma.activityLog.findUnique({
      where: { id },
      include: { user: true } as Prisma.ActivityLogInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.activityLog.findUnique({
      where: { id },
      include: { organization: true } as Prisma.ActivityLogInclude
    });
  }

}
