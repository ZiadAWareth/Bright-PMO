
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectCategoryDto } from './dto/create-projectcategory.dto';
import { UpdateProjectCategoryDto } from './dto/update-projectcategory.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { ProjectCategoryLogic } from '../shared/projectcategory-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class ProjectCategoryService {
  private readonly logic: ProjectCategoryLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.projectCategory);
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
    this.logic = new ProjectCategoryLogic(repo, hooks);
  }

  async getAllProjectCategorys(params?: {
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
  async aggregateProjectCategory(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getProjectCategoryById(id: number) {
    return this.logic.getById(id);
  }

  async createProjectCategory(dto: CreateProjectCategoryDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateProjectCategory(id: number, dto: UpdateProjectCategoryDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteProjectCategory(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getLifecycleTemplate(id: number) {
    return this.prisma.projectCategory.findUnique({
      where: { id },
      include: { lifecycletemplate: true } as Prisma.ProjectCategoryInclude
    });
  }

  async getClosureTemplate(id: number) {
    return this.prisma.projectCategory.findUnique({
      where: { id },
      include: { closuretemplate: true } as Prisma.ProjectCategoryInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.projectCategory.findUnique({
      where: { id },
      include: { organization: true } as Prisma.ProjectCategoryInclude
    });
  }

  async getBenchmark(id: number) {
    return this.prisma.projectCategory.findUnique({
      where: { id },
      include: { benchmark: true } as Prisma.ProjectCategoryInclude
    });
  }

  async getProjects(id: number) {
    return this.prisma.projectCategory.findUnique({
      where: { id },
      include: { projects: true } as Prisma.ProjectCategoryInclude
    });
  }

}
