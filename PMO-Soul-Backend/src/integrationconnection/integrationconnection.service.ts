
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIntegrationConnectionDto } from './dto/create-integrationconnection.dto';
import { UpdateIntegrationConnectionDto } from './dto/update-integrationconnection.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { IntegrationConnectionLogic } from '../shared/integrationconnection-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class IntegrationConnectionService {
  private readonly logic: IntegrationConnectionLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.integrationConnection);
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
    this.logic = new IntegrationConnectionLogic(repo, hooks);
  }

  async getAllIntegrationConnections(params?: {
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
  async aggregateIntegrationConnection(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getIntegrationConnectionById(id: number) {
    return this.logic.getById(id);
  }

  async createIntegrationConnection(dto: CreateIntegrationConnectionDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateIntegrationConnection(id: number, dto: UpdateIntegrationConnectionDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteIntegrationConnection(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getOrganization(id: number) {
    return this.prisma.integrationConnection.findUnique({
      where: { id },
      include: { organization: true } as Prisma.IntegrationConnectionInclude
    });
  }

}
