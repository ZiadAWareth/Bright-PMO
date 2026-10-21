
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStatusTransitionDto } from './dto/create-statustransition.dto';
import { UpdateStatusTransitionDto } from './dto/update-statustransition.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { StatusTransitionLogic } from '../shared/statustransition-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class StatusTransitionService {
  private readonly logic: StatusTransitionLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.statusTransition);
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
    this.logic = new StatusTransitionLogic(repo, hooks);
  }

  async getAllStatusTransitions(params?: {
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
  async aggregateStatusTransition(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getStatusTransitionById(id: number) {
    return this.logic.getById(id);
  }

  async createStatusTransition(dto: CreateStatusTransitionDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateStatusTransition(id: number, dto: UpdateStatusTransitionDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteStatusTransition(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getWorkItem(id: number) {
    return this.prisma.statusTransition.findUnique({
      where: { id },
      include: { workitem: true } as Prisma.StatusTransitionInclude
    });
  }

  async getWorkItemStatus(id: number) {
    return this.prisma.statusTransition.findUnique({
      where: { id },
      include: { workitemstatus: true } as Prisma.StatusTransitionInclude
    });
  }

  async getWorkitemstatusToStatus(id: number) {
    return this.prisma.statusTransition.findUnique({
      where: { id },
      include: { workitemstatusToStatus: true } as Prisma.StatusTransitionInclude
    });
  }

  async getUser(id: number) {
    return this.prisma.statusTransition.findUnique({
      where: { id },
      include: { user: true } as Prisma.StatusTransitionInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.statusTransition.findUnique({
      where: { id },
      include: { organization: true } as Prisma.StatusTransitionInclude
    });
  }

}
