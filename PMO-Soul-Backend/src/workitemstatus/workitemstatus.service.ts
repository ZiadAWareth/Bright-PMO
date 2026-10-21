
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkItemStatusDto } from './dto/create-workitemstatus.dto';
import { UpdateWorkItemStatusDto } from './dto/update-workitemstatus.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { WorkItemStatusLogic } from '../shared/workitemstatus-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class WorkItemStatusService {
  private readonly logic: WorkItemStatusLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.workItemStatus);
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
    this.logic = new WorkItemStatusLogic(repo, hooks);
  }

  async getAllWorkItemStatuss(params?: {
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
  async aggregateWorkItemStatus(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getWorkItemStatusById(id: number) {
    return this.logic.getById(id);
  }

  async createWorkItemStatus(dto: CreateWorkItemStatusDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateWorkItemStatus(id: number, dto: UpdateWorkItemStatusDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteWorkItemStatus(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getProject(id: number) {
    return this.prisma.workItemStatus.findUnique({
      where: { id },
      include: { project: true } as Prisma.WorkItemStatusInclude
    });
  }

  async getWorkItems(id: number) {
    return this.prisma.workItemStatus.findUnique({
      where: { id },
      include: { workitems: true } as Prisma.WorkItemStatusInclude
    });
  }

  async getStatusTransitions(id: number) {
    return this.prisma.workItemStatus.findUnique({
      where: { id },
      include: { statustransitions: true } as Prisma.WorkItemStatusInclude
    });
  }

  async getStatustransitionsToStatus(id: number) {
    return this.prisma.workItemStatus.findUnique({
      where: { id },
      include: { statustransitionsToStatus: true } as Prisma.WorkItemStatusInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.workItemStatus.findUnique({
      where: { id },
      include: { organization: true } as Prisma.WorkItemStatusInclude
    });
  }

}
