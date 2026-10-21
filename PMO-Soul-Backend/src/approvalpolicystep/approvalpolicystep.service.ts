
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApprovalPolicyStepDto } from './dto/create-approvalpolicystep.dto';
import { UpdateApprovalPolicyStepDto } from './dto/update-approvalpolicystep.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { ApprovalPolicyStepLogic } from '../shared/approvalpolicystep-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class ApprovalPolicyStepService {
  private readonly logic: ApprovalPolicyStepLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.approvalPolicyStep);
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
    this.logic = new ApprovalPolicyStepLogic(repo, hooks);
  }

  async getAllApprovalPolicySteps(params?: {
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
  async aggregateApprovalPolicyStep(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getApprovalPolicyStepById(id: number) {
    return this.logic.getById(id);
  }

  async createApprovalPolicyStep(dto: CreateApprovalPolicyStepDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateApprovalPolicyStep(id: number, dto: UpdateApprovalPolicyStepDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteApprovalPolicyStep(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getApprovalPolicy(id: number) {
    return this.prisma.approvalPolicyStep.findUnique({
      where: { id },
      include: { approvalpolicy: true } as Prisma.ApprovalPolicyStepInclude
    });
  }

  async getRolesAndPermissions(id: number) {
    return this.prisma.approvalPolicyStep.findUnique({
      where: { id },
      include: { rolesandpermissions: true } as Prisma.ApprovalPolicyStepInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.approvalPolicyStep.findUnique({
      where: { id },
      include: { organization: true } as Prisma.ApprovalPolicyStepInclude
    });
  }

}
