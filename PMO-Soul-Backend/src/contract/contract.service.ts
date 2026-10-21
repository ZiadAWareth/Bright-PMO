
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { ContractLogic } from '../shared/contract-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class ContractService {
  private readonly logic: ContractLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.contract);
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
    this.logic = new ContractLogic(repo, hooks);
  }

  async getAllContracts(params?: {
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
  async aggregateContract(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getContractById(id: number) {
    return this.logic.getById(id);
  }

  async createContract(dto: CreateContractDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateContract(id: number, dto: UpdateContractDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteContract(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getProcurement(id: number) {
    return this.prisma.contract.findUnique({
      where: { id },
      include: { procurement: true } as Prisma.ContractInclude
    });
  }

  async getVendor(id: number) {
    return this.prisma.contract.findUnique({
      where: { id },
      include: { vendor: true } as Prisma.ContractInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.contract.findUnique({
      where: { id },
      include: { organization: true } as Prisma.ContractInclude
    });
  }

}
