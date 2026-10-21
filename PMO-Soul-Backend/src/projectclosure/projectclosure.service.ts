
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectClosureDto } from './dto/create-projectclosure.dto';
import { UpdateProjectClosureDto } from './dto/update-projectclosure.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { ProjectClosureLogic } from '../shared/projectclosure-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class ProjectClosureService {
  private readonly logic: ProjectClosureLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.projectClosure);
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
    this.logic = new ProjectClosureLogic(repo, hooks);
  }

  async getAllProjectClosures(params?: {
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
  async aggregateProjectClosure(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getProjectClosureById(id: number) {
    return this.logic.getById(id);
  }

  async createProjectClosure(dto: CreateProjectClosureDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateProjectClosure(id: number, dto: UpdateProjectClosureDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteProjectClosure(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getProject(id: number) {
    return this.prisma.projectClosure.findUnique({
      where: { id },
      include: { project: true } as Prisma.ProjectClosureInclude
    });
  }

  async getClosureItems(id: number) {
    return this.prisma.projectClosure.findUnique({
      where: { id },
      include: { closureitems: true } as Prisma.ProjectClosureInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.projectClosure.findUnique({
      where: { id },
      include: { organization: true } as Prisma.ProjectClosureInclude
    });
  }

}
