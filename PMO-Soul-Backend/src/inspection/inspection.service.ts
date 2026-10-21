
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { InspectionLogic } from '../shared/inspection-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class InspectionService {
  private readonly logic: InspectionLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.inspection);
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
    this.logic = new InspectionLogic(repo, hooks);
  }

  async getAllInspections(params?: {
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
  async aggregateInspection(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getInspectionById(id: number) {
    return this.logic.getById(id);
  }

  async createInspection(dto: CreateInspectionDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateInspection(id: number, dto: UpdateInspectionDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteInspection(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getProject(id: number) {
    return this.prisma.inspection.findUnique({
      where: { id },
      include: { project: true } as Prisma.InspectionInclude
    });
  }

  async getUser(id: number) {
    return this.prisma.inspection.findUnique({
      where: { id },
      include: { user: true } as Prisma.InspectionInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.inspection.findUnique({
      where: { id },
      include: { organization: true } as Prisma.InspectionInclude
    });
  }

}
