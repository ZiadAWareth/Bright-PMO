
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClosureTemplateDto } from './dto/create-closuretemplate.dto';
import { UpdateClosureTemplateDto } from './dto/update-closuretemplate.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { ClosureTemplateLogic } from '../shared/closuretemplate-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class ClosureTemplateService {
  private readonly logic: ClosureTemplateLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.closureTemplate);
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
    this.logic = new ClosureTemplateLogic(repo, hooks);
  }

  async getAllClosureTemplates(params?: {
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
  async aggregateClosureTemplate(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getClosureTemplateById(id: number) {
    return this.logic.getById(id);
  }

  async createClosureTemplate(dto: CreateClosureTemplateDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateClosureTemplate(id: number, dto: UpdateClosureTemplateDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteClosureTemplate(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getProjectCategorys(id: number) {
    return this.prisma.closureTemplate.findUnique({
      where: { id },
      include: { projectcategorys: true } as Prisma.ClosureTemplateInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.closureTemplate.findUnique({
      where: { id },
      include: { organization: true } as Prisma.ClosureTemplateInclude
    });
  }

  async getClosureTemplateItems(id: number) {
    return this.prisma.closureTemplate.findUnique({
      where: { id },
      include: { closuretemplateitems: true } as Prisma.ClosureTemplateInclude
    });
  }

}
