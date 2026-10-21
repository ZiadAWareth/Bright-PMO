
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWbsNodeDto } from './dto/create-wbsnode.dto';
import { UpdateWbsNodeDto } from './dto/update-wbsnode.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { WbsNodeLogic } from '../shared/wbsnode-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class WbsNodeService {
  private readonly logic: WbsNodeLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.wbsNode);
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
    this.logic = new WbsNodeLogic(repo, hooks);
  }

  async getAllWbsNodes(params?: {
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
  async aggregateWbsNode(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getWbsNodeById(id: number) {
    return this.logic.getById(id);
  }

  async createWbsNode(dto: CreateWbsNodeDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateWbsNode(id: number, dto: UpdateWbsNodeDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteWbsNode(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getWorkItems(id: number) {
    return this.prisma.wbsNode.findUnique({
      where: { id },
      include: { workitems: true } as Prisma.WbsNodeInclude
    });
  }

  async getRecurringWorkItems(id: number) {
    return this.prisma.wbsNode.findUnique({
      where: { id },
      include: { recurringworkitems: true } as Prisma.WbsNodeInclude
    });
  }

  async getProject(id: number) {
    return this.prisma.wbsNode.findUnique({
      where: { id },
      include: { project: true } as Prisma.WbsNodeInclude
    });
  }

  async getWbsNode(id: number) {
    return this.prisma.wbsNode.findUnique({
      where: { id },
      include: { wbsnode: true } as Prisma.WbsNodeInclude
    });
  }

  async getWbsNodes(id: number) {
    return this.prisma.wbsNode.findUnique({
      where: { id },
      include: { wbsnodes: true } as Prisma.WbsNodeInclude
    });
  }

  async getSprints(id: number) {
    return this.prisma.wbsNode.findUnique({
      where: { id },
      include: { sprints: true } as Prisma.WbsNodeInclude
    });
  }

  async getBudgetLines(id: number) {
    return this.prisma.wbsNode.findUnique({
      where: { id },
      include: { budgetlines: true } as Prisma.WbsNodeInclude
    });
  }

  async getProcurements(id: number) {
    return this.prisma.wbsNode.findUnique({
      where: { id },
      include: { procurements: true } as Prisma.WbsNodeInclude
    });
  }

  async getDocuments(id: number) {
    return this.prisma.wbsNode.findUnique({
      where: { id },
      include: { documents: true } as Prisma.WbsNodeInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.wbsNode.findUnique({
      where: { id },
      include: { organization: true } as Prisma.WbsNodeInclude
    });
  }

}
