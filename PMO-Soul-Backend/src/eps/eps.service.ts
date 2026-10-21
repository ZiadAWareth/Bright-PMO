
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEpsDto } from './dto/create-eps.dto';
import { UpdateEpsDto } from './dto/update-eps.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { EpsLogic } from '../shared/eps-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class EpsService {
  private readonly logic: EpsLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.eps);
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
    this.logic = new EpsLogic(repo, hooks);
  }

  async getAllEpss(params?: {
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
  async aggregateEps(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getEpsById(id: number) {
    return this.logic.getById(id);
  }

  async createEps(dto: CreateEpsDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateEps(id: number, dto: UpdateEpsDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteEps(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getEps(id: number) {
    return this.prisma.eps.findUnique({
      where: { id },
      include: { eps: true } as Prisma.EpsInclude
    });
  }

  async getEpss(id: number) {
    return this.prisma.eps.findUnique({
      where: { id },
      include: { epss: true } as Prisma.EpsInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.eps.findUnique({
      where: { id },
      include: { organization: true } as Prisma.EpsInclude
    });
  }

  async getProjects(id: number) {
    return this.prisma.eps.findUnique({
      where: { id },
      include: { projects: true } as Prisma.EpsInclude
    });
  }

}
