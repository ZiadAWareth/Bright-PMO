
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecurringWorkItemDto } from './dto/create-recurringworkitem.dto';
import { UpdateRecurringWorkItemDto } from './dto/update-recurringworkitem.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { RecurringWorkItemLogic } from '../shared/recurringworkitem-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class RecurringWorkItemService {
  private readonly logic: RecurringWorkItemLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.recurringWorkItem);
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
    this.logic = new RecurringWorkItemLogic(repo, hooks);
  }

  async getAllRecurringWorkItems(params?: {
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
  async aggregateRecurringWorkItem(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getRecurringWorkItemById(id: number) {
    return this.logic.getById(id);
  }

  async createRecurringWorkItem(dto: CreateRecurringWorkItemDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateRecurringWorkItem(id: number, dto: UpdateRecurringWorkItemDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteRecurringWorkItem(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getProject(id: number) {
    return this.prisma.recurringWorkItem.findUnique({
      where: { id },
      include: { project: true } as Prisma.RecurringWorkItemInclude
    });
  }

  async getWbsNode(id: number) {
    return this.prisma.recurringWorkItem.findUnique({
      where: { id },
      include: { wbsnode: true } as Prisma.RecurringWorkItemInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.recurringWorkItem.findUnique({
      where: { id },
      include: { organization: true } as Prisma.RecurringWorkItemInclude
    });
  }

}
