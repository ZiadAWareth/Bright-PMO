
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { UserLogic } from '../shared/user-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';
import * as bcrypt from 'bcrypt';


@Injectable()
export class UserService {
  private readonly logic: UserLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.user);
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
    this.logic = new UserLogic(repo, hooks, (password: string) => bcrypt.hash(password, 10));
  }

  async getAllUsers(params?: {
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
  async aggregateUser(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getUserById(id: number) {
    return this.logic.getById(id);
  }

  async createUser(dto: CreateUserDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateUser(id: number, dto: UpdateUserDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteUser(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getUserProfile(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { userprofile: true } as Prisma.UserInclude
    });
  }

  async getRefreshTokens(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { refreshtokens: true } as Prisma.UserInclude
    });
  }

  async getPortfolios(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { portfolios: true } as Prisma.UserInclude
    });
  }

  async getProjects(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { projects: true } as Prisma.UserInclude
    });
  }

  async getProjectsCreatedBy(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { projectsCreatedBy: true } as Prisma.UserInclude
    });
  }

  async getProjectMembers(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { projectmembers: true } as Prisma.UserInclude
    });
  }

  async getProjectLifecycleSteps(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { projectlifecyclesteps: true } as Prisma.UserInclude
    });
  }

  async getWorkItems(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { workitems: true } as Prisma.UserInclude
    });
  }

  async getWorkitemsCreatedBy(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { workitemsCreatedBy: true } as Prisma.UserInclude
    });
  }

  async getWorkItemAssignees(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { workitemassignees: true } as Prisma.UserInclude
    });
  }

  async getStatusTransitions(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { statustransitions: true } as Prisma.UserInclude
    });
  }

  async getComments(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { comments: true } as Prisma.UserInclude
    });
  }

  async getCommentMentions(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { commentmentions: true } as Prisma.UserInclude
    });
  }

  async getBaselines(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { baselines: true } as Prisma.UserInclude
    });
  }

  async getSprintCapacitys(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { sprintcapacitys: true } as Prisma.UserInclude
    });
  }

  async getResource(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { resource: true } as Prisma.UserInclude
    });
  }

  async getProgressReports(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { progressreports: true } as Prisma.UserInclude
    });
  }

  async getSites(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { sites: true } as Prisma.UserInclude
    });
  }

  async getEquipmentSiteLogs(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { equipmentsitelogs: true } as Prisma.UserInclude
    });
  }

  async getMaintenanceLogs(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { maintenancelogs: true } as Prisma.UserInclude
    });
  }

  async getRisks(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { risks: true } as Prisma.UserInclude
    });
  }

  async getRiskMitigations(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { riskmitigations: true } as Prisma.UserInclude
    });
  }

  async getRiskmitigationsAssignee(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { riskmitigationsAssignee: true } as Prisma.UserInclude
    });
  }

  async getDocuments(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { documents: true } as Prisma.UserInclude
    });
  }

  async getTimesheets(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { timesheets: true } as Prisma.UserInclude
    });
  }

  async getTimesheetsApprovedBy(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { timesheetsApprovedBy: true } as Prisma.UserInclude
    });
  }

  async getTimeEntrys(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { timeentrys: true } as Prisma.UserInclude
    });
  }

  async getApprovalRequests(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { approvalrequests: true } as Prisma.UserInclude
    });
  }

  async getApprovalSteps(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { approvalsteps: true } as Prisma.UserInclude
    });
  }

  async getApprovalstepsDecidedBy(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { approvalstepsDecidedBy: true } as Prisma.UserInclude
    });
  }

  async getClosureItems(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { closureitems: true } as Prisma.UserInclude
    });
  }

  async getChecklistItems(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { checklistitems: true } as Prisma.UserInclude
    });
  }

  async getPunchListItems(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { punchlistitems: true } as Prisma.UserInclude
    });
  }

  async getInspections(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { inspections: true } as Prisma.UserInclude
    });
  }

  async getHandovers(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { handovers: true } as Prisma.UserInclude
    });
  }

  async getActivityLogs(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { activitylogs: true } as Prisma.UserInclude
    });
  }

  async getLessons(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { lessons: true } as Prisma.UserInclude
    });
  }

  async getRolesAndPermissions(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { rolesandpermissions: true } as Prisma.UserInclude
    });
  }

  async getBusinessUnit(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { businessunit: true } as Prisma.UserInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { organization: true } as Prisma.UserInclude
    });
  }

}
