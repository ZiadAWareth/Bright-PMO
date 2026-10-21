/**
 * Preview Web Worker — boots PGlite, wires generated logic, handles RPC.
 *
 * Main thread sends: { id, type: 'init', ddl } or { id, type: 'rpc', method, params }
 * Worker replies:    { id, result } or { id, error }
 *
 * RPC methods:  "{model}.getAll", "{model}.getById", "{model}.create",
 *               "{model}.update", "{model}.remove", "auth.login"
 */
import { PGlite } from '@electric-sql/pglite';
import { PGliteRepository, PGliteRepositoryFactory } from './pglite-repository';
import { EntityLifecycleHooks } from './hooks';
import { AuthLogic } from './auth-logic';
import { ApprovalPolicyLogic } from './approvalpolicy-logic';
import { SprintSnapshotLogic } from './sprintsnapshot-logic';
import { LessonLogic } from './lesson-logic';
import { CommentMentionLogic } from './commentmention-logic';
import { MaintenanceScheduleLogic } from './maintenanceschedule-logic';
import { ResourceAssignmentLogic } from './resourceassignment-logic';
import { EpsLogic } from './eps-logic';
import { OrganizationLogic } from './organization-logic';
import { InspectionLogic } from './inspection-logic';
import { WorkItemLinkLogic } from './workitemlink-logic';
import { ActivityLogLogic } from './activitylog-logic';
import { CalendarExceptionLogic } from './calendarexception-logic';
import { AlertLogic } from './alert-logic';
import { EvmSnapshotLogic } from './evmsnapshot-logic';
import { WorkItemLogic } from './workitem-logic';
import { IntegrationConnectionLogic } from './integrationconnection-logic';
import { DocumentLogic } from './document-logic';
import { OrganizationSettingsLogic } from './organizationsettings-logic';
import { ProjectMemberLogic } from './projectmember-logic';
import { ProjectClosureLogic } from './projectclosure-logic';
import { ChecklistItemLogic } from './checklistitem-logic';
import { ApprovalPolicyStepLogic } from './approvalpolicystep-logic';
import { CostTransactionLogic } from './costtransaction-logic';
import { ContractLogic } from './contract-logic';
import { WorkflowLogic } from './workflow-logic';
import { IdpInboxEventLogic } from './idpinboxevent-logic';
import { WorkItemStatusLogic } from './workitemstatus-logic';
import { ProjectLifecycleStepLogic } from './projectlifecyclestep-logic';
import { ProgressReportLogic } from './progressreport-logic';
import { TimeEntryLogic } from './timeentry-logic';
import { VendorLogic } from './vendor-logic';
import { LifecycleTemplateStepLogic } from './lifecycletemplatestep-logic';
import { RfqResponseLogic } from './rfqresponse-logic';
import { TimesheetLogic } from './timesheet-logic';
import { EquipmentSiteLogLogic } from './equipmentsitelog-logic';
import { SiteLogic } from './site-logic';
import { ChecklistLogic } from './checklist-logic';
import { HandoverLogic } from './handover-logic';
import { ProjectCategoryLogic } from './projectcategory-logic';
import { ClosureTemplateItemLogic } from './closuretemplateitem-logic';
import { SprintCapacityLogic } from './sprintcapacity-logic';
import { RiskLogic } from './risk-logic';
import { CommentLogic } from './comment-logic';
import { WorkCalendarLogic } from './workcalendar-logic';
import { WbsNodeLogic } from './wbsnode-logic';
import { RecurringWorkItemLogic } from './recurringworkitem-logic';
import { LifecycleTemplateLogic } from './lifecycletemplate-logic';
import { ResourceLogic } from './resource-logic';
import { ReleaseLogic } from './release-logic';
import { SavedReportLogic } from './savedreport-logic';
import { RefreshTokenLogic } from './refreshtoken-logic';
import { UserProfileLogic } from './userprofile-logic';
import { ClosureTemplateLogic } from './closuretemplate-logic';
import { BudgetLineLogic } from './budgetline-logic';
import { BaselineLogic } from './baseline-logic';
import { WorkItemDependencyLogic } from './workitemdependency-logic';
import { PortfolioLogic } from './portfolio-logic';
import { RolesAndPermissionsLogic } from './rolesandpermissions-logic';
import { WorkflowRuleLogic } from './workflowrule-logic';
import { MaintenanceLogLogic } from './maintenancelog-logic';
import { SprintLogic } from './sprint-logic';
import { PunchListItemLogic } from './punchlistitem-logic';
import { ProjectLogic } from './project-logic';
import { ApprovalStepLogic } from './approvalstep-logic';
import { ProcurementLogic } from './procurement-logic';
import { ClosureItemLogic } from './closureitem-logic';
import { BusinessUnitLogic } from './businessunit-logic';
import { RiskMitigationLogic } from './riskmitigation-logic';
import { ProjectConflictLogic } from './projectconflict-logic';
import { StatusTransitionLogic } from './statustransition-logic';
import { NotificationLogic } from './notification-logic';
import { BenchmarkLogic } from './benchmark-logic';
import { ApprovalRequestLogic } from './approvalrequest-logic';
import { WorkItemAssigneeLogic } from './workitemassignee-logic';
import { ApiKeyLogic } from './apikey-logic';
import { UserLogic } from './user-logic';
import { BaselineItemLogic } from './baselineitem-logic';
import { EscalationLogic } from './escalation-logic';
import { WorkflowVersionLogic } from './workflowversion-logic';
import { WorkflowTaskLogic } from './workflowtask-logic';
import { WorkflowTimerLogic } from './workflowtimer-logic';
import { WorkflowScheduleLogic } from './workflowschedule-logic';
import { AgentSettingLogic } from './agentsetting-logic';
import { AgentRunLogic } from './agentrun-logic';
import { AgentRunStepLogic } from './agentrunstep-logic';
import { AgentConversationLogic } from './agentconversation-logic';
import { AgentMessageLogic } from './agentmessage-logic';
import { AgentLogic } from './agent-logic';
import { MailSettingLogic } from './mailsetting-logic';
import { AuthSettingLogic } from './authsetting-logic';
import { AuthSetupTokenLogic } from './authsetuptoken-logic';
import { AuthLoginCodeLogic } from './authlogincode-logic';
import { AuthSessionRevocationLogic } from './authsessionrevocation-logic';
import { BuilderKeyLogic } from './builderkey-logic';
import { DashboardEngineConnectionLogic } from './dashboardengineconnection-logic';
import { DashboardEngineOrgLogic } from './dashboardengineorg-logic';
import { EmbeddedDashboardLogic } from './embeddeddashboard-logic';

let db: any = null;
let logicMap: Record<string, any> = {};
let authLogic: AuthLogic | null = null;

async function init(ddl: string) {
  db = new PGlite();
  await db.ready;

  // Apply schema DDL (from prisma migrate diff)
  await db.exec(ddl);

  // Create repos
    const approvalPolicyRepo = new PGliteRepository(db, 'ApprovalPolicy');
    const sprintSnapshotRepo = new PGliteRepository(db, 'SprintSnapshot');
    const lessonRepo = new PGliteRepository(db, 'Lesson');
    const commentMentionRepo = new PGliteRepository(db, 'CommentMention');
    const maintenanceScheduleRepo = new PGliteRepository(db, 'MaintenanceSchedule');
    const resourceAssignmentRepo = new PGliteRepository(db, 'ResourceAssignment');
    const epsRepo = new PGliteRepository(db, 'Eps');
    const organizationRepo = new PGliteRepository(db, 'Organization');
    const inspectionRepo = new PGliteRepository(db, 'Inspection');
    const workItemLinkRepo = new PGliteRepository(db, 'WorkItemLink');
    const activityLogRepo = new PGliteRepository(db, 'ActivityLog');
    const calendarExceptionRepo = new PGliteRepository(db, 'CalendarException');
    const alertRepo = new PGliteRepository(db, 'Alert');
    const evmSnapshotRepo = new PGliteRepository(db, 'EvmSnapshot');
    const workItemRepo = new PGliteRepository(db, 'WorkItem');
    const integrationConnectionRepo = new PGliteRepository(db, 'IntegrationConnection');
    const documentRepo = new PGliteRepository(db, 'Document');
    const organizationSettingsRepo = new PGliteRepository(db, 'OrganizationSettings');
    const projectMemberRepo = new PGliteRepository(db, 'ProjectMember');
    const projectClosureRepo = new PGliteRepository(db, 'ProjectClosure');
    const checklistItemRepo = new PGliteRepository(db, 'ChecklistItem');
    const approvalPolicyStepRepo = new PGliteRepository(db, 'ApprovalPolicyStep');
    const costTransactionRepo = new PGliteRepository(db, 'CostTransaction');
    const contractRepo = new PGliteRepository(db, 'Contract');
    const workflowRepo = new PGliteRepository(db, 'Workflow');
    const idpInboxEventRepo = new PGliteRepository(db, 'IdpInboxEvent');
    const workItemStatusRepo = new PGliteRepository(db, 'WorkItemStatus');
    const projectLifecycleStepRepo = new PGliteRepository(db, 'ProjectLifecycleStep');
    const progressReportRepo = new PGliteRepository(db, 'ProgressReport');
    const timeEntryRepo = new PGliteRepository(db, 'TimeEntry');
    const vendorRepo = new PGliteRepository(db, 'Vendor');
    const lifecycleTemplateStepRepo = new PGliteRepository(db, 'LifecycleTemplateStep');
    const rfqResponseRepo = new PGliteRepository(db, 'RfqResponse');
    const timesheetRepo = new PGliteRepository(db, 'Timesheet');
    const equipmentSiteLogRepo = new PGliteRepository(db, 'EquipmentSiteLog');
    const siteRepo = new PGliteRepository(db, 'Site');
    const checklistRepo = new PGliteRepository(db, 'Checklist');
    const handoverRepo = new PGliteRepository(db, 'Handover');
    const projectCategoryRepo = new PGliteRepository(db, 'ProjectCategory');
    const closureTemplateItemRepo = new PGliteRepository(db, 'ClosureTemplateItem');
    const sprintCapacityRepo = new PGliteRepository(db, 'SprintCapacity');
    const riskRepo = new PGliteRepository(db, 'Risk');
    const commentRepo = new PGliteRepository(db, 'Comment');
    const workCalendarRepo = new PGliteRepository(db, 'WorkCalendar');
    const wbsNodeRepo = new PGliteRepository(db, 'WbsNode');
    const recurringWorkItemRepo = new PGliteRepository(db, 'RecurringWorkItem');
    const lifecycleTemplateRepo = new PGliteRepository(db, 'LifecycleTemplate');
    const resourceRepo = new PGliteRepository(db, 'Resource');
    const releaseRepo = new PGliteRepository(db, 'Release');
    const savedReportRepo = new PGliteRepository(db, 'SavedReport');
    const refreshTokenRepo = new PGliteRepository(db, 'RefreshToken');
    const userProfileRepo = new PGliteRepository(db, 'UserProfile');
    const closureTemplateRepo = new PGliteRepository(db, 'ClosureTemplate');
    const budgetLineRepo = new PGliteRepository(db, 'BudgetLine');
    const baselineRepo = new PGliteRepository(db, 'Baseline');
    const workItemDependencyRepo = new PGliteRepository(db, 'WorkItemDependency');
    const portfolioRepo = new PGliteRepository(db, 'Portfolio');
    const rolesAndPermissionsRepo = new PGliteRepository(db, 'RolesAndPermissions');
    const workflowRuleRepo = new PGliteRepository(db, 'WorkflowRule');
    const maintenanceLogRepo = new PGliteRepository(db, 'MaintenanceLog');
    const sprintRepo = new PGliteRepository(db, 'Sprint');
    const punchListItemRepo = new PGliteRepository(db, 'PunchListItem');
    const projectRepo = new PGliteRepository(db, 'Project');
    const approvalStepRepo = new PGliteRepository(db, 'ApprovalStep');
    const procurementRepo = new PGliteRepository(db, 'Procurement');
    const closureItemRepo = new PGliteRepository(db, 'ClosureItem');
    const businessUnitRepo = new PGliteRepository(db, 'BusinessUnit');
    const riskMitigationRepo = new PGliteRepository(db, 'RiskMitigation');
    const projectConflictRepo = new PGliteRepository(db, 'ProjectConflict');
    const statusTransitionRepo = new PGliteRepository(db, 'StatusTransition');
    const notificationRepo = new PGliteRepository(db, 'Notification');
    const benchmarkRepo = new PGliteRepository(db, 'Benchmark');
    const approvalRequestRepo = new PGliteRepository(db, 'ApprovalRequest');
    const workItemAssigneeRepo = new PGliteRepository(db, 'WorkItemAssignee');
    const apiKeyRepo = new PGliteRepository(db, 'ApiKey');
    const userRepo = new PGliteRepository(db, 'User');
    const baselineItemRepo = new PGliteRepository(db, 'BaselineItem');
    const escalationRepo = new PGliteRepository(db, 'Escalation');
    const workflowVersionRepo = new PGliteRepository(db, 'WorkflowVersion');
    const workflowTaskRepo = new PGliteRepository(db, 'WorkflowTask');
    const workflowTimerRepo = new PGliteRepository(db, 'WorkflowTimer');
    const workflowScheduleRepo = new PGliteRepository(db, 'WorkflowSchedule');
    const agentSettingRepo = new PGliteRepository(db, 'AgentSetting');
    const agentRunRepo = new PGliteRepository(db, 'AgentRun');
    const agentRunStepRepo = new PGliteRepository(db, 'AgentRunStep');
    const agentConversationRepo = new PGliteRepository(db, 'AgentConversation');
    const agentMessageRepo = new PGliteRepository(db, 'AgentMessage');
    const agentRepo = new PGliteRepository(db, 'Agent');
    const mailSettingRepo = new PGliteRepository(db, 'MailSetting');
    const authSettingRepo = new PGliteRepository(db, 'AuthSetting');
    const authSetupTokenRepo = new PGliteRepository(db, 'AuthSetupToken');
    const authLoginCodeRepo = new PGliteRepository(db, 'AuthLoginCode');
    const authSessionRevocationRepo = new PGliteRepository(db, 'AuthSessionRevocation');
    const builderKeyRepo = new PGliteRepository(db, 'BuilderKey');
    const dashboardEngineConnectionRepo = new PGliteRepository(db, 'DashboardEngineConnection');
    const dashboardEngineOrgRepo = new PGliteRepository(db, 'DashboardEngineOrg');
    const embeddedDashboardRepo = new PGliteRepository(db, 'EmbeddedDashboard');

  // Table map for RepositoryFactory
  const tableMap: Record<string, string> = {
    'approvalPolicy': 'ApprovalPolicy',
    'ApprovalPolicy': 'ApprovalPolicy',
    'sprintSnapshot': 'SprintSnapshot',
    'SprintSnapshot': 'SprintSnapshot',
    'lesson': 'Lesson',
    'Lesson': 'Lesson',
    'commentMention': 'CommentMention',
    'CommentMention': 'CommentMention',
    'maintenanceSchedule': 'MaintenanceSchedule',
    'MaintenanceSchedule': 'MaintenanceSchedule',
    'resourceAssignment': 'ResourceAssignment',
    'ResourceAssignment': 'ResourceAssignment',
    'eps': 'Eps',
    'Eps': 'Eps',
    'organization': 'Organization',
    'Organization': 'Organization',
    'inspection': 'Inspection',
    'Inspection': 'Inspection',
    'workItemLink': 'WorkItemLink',
    'WorkItemLink': 'WorkItemLink',
    'activityLog': 'ActivityLog',
    'ActivityLog': 'ActivityLog',
    'calendarException': 'CalendarException',
    'CalendarException': 'CalendarException',
    'alert': 'Alert',
    'Alert': 'Alert',
    'evmSnapshot': 'EvmSnapshot',
    'EvmSnapshot': 'EvmSnapshot',
    'workItem': 'WorkItem',
    'WorkItem': 'WorkItem',
    'integrationConnection': 'IntegrationConnection',
    'IntegrationConnection': 'IntegrationConnection',
    'document': 'Document',
    'Document': 'Document',
    'organizationSettings': 'OrganizationSettings',
    'OrganizationSettings': 'OrganizationSettings',
    'projectMember': 'ProjectMember',
    'ProjectMember': 'ProjectMember',
    'projectClosure': 'ProjectClosure',
    'ProjectClosure': 'ProjectClosure',
    'checklistItem': 'ChecklistItem',
    'ChecklistItem': 'ChecklistItem',
    'approvalPolicyStep': 'ApprovalPolicyStep',
    'ApprovalPolicyStep': 'ApprovalPolicyStep',
    'costTransaction': 'CostTransaction',
    'CostTransaction': 'CostTransaction',
    'contract': 'Contract',
    'Contract': 'Contract',
    'workflow': 'Workflow',
    'Workflow': 'Workflow',
    'idpInboxEvent': 'IdpInboxEvent',
    'IdpInboxEvent': 'IdpInboxEvent',
    'workItemStatus': 'WorkItemStatus',
    'WorkItemStatus': 'WorkItemStatus',
    'projectLifecycleStep': 'ProjectLifecycleStep',
    'ProjectLifecycleStep': 'ProjectLifecycleStep',
    'progressReport': 'ProgressReport',
    'ProgressReport': 'ProgressReport',
    'timeEntry': 'TimeEntry',
    'TimeEntry': 'TimeEntry',
    'vendor': 'Vendor',
    'Vendor': 'Vendor',
    'lifecycleTemplateStep': 'LifecycleTemplateStep',
    'LifecycleTemplateStep': 'LifecycleTemplateStep',
    'rfqResponse': 'RfqResponse',
    'RfqResponse': 'RfqResponse',
    'timesheet': 'Timesheet',
    'Timesheet': 'Timesheet',
    'equipmentSiteLog': 'EquipmentSiteLog',
    'EquipmentSiteLog': 'EquipmentSiteLog',
    'site': 'Site',
    'Site': 'Site',
    'checklist': 'Checklist',
    'Checklist': 'Checklist',
    'handover': 'Handover',
    'Handover': 'Handover',
    'projectCategory': 'ProjectCategory',
    'ProjectCategory': 'ProjectCategory',
    'closureTemplateItem': 'ClosureTemplateItem',
    'ClosureTemplateItem': 'ClosureTemplateItem',
    'sprintCapacity': 'SprintCapacity',
    'SprintCapacity': 'SprintCapacity',
    'risk': 'Risk',
    'Risk': 'Risk',
    'comment': 'Comment',
    'Comment': 'Comment',
    'workCalendar': 'WorkCalendar',
    'WorkCalendar': 'WorkCalendar',
    'wbsNode': 'WbsNode',
    'WbsNode': 'WbsNode',
    'recurringWorkItem': 'RecurringWorkItem',
    'RecurringWorkItem': 'RecurringWorkItem',
    'lifecycleTemplate': 'LifecycleTemplate',
    'LifecycleTemplate': 'LifecycleTemplate',
    'resource': 'Resource',
    'Resource': 'Resource',
    'release': 'Release',
    'Release': 'Release',
    'savedReport': 'SavedReport',
    'SavedReport': 'SavedReport',
    'refreshToken': 'RefreshToken',
    'RefreshToken': 'RefreshToken',
    'userProfile': 'UserProfile',
    'UserProfile': 'UserProfile',
    'closureTemplate': 'ClosureTemplate',
    'ClosureTemplate': 'ClosureTemplate',
    'budgetLine': 'BudgetLine',
    'BudgetLine': 'BudgetLine',
    'baseline': 'Baseline',
    'Baseline': 'Baseline',
    'workItemDependency': 'WorkItemDependency',
    'WorkItemDependency': 'WorkItemDependency',
    'portfolio': 'Portfolio',
    'Portfolio': 'Portfolio',
    'rolesAndPermissions': 'RolesAndPermissions',
    'RolesAndPermissions': 'RolesAndPermissions',
    'workflowRule': 'WorkflowRule',
    'WorkflowRule': 'WorkflowRule',
    'maintenanceLog': 'MaintenanceLog',
    'MaintenanceLog': 'MaintenanceLog',
    'sprint': 'Sprint',
    'Sprint': 'Sprint',
    'punchListItem': 'PunchListItem',
    'PunchListItem': 'PunchListItem',
    'project': 'Project',
    'Project': 'Project',
    'approvalStep': 'ApprovalStep',
    'ApprovalStep': 'ApprovalStep',
    'procurement': 'Procurement',
    'Procurement': 'Procurement',
    'closureItem': 'ClosureItem',
    'ClosureItem': 'ClosureItem',
    'businessUnit': 'BusinessUnit',
    'BusinessUnit': 'BusinessUnit',
    'riskMitigation': 'RiskMitigation',
    'RiskMitigation': 'RiskMitigation',
    'projectConflict': 'ProjectConflict',
    'ProjectConflict': 'ProjectConflict',
    'statusTransition': 'StatusTransition',
    'StatusTransition': 'StatusTransition',
    'notification': 'Notification',
    'Notification': 'Notification',
    'benchmark': 'Benchmark',
    'Benchmark': 'Benchmark',
    'approvalRequest': 'ApprovalRequest',
    'ApprovalRequest': 'ApprovalRequest',
    'workItemAssignee': 'WorkItemAssignee',
    'WorkItemAssignee': 'WorkItemAssignee',
    'apiKey': 'ApiKey',
    'ApiKey': 'ApiKey',
    'user': 'User',
    'User': 'User',
    'baselineItem': 'BaselineItem',
    'BaselineItem': 'BaselineItem',
    'escalation': 'Escalation',
    'Escalation': 'Escalation',
    'workflowVersion': 'WorkflowVersion',
    'WorkflowVersion': 'WorkflowVersion',
    'workflowTask': 'WorkflowTask',
    'WorkflowTask': 'WorkflowTask',
    'workflowTimer': 'WorkflowTimer',
    'WorkflowTimer': 'WorkflowTimer',
    'workflowSchedule': 'WorkflowSchedule',
    'WorkflowSchedule': 'WorkflowSchedule',
    'agentSetting': 'AgentSetting',
    'AgentSetting': 'AgentSetting',
    'agentRun': 'AgentRun',
    'AgentRun': 'AgentRun',
    'agentRunStep': 'AgentRunStep',
    'AgentRunStep': 'AgentRunStep',
    'agentConversation': 'AgentConversation',
    'AgentConversation': 'AgentConversation',
    'agentMessage': 'AgentMessage',
    'AgentMessage': 'AgentMessage',
    'agent': 'Agent',
    'Agent': 'Agent',
    'mailSetting': 'MailSetting',
    'MailSetting': 'MailSetting',
    'authSetting': 'AuthSetting',
    'AuthSetting': 'AuthSetting',
    'authSetupToken': 'AuthSetupToken',
    'AuthSetupToken': 'AuthSetupToken',
    'authLoginCode': 'AuthLoginCode',
    'AuthLoginCode': 'AuthLoginCode',
    'authSessionRevocation': 'AuthSessionRevocation',
    'AuthSessionRevocation': 'AuthSessionRevocation',
    'builderKey': 'BuilderKey',
    'BuilderKey': 'BuilderKey',
    'dashboardEngineConnection': 'DashboardEngineConnection',
    'DashboardEngineConnection': 'DashboardEngineConnection',
    'dashboardEngineOrg': 'DashboardEngineOrg',
    'DashboardEngineOrg': 'DashboardEngineOrg',
    'embeddedDashboard': 'EmbeddedDashboard',
    'EmbeddedDashboard': 'EmbeddedDashboard',
  };
  const repoFactory = new PGliteRepositoryFactory(db, tableMap);



  // Internal hooks fire synchronously (workflow triggers cascade)
  const hooks: EntityLifecycleHooks = {
    internal: {
      // Preview exercises the DATA layer, not the workflow engine. It previously
      // constructed a legacy interpreter here and never invoked it — dead weight
      // that also kept the retired engine alive. Running workflows in preview
      // means driving the PULSE interpreter with PGlite-backed services; until
      // that exists, the event is logged rather than silently pretended.
      onEntityEvent: (entityName: string, event: string, data: any) => {
        console.log(`[Preview] ${entityName}.${event} — workflows do not run in preview`, data);
      },
      onUiAction: (actionName: string, data: any) => {
        console.log(`[Preview Hook] uiAction:${actionName}`, data);
      },
    },
  };

  // Create logic instances
    const approvalPolicyLogic = new ApprovalPolicyLogic(approvalPolicyRepo, hooks);
    const sprintSnapshotLogic = new SprintSnapshotLogic(sprintSnapshotRepo, hooks);
    const lessonLogic = new LessonLogic(lessonRepo, hooks);
    const commentMentionLogic = new CommentMentionLogic(commentMentionRepo, hooks);
    const maintenanceScheduleLogic = new MaintenanceScheduleLogic(maintenanceScheduleRepo, hooks);
    const resourceAssignmentLogic = new ResourceAssignmentLogic(resourceAssignmentRepo, hooks);
    const epsLogic = new EpsLogic(epsRepo, hooks);
    const organizationLogic = new OrganizationLogic(organizationRepo, hooks);
    const inspectionLogic = new InspectionLogic(inspectionRepo, hooks);
    const workItemLinkLogic = new WorkItemLinkLogic(workItemLinkRepo, hooks);
    const activityLogLogic = new ActivityLogLogic(activityLogRepo, hooks);
    const calendarExceptionLogic = new CalendarExceptionLogic(calendarExceptionRepo, hooks);
    const alertLogic = new AlertLogic(alertRepo, hooks);
    const evmSnapshotLogic = new EvmSnapshotLogic(evmSnapshotRepo, hooks);
    const workItemLogic = new WorkItemLogic(workItemRepo, hooks);
    const integrationConnectionLogic = new IntegrationConnectionLogic(integrationConnectionRepo, hooks);
    const documentLogic = new DocumentLogic(documentRepo, hooks);
    const organizationSettingsLogic = new OrganizationSettingsLogic(organizationSettingsRepo, hooks);
    const projectMemberLogic = new ProjectMemberLogic(projectMemberRepo, hooks);
    const projectClosureLogic = new ProjectClosureLogic(projectClosureRepo, hooks);
    const checklistItemLogic = new ChecklistItemLogic(checklistItemRepo, hooks);
    const approvalPolicyStepLogic = new ApprovalPolicyStepLogic(approvalPolicyStepRepo, hooks);
    const costTransactionLogic = new CostTransactionLogic(costTransactionRepo, hooks);
    const contractLogic = new ContractLogic(contractRepo, hooks);
    const workflowLogic = new WorkflowLogic(workflowRepo, hooks);
    const idpInboxEventLogic = new IdpInboxEventLogic(idpInboxEventRepo, hooks);
    const workItemStatusLogic = new WorkItemStatusLogic(workItemStatusRepo, hooks);
    const projectLifecycleStepLogic = new ProjectLifecycleStepLogic(projectLifecycleStepRepo, hooks);
    const progressReportLogic = new ProgressReportLogic(progressReportRepo, hooks);
    const timeEntryLogic = new TimeEntryLogic(timeEntryRepo, hooks);
    const vendorLogic = new VendorLogic(vendorRepo, hooks);
    const lifecycleTemplateStepLogic = new LifecycleTemplateStepLogic(lifecycleTemplateStepRepo, hooks);
    const rfqResponseLogic = new RfqResponseLogic(rfqResponseRepo, hooks);
    const timesheetLogic = new TimesheetLogic(timesheetRepo, hooks);
    const equipmentSiteLogLogic = new EquipmentSiteLogLogic(equipmentSiteLogRepo, hooks);
    const siteLogic = new SiteLogic(siteRepo, hooks);
    const checklistLogic = new ChecklistLogic(checklistRepo, hooks);
    const handoverLogic = new HandoverLogic(handoverRepo, hooks);
    const projectCategoryLogic = new ProjectCategoryLogic(projectCategoryRepo, hooks);
    const closureTemplateItemLogic = new ClosureTemplateItemLogic(closureTemplateItemRepo, hooks);
    const sprintCapacityLogic = new SprintCapacityLogic(sprintCapacityRepo, hooks);
    const riskLogic = new RiskLogic(riskRepo, hooks);
    const commentLogic = new CommentLogic(commentRepo, hooks);
    const workCalendarLogic = new WorkCalendarLogic(workCalendarRepo, hooks);
    const wbsNodeLogic = new WbsNodeLogic(wbsNodeRepo, hooks);
    const recurringWorkItemLogic = new RecurringWorkItemLogic(recurringWorkItemRepo, hooks);
    const lifecycleTemplateLogic = new LifecycleTemplateLogic(lifecycleTemplateRepo, hooks);
    const resourceLogic = new ResourceLogic(resourceRepo, hooks);
    const releaseLogic = new ReleaseLogic(releaseRepo, hooks);
    const savedReportLogic = new SavedReportLogic(savedReportRepo, hooks);
    const refreshTokenLogic = new RefreshTokenLogic(refreshTokenRepo, hooks);
    const userProfileLogic = new UserProfileLogic(userProfileRepo, hooks);
    const closureTemplateLogic = new ClosureTemplateLogic(closureTemplateRepo, hooks);
    const budgetLineLogic = new BudgetLineLogic(budgetLineRepo, hooks);
    const baselineLogic = new BaselineLogic(baselineRepo, hooks);
    const workItemDependencyLogic = new WorkItemDependencyLogic(workItemDependencyRepo, hooks);
    const portfolioLogic = new PortfolioLogic(portfolioRepo, hooks);
    const rolesAndPermissionsLogic = new RolesAndPermissionsLogic(rolesAndPermissionsRepo, hooks);
    const workflowRuleLogic = new WorkflowRuleLogic(workflowRuleRepo, hooks);
    const maintenanceLogLogic = new MaintenanceLogLogic(maintenanceLogRepo, hooks);
    const sprintLogic = new SprintLogic(sprintRepo, hooks);
    const punchListItemLogic = new PunchListItemLogic(punchListItemRepo, hooks);
    const projectLogic = new ProjectLogic(projectRepo, hooks);
    const approvalStepLogic = new ApprovalStepLogic(approvalStepRepo, hooks);
    const procurementLogic = new ProcurementLogic(procurementRepo, hooks);
    const closureItemLogic = new ClosureItemLogic(closureItemRepo, hooks);
    const businessUnitLogic = new BusinessUnitLogic(businessUnitRepo, hooks);
    const riskMitigationLogic = new RiskMitigationLogic(riskMitigationRepo, hooks);
    const projectConflictLogic = new ProjectConflictLogic(projectConflictRepo, hooks);
    const statusTransitionLogic = new StatusTransitionLogic(statusTransitionRepo, hooks);
    const notificationLogic = new NotificationLogic(notificationRepo, hooks);
    const benchmarkLogic = new BenchmarkLogic(benchmarkRepo, hooks);
    const approvalRequestLogic = new ApprovalRequestLogic(approvalRequestRepo, hooks);
    const workItemAssigneeLogic = new WorkItemAssigneeLogic(workItemAssigneeRepo, hooks);
    const apiKeyLogic = new ApiKeyLogic(apiKeyRepo, hooks);
    const userLogic = new UserLogic(userRepo, hooks, async (p: string) => { const bcryptjs = await import('bcryptjs'); return bcryptjs.default.hash(p, 10); });
    const baselineItemLogic = new BaselineItemLogic(baselineItemRepo, hooks);
    const escalationLogic = new EscalationLogic(escalationRepo, hooks);
    const workflowVersionLogic = new WorkflowVersionLogic(workflowVersionRepo, hooks);
    const workflowTaskLogic = new WorkflowTaskLogic(workflowTaskRepo, hooks);
    const workflowTimerLogic = new WorkflowTimerLogic(workflowTimerRepo, hooks);
    const workflowScheduleLogic = new WorkflowScheduleLogic(workflowScheduleRepo, hooks);
    const agentSettingLogic = new AgentSettingLogic(agentSettingRepo, hooks);
    const agentRunLogic = new AgentRunLogic(agentRunRepo, hooks);
    const agentRunStepLogic = new AgentRunStepLogic(agentRunStepRepo, hooks);
    const agentConversationLogic = new AgentConversationLogic(agentConversationRepo, hooks);
    const agentMessageLogic = new AgentMessageLogic(agentMessageRepo, hooks);
    const agentLogic = new AgentLogic(agentRepo, hooks);
    const mailSettingLogic = new MailSettingLogic(mailSettingRepo, hooks);
    const authSettingLogic = new AuthSettingLogic(authSettingRepo, hooks);
    const authSetupTokenLogic = new AuthSetupTokenLogic(authSetupTokenRepo, hooks);
    const authLoginCodeLogic = new AuthLoginCodeLogic(authLoginCodeRepo, hooks);
    const authSessionRevocationLogic = new AuthSessionRevocationLogic(authSessionRevocationRepo, hooks);
    const builderKeyLogic = new BuilderKeyLogic(builderKeyRepo, hooks);
    const dashboardEngineConnectionLogic = new DashboardEngineConnectionLogic(dashboardEngineConnectionRepo, hooks);
    const dashboardEngineOrgLogic = new DashboardEngineOrgLogic(dashboardEngineOrgRepo, hooks);
    const embeddedDashboardLogic = new EmbeddedDashboardLogic(embeddedDashboardRepo, hooks);

  // Register in route map
  logicMap = {
    'approvalPolicy': approvalPolicyLogic,
    'sprintSnapshot': sprintSnapshotLogic,
    'lesson': lessonLogic,
    'commentMention': commentMentionLogic,
    'maintenanceSchedule': maintenanceScheduleLogic,
    'resourceAssignment': resourceAssignmentLogic,
    'eps': epsLogic,
    'organization': organizationLogic,
    'inspection': inspectionLogic,
    'workItemLink': workItemLinkLogic,
    'activityLog': activityLogLogic,
    'calendarException': calendarExceptionLogic,
    'alert': alertLogic,
    'evmSnapshot': evmSnapshotLogic,
    'workItem': workItemLogic,
    'integrationConnection': integrationConnectionLogic,
    'document': documentLogic,
    'organizationSettings': organizationSettingsLogic,
    'projectMember': projectMemberLogic,
    'projectClosure': projectClosureLogic,
    'checklistItem': checklistItemLogic,
    'approvalPolicyStep': approvalPolicyStepLogic,
    'costTransaction': costTransactionLogic,
    'contract': contractLogic,
    'workflow': workflowLogic,
    'idpInboxEvent': idpInboxEventLogic,
    'workItemStatus': workItemStatusLogic,
    'projectLifecycleStep': projectLifecycleStepLogic,
    'progressReport': progressReportLogic,
    'timeEntry': timeEntryLogic,
    'vendor': vendorLogic,
    'lifecycleTemplateStep': lifecycleTemplateStepLogic,
    'rfqResponse': rfqResponseLogic,
    'timesheet': timesheetLogic,
    'equipmentSiteLog': equipmentSiteLogLogic,
    'site': siteLogic,
    'checklist': checklistLogic,
    'handover': handoverLogic,
    'projectCategory': projectCategoryLogic,
    'closureTemplateItem': closureTemplateItemLogic,
    'sprintCapacity': sprintCapacityLogic,
    'risk': riskLogic,
    'comment': commentLogic,
    'workCalendar': workCalendarLogic,
    'wbsNode': wbsNodeLogic,
    'recurringWorkItem': recurringWorkItemLogic,
    'lifecycleTemplate': lifecycleTemplateLogic,
    'resource': resourceLogic,
    'release': releaseLogic,
    'savedReport': savedReportLogic,
    'refreshToken': refreshTokenLogic,
    'userProfile': userProfileLogic,
    'closureTemplate': closureTemplateLogic,
    'budgetLine': budgetLineLogic,
    'baseline': baselineLogic,
    'workItemDependency': workItemDependencyLogic,
    'portfolio': portfolioLogic,
    'rolesAndPermissions': rolesAndPermissionsLogic,
    'workflowRule': workflowRuleLogic,
    'maintenanceLog': maintenanceLogLogic,
    'sprint': sprintLogic,
    'punchListItem': punchListItemLogic,
    'project': projectLogic,
    'approvalStep': approvalStepLogic,
    'procurement': procurementLogic,
    'closureItem': closureItemLogic,
    'businessUnit': businessUnitLogic,
    'riskMitigation': riskMitigationLogic,
    'projectConflict': projectConflictLogic,
    'statusTransition': statusTransitionLogic,
    'notification': notificationLogic,
    'benchmark': benchmarkLogic,
    'approvalRequest': approvalRequestLogic,
    'workItemAssignee': workItemAssigneeLogic,
    'apiKey': apiKeyLogic,
    'user': userLogic,
    'baselineItem': baselineItemLogic,
    'escalation': escalationLogic,
    'workflowVersion': workflowVersionLogic,
    'workflowTask': workflowTaskLogic,
    'workflowTimer': workflowTimerLogic,
    'workflowSchedule': workflowScheduleLogic,
    'agentSetting': agentSettingLogic,
    'agentRun': agentRunLogic,
    'agentRunStep': agentRunStepLogic,
    'agentConversation': agentConversationLogic,
    'agentMessage': agentMessageLogic,
    'agent': agentLogic,
    'mailSetting': mailSettingLogic,
    'authSetting': authSettingLogic,
    'authSetupToken': authSetupTokenLogic,
    'authLoginCode': authLoginCodeLogic,
    'authSessionRevocation': authSessionRevocationLogic,
    'builderKey': builderKeyLogic,
    'dashboardEngineConnection': dashboardEngineConnectionLogic,
    'dashboardEngineOrg': dashboardEngineOrgLogic,
    'embeddedDashboard': embeddedDashboardLogic,
  };

  // Auth logic
  const userRepo = userRepo;
  authLogic = new AuthLogic(userRepo, {
    comparePassword: async (password: string, hash: string) => {
      const bcryptjs = await import('bcryptjs');
      return bcryptjs.default.compare(password, hash);
    },
    hashPassword: async (password: string) => {
      const bcryptjs = await import('bcryptjs');
      return bcryptjs.default.hash(password, 10);
    },
    signToken: (payload: any) => {
      // Simple base64 token for preview (no real JWT needed)
      return btoa(JSON.stringify(payload));
    },
  });

  return { success: true, models: Object.keys(logicMap) };
}

async function handleRpc(method: string, params: any): Promise<any> {
  // Auth methods
  if (method === 'auth.login') {
    if (!authLogic) throw new Error('Auth not configured');
    return authLogic.login(params.email, params.password);
  }

  // Model methods: "{model}.{method}"
  const [modelName, action] = method.split('.');
  const logic = logicMap[modelName];
  if (!logic) throw new Error(`Unknown model: ${modelName}`);

  switch (action) {
    case 'getAll':
      return logic.getAll(params);
    case 'getById':
      return logic.getById(params.id);
    case 'create':
      return logic.create(params.data || params, params.userId);
    case 'update':
      return logic.update(params.id, params.data || params, params.userId);
    case 'remove':
      return logic.remove(params.id);
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// Web Worker message handler
self.onmessage = async (event: MessageEvent) => {
  const { id, type, ...rest } = event.data;

  try {
    let result: any;

    if (type === 'init') {
      result = await init(rest.ddl);
    } else if (type === 'rpc') {
      result = await handleRpc(rest.method, rest.params || {});
    } else {
      throw new Error(`Unknown message type: ${type}`);
    }

    self.postMessage({ id, result });
  } catch (error: any) {
    self.postMessage({ id, error: error.message || String(error) });
  }
};
