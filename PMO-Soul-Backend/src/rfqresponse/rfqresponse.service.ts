
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRfqResponseDto } from './dto/create-rfqresponse.dto';
import { UpdateRfqResponseDto } from './dto/update-rfqresponse.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { RfqResponseLogic } from '../shared/rfqresponse-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class RfqResponseService {
  private readonly logic: RfqResponseLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.rfqResponse);
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
    this.logic = new RfqResponseLogic(repo, hooks);
  }

  async getAllRfqResponses(params?: {
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
  async aggregateRfqResponse(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getRfqResponseById(id: number) {
    return this.logic.getById(id);
  }

  async createRfqResponse(dto: CreateRfqResponseDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateRfqResponse(id: number, dto: UpdateRfqResponseDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteRfqResponse(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getProcurement(id: number) {
    return this.prisma.rfqResponse.findUnique({
      where: { id },
      include: { procurement: true } as Prisma.RfqResponseInclude
    });
  }

  async getVendor(id: number) {
    return this.prisma.rfqResponse.findUnique({
      where: { id },
      include: { vendor: true } as Prisma.RfqResponseInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.rfqResponse.findUnique({
      where: { id },
      include: { organization: true } as Prisma.RfqResponseInclude
    });
  }

}
