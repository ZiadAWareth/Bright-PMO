
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetLineDto } from './dto/create-budgetline.dto';
import { UpdateBudgetLineDto } from './dto/update-budgetline.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { BudgetLineLogic } from '../shared/budgetline-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class BudgetLineService {
  private readonly logic: BudgetLineLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.budgetLine);
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
    this.logic = new BudgetLineLogic(repo, hooks);
  }

  async getAllBudgetLines(params?: {
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
  async aggregateBudgetLine(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getBudgetLineById(id: number) {
    return this.logic.getById(id);
  }

  async createBudgetLine(dto: CreateBudgetLineDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateBudgetLine(id: number, dto: UpdateBudgetLineDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteBudgetLine(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getProject(id: number) {
    return this.prisma.budgetLine.findUnique({
      where: { id },
      include: { project: true } as Prisma.BudgetLineInclude
    });
  }

  async getWbsNode(id: number) {
    return this.prisma.budgetLine.findUnique({
      where: { id },
      include: { wbsnode: true } as Prisma.BudgetLineInclude
    });
  }

  async getWorkItem(id: number) {
    return this.prisma.budgetLine.findUnique({
      where: { id },
      include: { workitem: true } as Prisma.BudgetLineInclude
    });
  }

  async getCostTransactions(id: number) {
    return this.prisma.budgetLine.findUnique({
      where: { id },
      include: { costtransactions: true } as Prisma.BudgetLineInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.budgetLine.findUnique({
      where: { id },
      include: { organization: true } as Prisma.BudgetLineInclude
    });
  }

}
