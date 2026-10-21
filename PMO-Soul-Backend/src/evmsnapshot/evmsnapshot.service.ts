
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEvmSnapshotDto } from './dto/create-evmsnapshot.dto';
import { UpdateEvmSnapshotDto } from './dto/update-evmsnapshot.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { EvmSnapshotLogic } from '../shared/evmsnapshot-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class EvmSnapshotService {
  private readonly logic: EvmSnapshotLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.evmSnapshot);
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
    this.logic = new EvmSnapshotLogic(repo, hooks);
  }

  async getAllEvmSnapshots(params?: {
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
  async aggregateEvmSnapshot(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getEvmSnapshotById(id: number) {
    return this.logic.getById(id);
  }

  async createEvmSnapshot(dto: CreateEvmSnapshotDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateEvmSnapshot(id: number, dto: UpdateEvmSnapshotDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteEvmSnapshot(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getProject(id: number) {
    return this.prisma.evmSnapshot.findUnique({
      where: { id },
      include: { project: true } as Prisma.EvmSnapshotInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.evmSnapshot.findUnique({
      where: { id },
      include: { organization: true } as Prisma.EvmSnapshotInclude
    });
  }

}
