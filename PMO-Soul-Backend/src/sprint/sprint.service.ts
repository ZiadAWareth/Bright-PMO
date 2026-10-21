
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { SprintLogic } from '../shared/sprint-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class SprintService {
  private readonly logic: SprintLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.sprint);
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
    this.logic = new SprintLogic(repo, hooks);
  }

  async getAllSprints(params?: {
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
  async aggregateSprint(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getSprintById(id: number) {
    return this.logic.getById(id);
  }

  async createSprint(dto: CreateSprintDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateSprint(id: number, dto: UpdateSprintDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteSprint(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getWorkItems(id: number) {
    return this.prisma.sprint.findUnique({
      where: { id },
      include: { workitems: true } as Prisma.SprintInclude
    });
  }

  async getProject(id: number) {
    return this.prisma.sprint.findUnique({
      where: { id },
      include: { project: true } as Prisma.SprintInclude
    });
  }

  async getWbsNode(id: number) {
    return this.prisma.sprint.findUnique({
      where: { id },
      include: { wbsnode: true } as Prisma.SprintInclude
    });
  }

  async getSprintCapacitys(id: number) {
    return this.prisma.sprint.findUnique({
      where: { id },
      include: { sprintcapacitys: true } as Prisma.SprintInclude
    });
  }

  async getSprintSnapshots(id: number) {
    return this.prisma.sprint.findUnique({
      where: { id },
      include: { sprintsnapshots: true } as Prisma.SprintInclude
    });
  }

  async getLessons(id: number) {
    return this.prisma.sprint.findUnique({
      where: { id },
      include: { lessons: true } as Prisma.SprintInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.sprint.findUnique({
      where: { id },
      include: { organization: true } as Prisma.SprintInclude
    });
  }

}
