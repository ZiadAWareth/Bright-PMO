
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClosureTemplateItemDto } from './dto/create-closuretemplateitem.dto';
import { UpdateClosureTemplateItemDto } from './dto/update-closuretemplateitem.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { ClosureTemplateItemLogic } from '../shared/closuretemplateitem-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class ClosureTemplateItemService {
  private readonly logic: ClosureTemplateItemLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.closureTemplateItem);
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
    this.logic = new ClosureTemplateItemLogic(repo, hooks);
  }

  async getAllClosureTemplateItems(params?: {
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
  async aggregateClosureTemplateItem(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getClosureTemplateItemById(id: number) {
    return this.logic.getById(id);
  }

  async createClosureTemplateItem(dto: CreateClosureTemplateItemDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateClosureTemplateItem(id: number, dto: UpdateClosureTemplateItemDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteClosureTemplateItem(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getClosureTemplate(id: number) {
    return this.prisma.closureTemplateItem.findUnique({
      where: { id },
      include: { closuretemplate: true } as Prisma.ClosureTemplateItemInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.closureTemplateItem.findUnique({
      where: { id },
      include: { organization: true } as Prisma.ClosureTemplateItemInclude
    });
  }

}
