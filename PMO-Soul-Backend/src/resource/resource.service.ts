
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { ResourceLogic } from '../shared/resource-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class ResourceService {
  private readonly logic: ResourceLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.resource);
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
    this.logic = new ResourceLogic(repo, hooks);
  }

  async getAllResources(params?: {
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
  async aggregateResource(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getResourceById(id: number) {
    return this.logic.getById(id);
  }

  async createResource(dto: CreateResourceDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateResource(id: number, dto: UpdateResourceDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteResource(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getUser(id: number) {
    return this.prisma.resource.findUnique({
      where: { id },
      include: { user: true } as Prisma.ResourceInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.resource.findUnique({
      where: { id },
      include: { organization: true } as Prisma.ResourceInclude
    });
  }

  async getResourceAssignments(id: number) {
    return this.prisma.resource.findUnique({
      where: { id },
      include: { resourceassignments: true } as Prisma.ResourceInclude
    });
  }

  async getEquipmentSiteLogs(id: number) {
    return this.prisma.resource.findUnique({
      where: { id },
      include: { equipmentsitelogs: true } as Prisma.ResourceInclude
    });
  }

  async getMaintenanceSchedules(id: number) {
    return this.prisma.resource.findUnique({
      where: { id },
      include: { maintenanceschedules: true } as Prisma.ResourceInclude
    });
  }

  async getMaintenanceLogs(id: number) {
    return this.prisma.resource.findUnique({
      where: { id },
      include: { maintenancelogs: true } as Prisma.ResourceInclude
    });
  }

}
