
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSprintSnapshotDto } from './dto/create-sprintsnapshot.dto';
import { UpdateSprintSnapshotDto } from './dto/update-sprintsnapshot.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { SprintSnapshotLogic } from '../shared/sprintsnapshot-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class SprintSnapshotService {
  private readonly logic: SprintSnapshotLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.sprintSnapshot);
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
    this.logic = new SprintSnapshotLogic(repo, hooks);
  }

  async getAllSprintSnapshots(params?: {
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
  async aggregateSprintSnapshot(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getSprintSnapshotById(id: number) {
    return this.logic.getById(id);
  }

  async createSprintSnapshot(dto: CreateSprintSnapshotDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateSprintSnapshot(id: number, dto: UpdateSprintSnapshotDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteSprintSnapshot(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getSprint(id: number) {
    return this.prisma.sprintSnapshot.findUnique({
      where: { id },
      include: { sprint: true } as Prisma.SprintSnapshotInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.sprintSnapshot.findUnique({
      where: { id },
      include: { organization: true } as Prisma.SprintSnapshotInclude
    });
  }

}
