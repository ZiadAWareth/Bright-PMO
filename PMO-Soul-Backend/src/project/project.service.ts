
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { ProjectLogic } from '../shared/project-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class ProjectService {
  private readonly logic: ProjectLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.project);
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
    this.logic = new ProjectLogic(repo, hooks);
  }

  async getAllProjects(params?: {
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
  async aggregateProject(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getProjectById(id: number) {
    return this.logic.getById(id);
  }

  async createProject(dto: CreateProjectDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateProject(id: number, dto: UpdateProjectDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteProject(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getProjectCategory(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { projectcategory: true } as Prisma.ProjectInclude
    });
  }

  async getEps(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { eps: true } as Prisma.ProjectInclude
    });
  }

  async getPortfolio(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { portfolio: true } as Prisma.ProjectInclude
    });
  }

  async getUser(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { user: true } as Prisma.ProjectInclude
    });
  }

  async getUserCreatedBy(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { userCreatedBy: true } as Prisma.ProjectInclude
    });
  }

  async getWorkCalendar(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { workcalendar: true } as Prisma.ProjectInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { organization: true } as Prisma.ProjectInclude
    });
  }

  async getProjectMembers(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { projectmembers: true } as Prisma.ProjectInclude
    });
  }

  async getProjectLifecycleSteps(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { projectlifecyclesteps: true } as Prisma.ProjectInclude
    });
  }

  async getProjectConflicts(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { projectconflicts: true } as Prisma.ProjectInclude
    });
  }

  async getWorkItemStatuss(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { workitemstatuss: true } as Prisma.ProjectInclude
    });
  }

  async getWorkItems(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { workitems: true } as Prisma.ProjectInclude
    });
  }

  async getWorkflowRules(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { workflowrules: true } as Prisma.ProjectInclude
    });
  }

  async getRecurringWorkItems(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { recurringworkitems: true } as Prisma.ProjectInclude
    });
  }

  async getWbsNodes(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { wbsnodes: true } as Prisma.ProjectInclude
    });
  }

  async getBaselines(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { baselines: true } as Prisma.ProjectInclude
    });
  }

  async getEvmSnapshots(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { evmsnapshots: true } as Prisma.ProjectInclude
    });
  }

  async getSprints(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { sprints: true } as Prisma.ProjectInclude
    });
  }

  async getReleases(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { releases: true } as Prisma.ProjectInclude
    });
  }

  async getSites(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { sites: true } as Prisma.ProjectInclude
    });
  }

  async getBudgetLines(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { budgetlines: true } as Prisma.ProjectInclude
    });
  }

  async getCostTransactions(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { costtransactions: true } as Prisma.ProjectInclude
    });
  }

  async getRisks(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { risks: true } as Prisma.ProjectInclude
    });
  }

  async getProcurements(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { procurements: true } as Prisma.ProjectInclude
    });
  }

  async getDocuments(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { documents: true } as Prisma.ProjectInclude
    });
  }

  async getTimesheets(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { timesheets: true } as Prisma.ProjectInclude
    });
  }

  async getTimeEntrys(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { timeentrys: true } as Prisma.ProjectInclude
    });
  }

  async getApprovalRequests(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { approvalrequests: true } as Prisma.ProjectInclude
    });
  }

  async getProjectClosure(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { projectclosure: true } as Prisma.ProjectInclude
    });
  }

  async getChecklists(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { checklists: true } as Prisma.ProjectInclude
    });
  }

  async getPunchListItems(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { punchlistitems: true } as Prisma.ProjectInclude
    });
  }

  async getInspections(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { inspections: true } as Prisma.ProjectInclude
    });
  }

  async getHandovers(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { handovers: true } as Prisma.ProjectInclude
    });
  }

  async getAlerts(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { alerts: true } as Prisma.ProjectInclude
    });
  }

  async getLessons(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { lessons: true } as Prisma.ProjectInclude
    });
  }

}
