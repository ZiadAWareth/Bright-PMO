
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRiskMitigationDto } from './dto/create-riskmitigation.dto';
import { UpdateRiskMitigationDto } from './dto/update-riskmitigation.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { RiskMitigationLogic } from '../shared/riskmitigation-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class RiskMitigationService {
  private readonly logic: RiskMitigationLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.riskMitigation);
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
    this.logic = new RiskMitigationLogic(repo, hooks);
  }

  async getAllRiskMitigations(params?: {
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
  async aggregateRiskMitigation(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getRiskMitigationById(id: number) {
    return this.logic.getById(id);
  }

  async createRiskMitigation(dto: CreateRiskMitigationDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateRiskMitigation(id: number, dto: UpdateRiskMitigationDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteRiskMitigation(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getRisk(id: number) {
    return this.prisma.riskMitigation.findUnique({
      where: { id },
      include: { risk: true } as Prisma.RiskMitigationInclude
    });
  }

  async getWorkItem(id: number) {
    return this.prisma.riskMitigation.findUnique({
      where: { id },
      include: { workitem: true } as Prisma.RiskMitigationInclude
    });
  }

  async getUser(id: number) {
    return this.prisma.riskMitigation.findUnique({
      where: { id },
      include: { user: true } as Prisma.RiskMitigationInclude
    });
  }

  async getUserAssignee(id: number) {
    return this.prisma.riskMitigation.findUnique({
      where: { id },
      include: { userAssignee: true } as Prisma.RiskMitigationInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.riskMitigation.findUnique({
      where: { id },
      include: { organization: true } as Prisma.RiskMitigationInclude
    });
  }

}
