
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectConflictDto } from './dto/create-projectconflict.dto';
import { UpdateProjectConflictDto } from './dto/update-projectconflict.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { ProjectConflictLogic } from '../shared/projectconflict-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class ProjectConflictService {
  private readonly logic: ProjectConflictLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.projectConflict);
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
    this.logic = new ProjectConflictLogic(repo, hooks);
  }

  async getAllProjectConflicts(params?: {
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
  async aggregateProjectConflict(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getProjectConflictById(id: number) {
    return this.logic.getById(id);
  }

  async createProjectConflict(dto: CreateProjectConflictDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateProjectConflict(id: number, dto: UpdateProjectConflictDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteProjectConflict(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getProject(id: number) {
    return this.prisma.projectConflict.findUnique({
      where: { id },
      include: { project: true } as Prisma.ProjectConflictInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.projectConflict.findUnique({
      where: { id },
      include: { organization: true } as Prisma.ProjectConflictInclude
    });
  }

}
