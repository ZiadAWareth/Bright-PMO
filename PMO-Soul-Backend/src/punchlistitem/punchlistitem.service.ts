
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePunchListItemDto } from './dto/create-punchlistitem.dto';
import { UpdatePunchListItemDto } from './dto/update-punchlistitem.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { PunchListItemLogic } from '../shared/punchlistitem-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class PunchListItemService {
  private readonly logic: PunchListItemLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.punchListItem);
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
    this.logic = new PunchListItemLogic(repo, hooks);
  }

  async getAllPunchListItems(params?: {
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
  async aggregatePunchListItem(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getPunchListItemById(id: number) {
    return this.logic.getById(id);
  }

  async createPunchListItem(dto: CreatePunchListItemDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updatePunchListItem(id: number, dto: UpdatePunchListItemDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deletePunchListItem(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getProject(id: number) {
    return this.prisma.punchListItem.findUnique({
      where: { id },
      include: { project: true } as Prisma.PunchListItemInclude
    });
  }

  async getUser(id: number) {
    return this.prisma.punchListItem.findUnique({
      where: { id },
      include: { user: true } as Prisma.PunchListItemInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.punchListItem.findUnique({
      where: { id },
      include: { organization: true } as Prisma.PunchListItemInclude
    });
  }

}
