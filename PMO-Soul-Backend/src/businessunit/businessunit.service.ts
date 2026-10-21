
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessUnitDto } from './dto/create-businessunit.dto';
import { UpdateBusinessUnitDto } from './dto/update-businessunit.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { BusinessUnitLogic } from '../shared/businessunit-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class BusinessUnitService {
  private readonly logic: BusinessUnitLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.businessUnit);
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
    this.logic = new BusinessUnitLogic(repo, hooks);
  }

  async getAllBusinessUnits(params?: {
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
  async aggregateBusinessUnit(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getBusinessUnitById(id: number) {
    return this.logic.getById(id);
  }

  async createBusinessUnit(dto: CreateBusinessUnitDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateBusinessUnit(id: number, dto: UpdateBusinessUnitDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteBusinessUnit(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getOrganization(id: number) {
    return this.prisma.businessUnit.findUnique({
      where: { id },
      include: { organization: true } as Prisma.BusinessUnitInclude
    });
  }

  async getUsers(id: number) {
    return this.prisma.businessUnit.findUnique({
      where: { id },
      include: { users: true } as Prisma.BusinessUnitInclude
    });
  }

}
