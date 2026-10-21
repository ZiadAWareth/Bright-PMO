
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { ReleaseLogic } from '../shared/release-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class ReleaseService {
  private readonly logic: ReleaseLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.release);
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
    this.logic = new ReleaseLogic(repo, hooks);
  }

  async getAllReleases(params?: {
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
  async aggregateRelease(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getReleaseById(id: number) {
    return this.logic.getById(id);
  }

  async createRelease(dto: CreateReleaseDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateRelease(id: number, dto: UpdateReleaseDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteRelease(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getWorkItems(id: number) {
    return this.prisma.release.findUnique({
      where: { id },
      include: { workitems: true } as Prisma.ReleaseInclude
    });
  }

  async getProject(id: number) {
    return this.prisma.release.findUnique({
      where: { id },
      include: { project: true } as Prisma.ReleaseInclude
    });
  }

  async getWorkItem(id: number) {
    return this.prisma.release.findUnique({
      where: { id },
      include: { workitem: true } as Prisma.ReleaseInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.release.findUnique({
      where: { id },
      include: { organization: true } as Prisma.ReleaseInclude
    });
  }

}
