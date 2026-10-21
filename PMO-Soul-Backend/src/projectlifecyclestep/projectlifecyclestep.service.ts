
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectLifecycleStepDto } from './dto/create-projectlifecyclestep.dto';
import { UpdateProjectLifecycleStepDto } from './dto/update-projectlifecyclestep.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { ProjectLifecycleStepLogic } from '../shared/projectlifecyclestep-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class ProjectLifecycleStepService {
  private readonly logic: ProjectLifecycleStepLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.projectLifecycleStep);
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
    this.logic = new ProjectLifecycleStepLogic(repo, hooks);
  }

  async getAllProjectLifecycleSteps(params?: {
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
  async aggregateProjectLifecycleStep(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getProjectLifecycleStepById(id: number) {
    return this.logic.getById(id);
  }

  async createProjectLifecycleStep(dto: CreateProjectLifecycleStepDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateProjectLifecycleStep(id: number, dto: UpdateProjectLifecycleStepDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteProjectLifecycleStep(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getProject(id: number) {
    return this.prisma.projectLifecycleStep.findUnique({
      where: { id },
      include: { project: true } as Prisma.ProjectLifecycleStepInclude
    });
  }

  async getUser(id: number) {
    return this.prisma.projectLifecycleStep.findUnique({
      where: { id },
      include: { user: true } as Prisma.ProjectLifecycleStepInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.projectLifecycleStep.findUnique({
      where: { id },
      include: { organization: true } as Prisma.ProjectLifecycleStepInclude
    });
  }

}
