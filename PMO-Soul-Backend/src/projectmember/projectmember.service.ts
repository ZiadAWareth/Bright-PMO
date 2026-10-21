
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectMemberDto } from './dto/create-projectmember.dto';
import { UpdateProjectMemberDto } from './dto/update-projectmember.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { ProjectMemberLogic } from '../shared/projectmember-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class ProjectMemberService {
  private readonly logic: ProjectMemberLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.projectMember);
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
    this.logic = new ProjectMemberLogic(repo, hooks);
  }

  async getAllProjectMembers(params?: {
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
  async aggregateProjectMember(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getProjectMemberById(id: number) {
    return this.logic.getById(id);
  }

  async createProjectMember(dto: CreateProjectMemberDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateProjectMember(id: number, dto: UpdateProjectMemberDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteProjectMember(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getProject(id: number) {
    return this.prisma.projectMember.findUnique({
      where: { id },
      include: { project: true } as Prisma.ProjectMemberInclude
    });
  }

  async getUser(id: number) {
    return this.prisma.projectMember.findUnique({
      where: { id },
      include: { user: true } as Prisma.ProjectMemberInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.projectMember.findUnique({
      where: { id },
      include: { organization: true } as Prisma.ProjectMemberInclude
    });
  }

}
