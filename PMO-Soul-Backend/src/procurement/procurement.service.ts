
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProcurementDto } from './dto/create-procurement.dto';
import { UpdateProcurementDto } from './dto/update-procurement.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { ProcurementLogic } from '../shared/procurement-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class ProcurementService {
  private readonly logic: ProcurementLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.procurement);
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
    this.logic = new ProcurementLogic(repo, hooks);
  }

  async getAllProcurements(params?: {
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
  async aggregateProcurement(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getProcurementById(id: number) {
    return this.logic.getById(id);
  }

  async createProcurement(dto: CreateProcurementDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateProcurement(id: number, dto: UpdateProcurementDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteProcurement(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getProject(id: number) {
    return this.prisma.procurement.findUnique({
      where: { id },
      include: { project: true } as Prisma.ProcurementInclude
    });
  }

  async getWbsNode(id: number) {
    return this.prisma.procurement.findUnique({
      where: { id },
      include: { wbsnode: true } as Prisma.ProcurementInclude
    });
  }

  async getRfqResponses(id: number) {
    return this.prisma.procurement.findUnique({
      where: { id },
      include: { rfqresponses: true } as Prisma.ProcurementInclude
    });
  }

  async getContracts(id: number) {
    return this.prisma.procurement.findUnique({
      where: { id },
      include: { contracts: true } as Prisma.ProcurementInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.procurement.findUnique({
      where: { id },
      include: { organization: true } as Prisma.ProcurementInclude
    });
  }

}
