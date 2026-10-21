
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClosureItemDto } from './dto/create-closureitem.dto';
import { UpdateClosureItemDto } from './dto/update-closureitem.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { ClosureItemLogic } from '../shared/closureitem-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class ClosureItemService {
  private readonly logic: ClosureItemLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.closureItem);
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
    this.logic = new ClosureItemLogic(repo, hooks);
  }

  async getAllClosureItems(params?: {
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
  async aggregateClosureItem(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getClosureItemById(id: number) {
    return this.logic.getById(id);
  }

  async createClosureItem(dto: CreateClosureItemDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateClosureItem(id: number, dto: UpdateClosureItemDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteClosureItem(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getProjectClosure(id: number) {
    return this.prisma.closureItem.findUnique({
      where: { id },
      include: { projectclosure: true } as Prisma.ClosureItemInclude
    });
  }

  async getDocument(id: number) {
    return this.prisma.closureItem.findUnique({
      where: { id },
      include: { document: true } as Prisma.ClosureItemInclude
    });
  }

  async getUser(id: number) {
    return this.prisma.closureItem.findUnique({
      where: { id },
      include: { user: true } as Prisma.ClosureItemInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.closureItem.findUnique({
      where: { id },
      include: { organization: true } as Prisma.ClosureItemInclude
    });
  }

}
