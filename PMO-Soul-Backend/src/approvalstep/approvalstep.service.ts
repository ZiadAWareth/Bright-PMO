
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApprovalStepDto } from './dto/create-approvalstep.dto';
import { UpdateApprovalStepDto } from './dto/update-approvalstep.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { ApprovalStepLogic } from '../shared/approvalstep-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class ApprovalStepService {
  private readonly logic: ApprovalStepLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.approvalStep);
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
    this.logic = new ApprovalStepLogic(repo, hooks);
  }

  async getAllApprovalSteps(params?: {
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
  async aggregateApprovalStep(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getApprovalStepById(id: number) {
    return this.logic.getById(id);
  }

  async createApprovalStep(dto: CreateApprovalStepDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateApprovalStep(id: number, dto: UpdateApprovalStepDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteApprovalStep(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getApprovalRequest(id: number) {
    return this.prisma.approvalStep.findUnique({
      where: { id },
      include: { approvalrequest: true } as Prisma.ApprovalStepInclude
    });
  }

  async getUser(id: number) {
    return this.prisma.approvalStep.findUnique({
      where: { id },
      include: { user: true } as Prisma.ApprovalStepInclude
    });
  }

  async getUserDecidedBy(id: number) {
    return this.prisma.approvalStep.findUnique({
      where: { id },
      include: { userDecidedBy: true } as Prisma.ApprovalStepInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.approvalStep.findUnique({
      where: { id },
      include: { organization: true } as Prisma.ApprovalStepInclude
    });
  }

}
