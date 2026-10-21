
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApprovalRequestDto } from './dto/create-approvalrequest.dto';
import { UpdateApprovalRequestDto } from './dto/update-approvalrequest.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { ApprovalRequestLogic } from '../shared/approvalrequest-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class ApprovalRequestService {
  private readonly logic: ApprovalRequestLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.approvalRequest);
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
    this.logic = new ApprovalRequestLogic(repo, hooks);
  }

  async getAllApprovalRequests(params?: {
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
  async aggregateApprovalRequest(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getApprovalRequestById(id: number) {
    return this.logic.getById(id);
  }

  async createApprovalRequest(dto: CreateApprovalRequestDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateApprovalRequest(id: number, dto: UpdateApprovalRequestDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteApprovalRequest(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getProject(id: number) {
    return this.prisma.approvalRequest.findUnique({
      where: { id },
      include: { project: true } as Prisma.ApprovalRequestInclude
    });
  }

  async getUser(id: number) {
    return this.prisma.approvalRequest.findUnique({
      where: { id },
      include: { user: true } as Prisma.ApprovalRequestInclude
    });
  }

  async getApprovalSteps(id: number) {
    return this.prisma.approvalRequest.findUnique({
      where: { id },
      include: { approvalsteps: true } as Prisma.ApprovalRequestInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.approvalRequest.findUnique({
      where: { id },
      include: { organization: true } as Prisma.ApprovalRequestInclude
    });
  }

}
