
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLifecycleTemplateDto } from './dto/create-lifecycletemplate.dto';
import { UpdateLifecycleTemplateDto } from './dto/update-lifecycletemplate.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { LifecycleTemplateLogic } from '../shared/lifecycletemplate-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class LifecycleTemplateService {
  private readonly logic: LifecycleTemplateLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.lifecycleTemplate);
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
    this.logic = new LifecycleTemplateLogic(repo, hooks);
  }

  async getAllLifecycleTemplates(params?: {
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
  async aggregateLifecycleTemplate(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getLifecycleTemplateById(id: number) {
    return this.logic.getById(id);
  }

  async createLifecycleTemplate(dto: CreateLifecycleTemplateDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateLifecycleTemplate(id: number, dto: UpdateLifecycleTemplateDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteLifecycleTemplate(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getProjectCategorys(id: number) {
    return this.prisma.lifecycleTemplate.findUnique({
      where: { id },
      include: { projectcategorys: true } as Prisma.LifecycleTemplateInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.lifecycleTemplate.findUnique({
      where: { id },
      include: { organization: true } as Prisma.LifecycleTemplateInclude
    });
  }

  async getLifecycleTemplateSteps(id: number) {
    return this.prisma.lifecycleTemplate.findUnique({
      where: { id },
      include: { lifecycletemplatesteps: true } as Prisma.LifecycleTemplateInclude
    });
  }

}
