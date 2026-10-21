
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkItemDependencyDto } from './dto/create-workitemdependency.dto';
import { UpdateWorkItemDependencyDto } from './dto/update-workitemdependency.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { WorkItemDependencyLogic } from '../shared/workitemdependency-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class WorkItemDependencyService {
  private readonly logic: WorkItemDependencyLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.workItemDependency);
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
    this.logic = new WorkItemDependencyLogic(repo, hooks);
  }

  async getAllWorkItemDependencys(params?: {
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
  async aggregateWorkItemDependency(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getWorkItemDependencyById(id: number) {
    return this.logic.getById(id);
  }

  async createWorkItemDependency(dto: CreateWorkItemDependencyDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateWorkItemDependency(id: number, dto: UpdateWorkItemDependencyDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteWorkItemDependency(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getWorkItem(id: number) {
    return this.prisma.workItemDependency.findUnique({
      where: { id },
      include: { workitem: true } as Prisma.WorkItemDependencyInclude
    });
  }

  async getWorkitemSuccessor(id: number) {
    return this.prisma.workItemDependency.findUnique({
      where: { id },
      include: { workitemSuccessor: true } as Prisma.WorkItemDependencyInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.workItemDependency.findUnique({
      where: { id },
      include: { organization: true } as Prisma.WorkItemDependencyInclude
    });
  }

}
