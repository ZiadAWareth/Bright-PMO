
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { OrganizationLogic } from '../shared/organization-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class OrganizationService {
  private readonly logic: OrganizationLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.organization);
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
    this.logic = new OrganizationLogic(repo, hooks);
  }

  async getAllOrganizations(params?: {
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
  async aggregateOrganization(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getOrganizationById(id: number) {
    return this.logic.getById(id);
  }

  async createOrganization(dto: CreateOrganizationDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateOrganization(id: number, dto: UpdateOrganizationDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteOrganization(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getOrganizationSettings(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { organizationsettings: true } as Prisma.OrganizationInclude
    });
  }

  async getApiKeys(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { apikeys: true } as Prisma.OrganizationInclude
    });
  }

  async getIntegrationConnections(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { integrationconnections: true } as Prisma.OrganizationInclude
    });
  }

  async getEpss(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { epss: true } as Prisma.OrganizationInclude
    });
  }

  async getPortfolios(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { portfolios: true } as Prisma.OrganizationInclude
    });
  }

  async getProjectCategorys(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { projectcategorys: true } as Prisma.OrganizationInclude
    });
  }

  async getWorkCalendars(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { workcalendars: true } as Prisma.OrganizationInclude
    });
  }

  async getProjects(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { projects: true } as Prisma.OrganizationInclude
    });
  }

  async getLifecycleTemplates(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { lifecycletemplates: true } as Prisma.OrganizationInclude
    });
  }

  async getResources(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { resources: true } as Prisma.OrganizationInclude
    });
  }

  async getVendors(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { vendors: true } as Prisma.OrganizationInclude
    });
  }

  async getDocuments(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { documents: true } as Prisma.OrganizationInclude
    });
  }

  async getApprovalPolicys(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { approvalpolicys: true } as Prisma.OrganizationInclude
    });
  }

  async getClosureTemplates(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { closuretemplates: true } as Prisma.OrganizationInclude
    });
  }

  async getActivityLogs(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { activitylogs: true } as Prisma.OrganizationInclude
    });
  }

  async getBusinessUnits(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { businessunits: true } as Prisma.OrganizationInclude
    });
  }

  async getNotifications(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { notifications: true } as Prisma.OrganizationInclude
    });
  }

  async getSprintSnapshots(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { sprintSnapshots: true } as Prisma.OrganizationInclude
    });
  }

  async getLessons(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { lessons: true } as Prisma.OrganizationInclude
    });
  }

  async getCommentMentions(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { commentMentions: true } as Prisma.OrganizationInclude
    });
  }

  async getMaintenanceSchedules(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { maintenanceSchedules: true } as Prisma.OrganizationInclude
    });
  }

  async getResourceAssignments(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { resourceAssignments: true } as Prisma.OrganizationInclude
    });
  }

  async getInspections(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { inspections: true } as Prisma.OrganizationInclude
    });
  }

  async getWorkItemLinks(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { workItemLinks: true } as Prisma.OrganizationInclude
    });
  }

  async getCalendarExceptions(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { calendarExceptions: true } as Prisma.OrganizationInclude
    });
  }

  async getAlerts(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { alerts: true } as Prisma.OrganizationInclude
    });
  }

  async getEvmSnapshots(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { evmSnapshots: true } as Prisma.OrganizationInclude
    });
  }

  async getWorkItems(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { workItems: true } as Prisma.OrganizationInclude
    });
  }

  async getProjectMembers(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { projectMembers: true } as Prisma.OrganizationInclude
    });
  }

  async getProjectClosures(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { projectClosures: true } as Prisma.OrganizationInclude
    });
  }

  async getChecklistItems(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { checklistItems: true } as Prisma.OrganizationInclude
    });
  }

  async getApprovalPolicySteps(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { approvalPolicySteps: true } as Prisma.OrganizationInclude
    });
  }

  async getCostTransactions(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { costTransactions: true } as Prisma.OrganizationInclude
    });
  }

  async getContracts(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { contracts: true } as Prisma.OrganizationInclude
    });
  }

  async getWorkflows(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { workflows: true } as Prisma.OrganizationInclude
    });
  }

  async getIdpInboxEvents(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { idpInboxEvents: true } as Prisma.OrganizationInclude
    });
  }

  async getWorkItemStatuss(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { workItemStatuses: true } as Prisma.OrganizationInclude
    });
  }

  async getProjectLifecycleSteps(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { projectLifecycleSteps: true } as Prisma.OrganizationInclude
    });
  }

  async getProgressReports(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { progressReports: true } as Prisma.OrganizationInclude
    });
  }

  async getTimeEntrys(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { timeEntries: true } as Prisma.OrganizationInclude
    });
  }

  async getLifecycleTemplateSteps(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { lifecycleTemplateSteps: true } as Prisma.OrganizationInclude
    });
  }

  async getRfqResponses(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { rfqResponses: true } as Prisma.OrganizationInclude
    });
  }

  async getTimesheets(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { timesheets: true } as Prisma.OrganizationInclude
    });
  }

  async getEquipmentSiteLogs(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { equipmentSiteLogs: true } as Prisma.OrganizationInclude
    });
  }

  async getSites(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { sites: true } as Prisma.OrganizationInclude
    });
  }

  async getChecklists(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { checklists: true } as Prisma.OrganizationInclude
    });
  }

  async getHandovers(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { handovers: true } as Prisma.OrganizationInclude
    });
  }

  async getClosureTemplateItems(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { closureTemplateItems: true } as Prisma.OrganizationInclude
    });
  }

  async getSprintCapacitys(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { sprintCapacities: true } as Prisma.OrganizationInclude
    });
  }

  async getRisks(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { risks: true } as Prisma.OrganizationInclude
    });
  }

  async getComments(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { comments: true } as Prisma.OrganizationInclude
    });
  }

  async getWbsNodes(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { wbsNodes: true } as Prisma.OrganizationInclude
    });
  }

  async getRecurringWorkItems(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { recurringWorkItems: true } as Prisma.OrganizationInclude
    });
  }

  async getReleases(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { releases: true } as Prisma.OrganizationInclude
    });
  }

  async getSavedReports(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { savedReports: true } as Prisma.OrganizationInclude
    });
  }

  async getRefreshTokens(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { refreshTokens: true } as Prisma.OrganizationInclude
    });
  }

  async getUserProfiles(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { userProfiles: true } as Prisma.OrganizationInclude
    });
  }

  async getBudgetLines(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { budgetLines: true } as Prisma.OrganizationInclude
    });
  }

  async getBaselines(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { baselines: true } as Prisma.OrganizationInclude
    });
  }

  async getWorkItemDependencys(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { workItemDependencies: true } as Prisma.OrganizationInclude
    });
  }

  async getRolesAndPermissionss(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { rolesAndPermissionses: true } as Prisma.OrganizationInclude
    });
  }

  async getWorkflowRules(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { workflowRules: true } as Prisma.OrganizationInclude
    });
  }

  async getMaintenanceLogs(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { maintenanceLogs: true } as Prisma.OrganizationInclude
    });
  }

  async getSprints(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { sprints: true } as Prisma.OrganizationInclude
    });
  }

  async getPunchListItems(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { punchListItems: true } as Prisma.OrganizationInclude
    });
  }

  async getApprovalSteps(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { approvalSteps: true } as Prisma.OrganizationInclude
    });
  }

  async getProcurements(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { procurements: true } as Prisma.OrganizationInclude
    });
  }

  async getClosureItems(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { closureItems: true } as Prisma.OrganizationInclude
    });
  }

  async getRiskMitigations(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { riskMitigations: true } as Prisma.OrganizationInclude
    });
  }

  async getProjectConflicts(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { projectConflicts: true } as Prisma.OrganizationInclude
    });
  }

  async getStatusTransitions(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { statusTransitions: true } as Prisma.OrganizationInclude
    });
  }

  async getBenchmarks(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { benchmarks: true } as Prisma.OrganizationInclude
    });
  }

  async getApprovalRequests(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { approvalRequests: true } as Prisma.OrganizationInclude
    });
  }

  async getWorkItemAssignees(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { workItemAssignees: true } as Prisma.OrganizationInclude
    });
  }

  async getUsers(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { users: true } as Prisma.OrganizationInclude
    });
  }

  async getBaselineItems(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { baselineItems: true } as Prisma.OrganizationInclude
    });
  }

  async getEscalations(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { escalations: true } as Prisma.OrganizationInclude
    });
  }

  async getWorkflowVersions(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { workflowVersions: true } as Prisma.OrganizationInclude
    });
  }

  async getWorkflowRuns(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { workflowRuns: true } as Prisma.OrganizationInclude
    });
  }

  async getWorkflowRunSteps(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { workflowRunSteps: true } as Prisma.OrganizationInclude
    });
  }

  async getWorkflowTasks(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { workflowTasks: true } as Prisma.OrganizationInclude
    });
  }

  async getWorkflowTimers(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { workflowTimers: true } as Prisma.OrganizationInclude
    });
  }

  async getWorkflowSchedules(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { workflowSchedules: true } as Prisma.OrganizationInclude
    });
  }

  async getAgentRuns(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { agentRuns: true } as Prisma.OrganizationInclude
    });
  }

  async getAgentRunSteps(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { agentRunSteps: true } as Prisma.OrganizationInclude
    });
  }

  async getAgentConversations(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { agentConversations: true } as Prisma.OrganizationInclude
    });
  }

  async getAgentMessages(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { agentMessages: true } as Prisma.OrganizationInclude
    });
  }

  async getAgents(id: number) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { agents: true } as Prisma.OrganizationInclude
    });
  }

}
