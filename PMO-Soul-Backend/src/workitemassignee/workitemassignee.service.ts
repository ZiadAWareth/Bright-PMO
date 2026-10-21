
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkItemAssigneeDto } from './dto/create-workitemassignee.dto';
import { UpdateWorkItemAssigneeDto } from './dto/update-workitemassignee.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { WorkItemAssigneeLogic } from '../shared/workitemassignee-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class WorkItemAssigneeService {
  private readonly logic: WorkItemAssigneeLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.workItemAssignee);
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
    this.logic = new WorkItemAssigneeLogic(repo, hooks);
  }

  async getAllWorkItemAssignees(params?: {
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
  async aggregateWorkItemAssignee(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getWorkItemAssigneeById(id: number) {
    return this.logic.getById(id);
  }

  async createWorkItemAssignee(dto: CreateWorkItemAssigneeDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateWorkItemAssignee(id: number, dto: UpdateWorkItemAssigneeDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteWorkItemAssignee(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getWorkItem(id: number) {
    return this.prisma.workItemAssignee.findUnique({
      where: { id },
      include: { workitem: true } as Prisma.WorkItemAssigneeInclude
    });
  }

  async getUser(id: number) {
    return this.prisma.workItemAssignee.findUnique({
      where: { id },
      include: { user: true } as Prisma.WorkItemAssigneeInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.workItemAssignee.findUnique({
      where: { id },
      include: { organization: true } as Prisma.WorkItemAssigneeInclude
    });
  }

}
