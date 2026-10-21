
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSprintCapacityDto } from './dto/create-sprintcapacity.dto';
import { UpdateSprintCapacityDto } from './dto/update-sprintcapacity.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { SprintCapacityLogic } from '../shared/sprintcapacity-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class SprintCapacityService {
  private readonly logic: SprintCapacityLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.sprintCapacity);
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
    this.logic = new SprintCapacityLogic(repo, hooks);
  }

  async getAllSprintCapacitys(params?: {
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
  async aggregateSprintCapacity(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getSprintCapacityById(id: number) {
    return this.logic.getById(id);
  }

  async createSprintCapacity(dto: CreateSprintCapacityDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateSprintCapacity(id: number, dto: UpdateSprintCapacityDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteSprintCapacity(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getSprint(id: number) {
    return this.prisma.sprintCapacity.findUnique({
      where: { id },
      include: { sprint: true } as Prisma.SprintCapacityInclude
    });
  }

  async getUser(id: number) {
    return this.prisma.sprintCapacity.findUnique({
      where: { id },
      include: { user: true } as Prisma.SprintCapacityInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.sprintCapacity.findUnique({
      where: { id },
      include: { organization: true } as Prisma.SprintCapacityInclude
    });
  }

}
