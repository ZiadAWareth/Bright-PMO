
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResourceAssignmentDto } from './dto/create-resourceassignment.dto';
import { UpdateResourceAssignmentDto } from './dto/update-resourceassignment.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { ResourceAssignmentLogic } from '../shared/resourceassignment-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class ResourceAssignmentService {
  private readonly logic: ResourceAssignmentLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.resourceAssignment);
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
    this.logic = new ResourceAssignmentLogic(repo, hooks);
  }

  async getAllResourceAssignments(params?: {
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
  async aggregateResourceAssignment(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getResourceAssignmentById(id: number) {
    return this.logic.getById(id);
  }

  async createResourceAssignment(dto: CreateResourceAssignmentDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateResourceAssignment(id: number, dto: UpdateResourceAssignmentDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteResourceAssignment(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getResource(id: number) {
    return this.prisma.resourceAssignment.findUnique({
      where: { id },
      include: { resource: true } as Prisma.ResourceAssignmentInclude
    });
  }

  async getWorkItem(id: number) {
    return this.prisma.resourceAssignment.findUnique({
      where: { id },
      include: { workitem: true } as Prisma.ResourceAssignmentInclude
    });
  }

  async getProgressReports(id: number) {
    return this.prisma.resourceAssignment.findUnique({
      where: { id },
      include: { progressreports: true } as Prisma.ResourceAssignmentInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.resourceAssignment.findUnique({
      where: { id },
      include: { organization: true } as Prisma.ResourceAssignmentInclude
    });
  }

}
