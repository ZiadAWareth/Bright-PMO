
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIdpInboxEventDto } from './dto/create-idpinboxevent.dto';
import { UpdateIdpInboxEventDto } from './dto/update-idpinboxevent.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { IdpInboxEventLogic } from '../shared/idpinboxevent-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class IdpInboxEventService {
  private readonly logic: IdpInboxEventLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.idpInboxEvent);
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
    this.logic = new IdpInboxEventLogic(repo, hooks);
  }

  async getAllIdpInboxEvents(params?: {
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
  async aggregateIdpInboxEvent(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getIdpInboxEventById(id: number) {
    return this.logic.getById(id);
  }

  async createIdpInboxEvent(dto: CreateIdpInboxEventDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateIdpInboxEvent(id: number, dto: UpdateIdpInboxEventDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteIdpInboxEvent(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getOrganization(id: number) {
    return this.prisma.idpInboxEvent.findUnique({
      where: { id },
      include: { organization: true } as Prisma.IdpInboxEventInclude
    });
  }

}
