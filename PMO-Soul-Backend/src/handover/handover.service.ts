
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHandoverDto } from './dto/create-handover.dto';
import { UpdateHandoverDto } from './dto/update-handover.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { HandoverLogic } from '../shared/handover-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class HandoverService {
  private readonly logic: HandoverLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.handover);
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
    this.logic = new HandoverLogic(repo, hooks);
  }

  async getAllHandovers(params?: {
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
  async aggregateHandover(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getHandoverById(id: number) {
    return this.logic.getById(id);
  }

  async createHandover(dto: CreateHandoverDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateHandover(id: number, dto: UpdateHandoverDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteHandover(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getProject(id: number) {
    return this.prisma.handover.findUnique({
      where: { id },
      include: { project: true } as Prisma.HandoverInclude
    });
  }

  async getUser(id: number) {
    return this.prisma.handover.findUnique({
      where: { id },
      include: { user: true } as Prisma.HandoverInclude
    });
  }

  async getDocument(id: number) {
    return this.prisma.handover.findUnique({
      where: { id },
      include: { document: true } as Prisma.HandoverInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.handover.findUnique({
      where: { id },
      include: { organization: true } as Prisma.HandoverInclude
    });
  }

}
