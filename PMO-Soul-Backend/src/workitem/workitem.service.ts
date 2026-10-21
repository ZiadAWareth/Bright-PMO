
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkItemDto } from './dto/create-workitem.dto';
import { UpdateWorkItemDto } from './dto/update-workitem.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { WorkItemLogic } from '../shared/workitem-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class WorkItemService {
  private readonly logic: WorkItemLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.workItem);
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
    this.logic = new WorkItemLogic(repo, hooks);
  }

  async getAllWorkItems(params?: {
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
  async aggregateWorkItem(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getWorkItemById(id: number) {
    return this.logic.getById(id);
  }

  async createWorkItem(dto: CreateWorkItemDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateWorkItem(id: number, dto: UpdateWorkItemDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteWorkItem(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getProject(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { project: true } as Prisma.WorkItemInclude
    });
  }

  async getWorkItem(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { workitem: true } as Prisma.WorkItemInclude
    });
  }

  async getWorkItems(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { workitems: true } as Prisma.WorkItemInclude
    });
  }

  async getWbsNode(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { wbsnode: true } as Prisma.WorkItemInclude
    });
  }

  async getSprint(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { sprint: true } as Prisma.WorkItemInclude
    });
  }

  async getRelease(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { release: true } as Prisma.WorkItemInclude
    });
  }

  async getWorkItemStatus(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { workitemstatus: true } as Prisma.WorkItemInclude
    });
  }

  async getUser(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { user: true } as Prisma.WorkItemInclude
    });
  }

  async getUserCreatedBy(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { userCreatedBy: true } as Prisma.WorkItemInclude
    });
  }

  async getWorkItemAssignees(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { workitemassignees: true } as Prisma.WorkItemInclude
    });
  }

  async getWorkItemDependencys(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { workitemdependencys: true } as Prisma.WorkItemInclude
    });
  }

  async getWorkitemdependencysSuccessor(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { workitemdependencysSuccessor: true } as Prisma.WorkItemInclude
    });
  }

  async getWorkItemLinks(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { workitemlinks: true } as Prisma.WorkItemInclude
    });
  }

  async getWorkitemlinksTarget(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { workitemlinksTarget: true } as Prisma.WorkItemInclude
    });
  }

  async getStatusTransitions(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { statustransitions: true } as Prisma.WorkItemInclude
    });
  }

  async getComments(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { comments: true } as Prisma.WorkItemInclude
    });
  }

  async getWorkflowRules(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { workflowrules: true } as Prisma.WorkItemInclude
    });
  }

  async getWorkflowrulesActionItem(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { workflowrulesActionItem: true } as Prisma.WorkItemInclude
    });
  }

  async getBaselineItems(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { baselineitems: true } as Prisma.WorkItemInclude
    });
  }

  async getReleases(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { releases: true } as Prisma.WorkItemInclude
    });
  }

  async getResourceAssignments(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { resourceassignments: true } as Prisma.WorkItemInclude
    });
  }

  async getProgressReports(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { progressreports: true } as Prisma.WorkItemInclude
    });
  }

  async getBudgetLines(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { budgetlines: true } as Prisma.WorkItemInclude
    });
  }

  async getRiskMitigations(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { riskmitigations: true } as Prisma.WorkItemInclude
    });
  }

  async getDocuments(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { documents: true } as Prisma.WorkItemInclude
    });
  }

  async getTimeEntrys(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { timeentrys: true } as Prisma.WorkItemInclude
    });
  }

  async getEscalations(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { escalations: true } as Prisma.WorkItemInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.workItem.findUnique({
      where: { id },
      include: { organization: true } as Prisma.WorkItemInclude
    });
  }

}
