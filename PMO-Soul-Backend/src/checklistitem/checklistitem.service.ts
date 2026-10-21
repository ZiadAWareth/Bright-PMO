
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChecklistItemDto } from './dto/create-checklistitem.dto';
import { UpdateChecklistItemDto } from './dto/update-checklistitem.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { ChecklistItemLogic } from '../shared/checklistitem-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class ChecklistItemService {
  private readonly logic: ChecklistItemLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.checklistItem);
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
    this.logic = new ChecklistItemLogic(repo, hooks);
  }

  async getAllChecklistItems(params?: {
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
  async aggregateChecklistItem(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getChecklistItemById(id: number) {
    return this.logic.getById(id);
  }

  async createChecklistItem(dto: CreateChecklistItemDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateChecklistItem(id: number, dto: UpdateChecklistItemDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteChecklistItem(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getChecklist(id: number) {
    return this.prisma.checklistItem.findUnique({
      where: { id },
      include: { checklist: true } as Prisma.ChecklistItemInclude
    });
  }

  async getUser(id: number) {
    return this.prisma.checklistItem.findUnique({
      where: { id },
      include: { user: true } as Prisma.ChecklistItemInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.checklistItem.findUnique({
      where: { id },
      include: { organization: true } as Prisma.ChecklistItemInclude
    });
  }

}
