
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLifecycleTemplateStepDto } from './dto/create-lifecycletemplatestep.dto';
import { UpdateLifecycleTemplateStepDto } from './dto/update-lifecycletemplatestep.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { LifecycleTemplateStepLogic } from '../shared/lifecycletemplatestep-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class LifecycleTemplateStepService {
  private readonly logic: LifecycleTemplateStepLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.lifecycleTemplateStep);
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
    this.logic = new LifecycleTemplateStepLogic(repo, hooks);
  }

  async getAllLifecycleTemplateSteps(params?: {
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
  async aggregateLifecycleTemplateStep(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getLifecycleTemplateStepById(id: number) {
    return this.logic.getById(id);
  }

  async createLifecycleTemplateStep(dto: CreateLifecycleTemplateStepDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateLifecycleTemplateStep(id: number, dto: UpdateLifecycleTemplateStepDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteLifecycleTemplateStep(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getLifecycleTemplate(id: number) {
    return this.prisma.lifecycleTemplateStep.findUnique({
      where: { id },
      include: { lifecycletemplate: true } as Prisma.LifecycleTemplateStepInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.lifecycleTemplateStep.findUnique({
      where: { id },
      include: { organization: true } as Prisma.LifecycleTemplateStepInclude
    });
  }

}
