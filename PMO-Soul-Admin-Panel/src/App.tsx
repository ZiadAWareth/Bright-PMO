import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, RequireAuth } from '@/lib/auth';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppLayout } from '@/components/layout/app-layout';
import Login from '@/pages/login';
import SetPassword from '@/pages/set-password';
import ForgotPassword from '@/pages/forgot-password';
import ProfilePage from '@/pages/profile';
import Dashboard from '@/pages/analytics/dashboard';
import ReportBuilder from '@/pages/reports/report-builder';
import SavedReports from '@/pages/reports/saved-reports';
import DynamicDashboards from '@/pages/dynamic-dashboards';
import DynamicDashboardView from '@/pages/dynamic-dashboards/view';
import DashboardEngineSettings from '@/pages/dynamic-dashboards/settings';
import DashboardEngineCallback from '@/pages/dynamic-dashboards/callback';
import MyTasks from '@/pages/my-tasks';
import DesignFrontend from '@/pages/design-frontend';
import { RequireFeature } from '@/lib/features';
import WorkflowListPage from '@/workflow/WorkflowListPage';
import WorkflowModelerPage from '@/workflow/WorkflowModelerPage';
import WorkflowRunsPage from '@/workflow/WorkflowRunsPage';
import WorkflowRunDetailPage from '@/workflow/WorkflowRunDetailPage';
import WorkflowTasksPage from '@/workflow/WorkflowTasksPage';
import AgentKnowledge from '@/pages/agent/knowledge';
import AgentSettings from '@/pages/agent/settings';
import ConnectionsPage from '@/pages/settings/connections';
import SignInSettings from '@/pages/settings/sign-in';
import AgentAssistant from '@/pages/agent/assistant';
import AgentsPage from '@/pages/agent/agents';
import AgentEditorPage from '@/pages/agent/agent-editor';
import { ApprovalPolicyList, ApprovalPolicyCreate, ApprovalPolicyEdit, ApprovalPolicyShow } from '@/resources/ApprovalPolicy';
import { SprintSnapshotList, SprintSnapshotCreate, SprintSnapshotEdit, SprintSnapshotShow } from '@/resources/SprintSnapshot';
import { LessonList, LessonCreate, LessonEdit, LessonShow } from '@/resources/Lesson';
import { CommentMentionList, CommentMentionCreate, CommentMentionEdit, CommentMentionShow } from '@/resources/CommentMention';
import { MaintenanceScheduleList, MaintenanceScheduleCreate, MaintenanceScheduleEdit, MaintenanceScheduleShow } from '@/resources/MaintenanceSchedule';
import { ResourceAssignmentList, ResourceAssignmentCreate, ResourceAssignmentEdit, ResourceAssignmentShow } from '@/resources/ResourceAssignment';
import { EpsList, EpsCreate, EpsEdit, EpsShow } from '@/resources/Eps';
import { OrganizationList, OrganizationCreate, OrganizationEdit, OrganizationShow } from '@/resources/Organization';
import { InspectionList, InspectionCreate, InspectionEdit, InspectionShow } from '@/resources/Inspection';
import { WorkItemLinkList, WorkItemLinkCreate, WorkItemLinkEdit, WorkItemLinkShow } from '@/resources/WorkItemLink';
import { ActivityLogList, ActivityLogCreate, ActivityLogEdit, ActivityLogShow } from '@/resources/ActivityLog';
import { CalendarExceptionList, CalendarExceptionCreate, CalendarExceptionEdit, CalendarExceptionShow } from '@/resources/CalendarException';
import { AlertList, AlertCreate, AlertEdit, AlertShow } from '@/resources/Alert';
import { EvmSnapshotList, EvmSnapshotCreate, EvmSnapshotEdit, EvmSnapshotShow } from '@/resources/EvmSnapshot';
import { WorkItemList, WorkItemCreate, WorkItemEdit, WorkItemShow } from '@/resources/WorkItem';
import { IntegrationConnectionList, IntegrationConnectionCreate, IntegrationConnectionEdit, IntegrationConnectionShow } from '@/resources/IntegrationConnection';
import { DocumentList, DocumentCreate, DocumentEdit, DocumentShow } from '@/resources/Document';
import { OrganizationSettingsList, OrganizationSettingsCreate, OrganizationSettingsEdit, OrganizationSettingsShow } from '@/resources/OrganizationSettings';
import { ProjectMemberList, ProjectMemberCreate, ProjectMemberEdit, ProjectMemberShow } from '@/resources/ProjectMember';
import { ProjectClosureList, ProjectClosureCreate, ProjectClosureEdit, ProjectClosureShow } from '@/resources/ProjectClosure';
import { ChecklistItemList, ChecklistItemCreate, ChecklistItemEdit, ChecklistItemShow } from '@/resources/ChecklistItem';
import { ApprovalPolicyStepList, ApprovalPolicyStepCreate, ApprovalPolicyStepEdit, ApprovalPolicyStepShow } from '@/resources/ApprovalPolicyStep';
import { CostTransactionList, CostTransactionCreate, CostTransactionEdit, CostTransactionShow } from '@/resources/CostTransaction';
import { ContractList, ContractCreate, ContractEdit, ContractShow } from '@/resources/Contract';
import { IdpInboxEventList, IdpInboxEventCreate, IdpInboxEventEdit, IdpInboxEventShow } from '@/resources/IdpInboxEvent';
import { WorkItemStatusList, WorkItemStatusCreate, WorkItemStatusEdit, WorkItemStatusShow } from '@/resources/WorkItemStatus';
import { ProjectLifecycleStepList, ProjectLifecycleStepCreate, ProjectLifecycleStepEdit, ProjectLifecycleStepShow } from '@/resources/ProjectLifecycleStep';
import { ProgressReportList, ProgressReportCreate, ProgressReportEdit, ProgressReportShow } from '@/resources/ProgressReport';
import { TimeEntryList, TimeEntryCreate, TimeEntryEdit, TimeEntryShow } from '@/resources/TimeEntry';
import { VendorList, VendorCreate, VendorEdit, VendorShow } from '@/resources/Vendor';
import { LifecycleTemplateStepList, LifecycleTemplateStepCreate, LifecycleTemplateStepEdit, LifecycleTemplateStepShow } from '@/resources/LifecycleTemplateStep';
import { RfqResponseList, RfqResponseCreate, RfqResponseEdit, RfqResponseShow } from '@/resources/RfqResponse';
import { TimesheetList, TimesheetCreate, TimesheetEdit, TimesheetShow } from '@/resources/Timesheet';
import { EquipmentSiteLogList, EquipmentSiteLogCreate, EquipmentSiteLogEdit, EquipmentSiteLogShow } from '@/resources/EquipmentSiteLog';
import { SiteList, SiteCreate, SiteEdit, SiteShow } from '@/resources/Site';
import { ChecklistList, ChecklistCreate, ChecklistEdit, ChecklistShow } from '@/resources/Checklist';
import { HandoverList, HandoverCreate, HandoverEdit, HandoverShow } from '@/resources/Handover';
import { ProjectCategoryList, ProjectCategoryCreate, ProjectCategoryEdit, ProjectCategoryShow } from '@/resources/ProjectCategory';
import { ClosureTemplateItemList, ClosureTemplateItemCreate, ClosureTemplateItemEdit, ClosureTemplateItemShow } from '@/resources/ClosureTemplateItem';
import { SprintCapacityList, SprintCapacityCreate, SprintCapacityEdit, SprintCapacityShow } from '@/resources/SprintCapacity';
import { RiskList, RiskCreate, RiskEdit, RiskShow } from '@/resources/Risk';
import { CommentList, CommentCreate, CommentEdit, CommentShow } from '@/resources/Comment';
import { WorkCalendarList, WorkCalendarCreate, WorkCalendarEdit, WorkCalendarShow } from '@/resources/WorkCalendar';
import { WbsNodeList, WbsNodeCreate, WbsNodeEdit, WbsNodeShow } from '@/resources/WbsNode';
import { RecurringWorkItemList, RecurringWorkItemCreate, RecurringWorkItemEdit, RecurringWorkItemShow } from '@/resources/RecurringWorkItem';
import { LifecycleTemplateList, LifecycleTemplateCreate, LifecycleTemplateEdit, LifecycleTemplateShow } from '@/resources/LifecycleTemplate';
import { ResourceList, ResourceCreate, ResourceEdit, ResourceShow } from '@/resources/Resource';
import { ReleaseList, ReleaseCreate, ReleaseEdit, ReleaseShow } from '@/resources/Release';
import { RefreshTokenList, RefreshTokenCreate, RefreshTokenEdit, RefreshTokenShow } from '@/resources/RefreshToken';
import { UserProfileList, UserProfileCreate, UserProfileEdit, UserProfileShow } from '@/resources/UserProfile';
import { ClosureTemplateList, ClosureTemplateCreate, ClosureTemplateEdit, ClosureTemplateShow } from '@/resources/ClosureTemplate';
import { BudgetLineList, BudgetLineCreate, BudgetLineEdit, BudgetLineShow } from '@/resources/BudgetLine';
import { BaselineList, BaselineCreate, BaselineEdit, BaselineShow } from '@/resources/Baseline';
import { WorkItemDependencyList, WorkItemDependencyCreate, WorkItemDependencyEdit, WorkItemDependencyShow } from '@/resources/WorkItemDependency';
import { PortfolioList, PortfolioCreate, PortfolioEdit, PortfolioShow } from '@/resources/Portfolio';
import { RolesAndPermissionsList, RolesAndPermissionsCreate, RolesAndPermissionsEdit, RolesAndPermissionsShow } from '@/resources/RolesAndPermissions';
import { WorkflowRuleList, WorkflowRuleCreate, WorkflowRuleEdit, WorkflowRuleShow } from '@/resources/WorkflowRule';
import { MaintenanceLogList, MaintenanceLogCreate, MaintenanceLogEdit, MaintenanceLogShow } from '@/resources/MaintenanceLog';
import { SprintList, SprintCreate, SprintEdit, SprintShow } from '@/resources/Sprint';
import { PunchListItemList, PunchListItemCreate, PunchListItemEdit, PunchListItemShow } from '@/resources/PunchListItem';
import { ProjectList, ProjectCreate, ProjectEdit, ProjectShow } from '@/resources/Project';
import { ApprovalStepList, ApprovalStepCreate, ApprovalStepEdit, ApprovalStepShow } from '@/resources/ApprovalStep';
import { ProcurementList, ProcurementCreate, ProcurementEdit, ProcurementShow } from '@/resources/Procurement';
import { ClosureItemList, ClosureItemCreate, ClosureItemEdit, ClosureItemShow } from '@/resources/ClosureItem';
import { BusinessUnitList, BusinessUnitCreate, BusinessUnitEdit, BusinessUnitShow } from '@/resources/BusinessUnit';
import { RiskMitigationList, RiskMitigationCreate, RiskMitigationEdit, RiskMitigationShow } from '@/resources/RiskMitigation';
import { ProjectConflictList, ProjectConflictCreate, ProjectConflictEdit, ProjectConflictShow } from '@/resources/ProjectConflict';
import { StatusTransitionList, StatusTransitionCreate, StatusTransitionEdit, StatusTransitionShow } from '@/resources/StatusTransition';
import { BenchmarkList, BenchmarkCreate, BenchmarkEdit, BenchmarkShow } from '@/resources/Benchmark';
import { ApprovalRequestList, ApprovalRequestCreate, ApprovalRequestEdit, ApprovalRequestShow } from '@/resources/ApprovalRequest';
import { WorkItemAssigneeList, WorkItemAssigneeCreate, WorkItemAssigneeEdit, WorkItemAssigneeShow } from '@/resources/WorkItemAssignee';
import { ApiKeyList, ApiKeyCreate, ApiKeyEdit, ApiKeyShow } from '@/resources/ApiKey';
import { UserList, UserCreate, UserEdit, UserShow } from '@/resources/User';
import { BaselineItemList, BaselineItemCreate, BaselineItemEdit, BaselineItemShow } from '@/resources/BaselineItem';
import { EscalationList, EscalationCreate, EscalationEdit, EscalationShow } from '@/resources/Escalation';


/** An old /workflows/… address, sent on to its /automation/… home with its id and query kept
 *  (?version=3, ?history=1, ?runId=…). */
function LegacyAutomationRedirect({ to }: { to: string }) {
  const params = useParams();
  const { search, hash } = useLocation();
  const path = to.replace(/:(\w+)/g, (_m, k) => encodeURIComponent(params[k] ?? ''));
  return <Navigate to={path + search + hash} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <TooltipProvider delayDuration={200}>
        <Routes>
          <Route path="/login" element={<Login />} />
          {/* PUBLIC, and outside RequireAuth on purpose: an invited person has no session yet. The
              single-use token in the query string is what authenticates them. */}
          <Route path="/set-password" element={<SetPassword />} />
          {/* PUBLIC too: the person who forgot their password has, by definition, no session. */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/analytics/dashboard" replace />} />
            <Route path="/analytics/dashboard" element={<Dashboard />} />
            <Route path="/analytics/report-builder" element={<ReportBuilder />} />
            <Route path="/reports" element={<SavedReports />} />
            <Route path="/analytics/dynamic-dashboards" element={<RequireFeature feature="dynamicDashboards"><DynamicDashboards /></RequireFeature>} />
            <Route path="/analytics/dynamic-dashboards/:id" element={<RequireFeature feature="dynamicDashboards"><DynamicDashboardView /></RequireFeature>} />
            <Route path="/settings/dashboard-engine" element={<RequireFeature feature="manageDynamicDashboards"><DashboardEngineSettings /></RequireFeature>} />
            {/* Where the Dashboard Engine returns the app owner after approving the connection. */}
            <Route path="/settings/dashboard-engine/callback" element={<RequireFeature feature="manageDynamicDashboards"><DashboardEngineCallback /></RequireFeature>} />
            <Route path="/my-tasks" element={<MyTasks />} />
            {/* Every signed-in person's own account: no permission needed, it is only ever about them. */}
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/design-frontend" element={<RequireFeature feature="designFrontend"><DesignFrontend /></RequireFeature>} />
            {/* Automation: workflows, their runs and their tasks, each at its own address, so the
                menu never lights two of them at once (runs used to sit under /workflows). */}
            <Route path="/automation/workflows" element={<WorkflowListPage />} />
            <Route path="/automation/workflows/new" element={<WorkflowModelerPage />} />
            <Route path="/automation/workflows/:id" element={<WorkflowModelerPage />} />
            <Route path="/automation/runs" element={<WorkflowRunsPage />} />
            <Route path="/automation/runs/:runId" element={<WorkflowRunDetailPage />} />
            <Route path="/automation/tasks" element={<WorkflowTasksPage />} />
            {/* The old addresses (bookmarks, links already sent in notifications and emails). */}
            <Route path="/workflows" element={<Navigate to="/automation/workflows" replace />} />
            <Route path="/workflows/runs" element={<LegacyAutomationRedirect to="/automation/runs" />} />
            <Route path="/workflows/runs/:runId" element={<LegacyAutomationRedirect to="/automation/runs/:runId" />} />
            <Route path="/workflows/tasks" element={<LegacyAutomationRedirect to="/automation/tasks" />} />
            <Route path="/workflows/:id" element={<LegacyAutomationRedirect to="/automation/workflows/:id" />} />
            <Route path="/agent/assistant" element={<RequireFeature feature="assistant"><AgentAssistant /></RequireFeature>} />
            <Route path="/agent/knowledge" element={<AgentKnowledge />} />
            <Route path="/agent/settings" element={<RequireFeature feature="aiSettings"><AgentSettings /></RequireFeature>} />
            <Route path="/settings/sign-in" element={<RequireFeature feature="signInSettings"><SignInSettings /></RequireFeature>} />
            <Route path="/settings/connections" element={<RequireFeature feature="connections"><ConnectionsPage /></RequireFeature>} />
            <Route path="/agent/agents" element={<AgentsPage />} />
            <Route path="/agent/agents/new" element={<AgentEditorPage />} />
            <Route path="/agent/agents/:id/edit" element={<AgentEditorPage />} />
          <Route path="/approvalpolicy" element={<ApprovalPolicyList />} />
          <Route path="/approvalpolicy/new" element={<ApprovalPolicyCreate />} />
          <Route path="/approvalpolicy/:id" element={<ApprovalPolicyShow />} />
          <Route path="/approvalpolicy/:id/edit" element={<ApprovalPolicyEdit />} />
          <Route path="/sprintsnapshot" element={<SprintSnapshotList />} />
          <Route path="/sprintsnapshot/new" element={<SprintSnapshotCreate />} />
          <Route path="/sprintsnapshot/:id" element={<SprintSnapshotShow />} />
          <Route path="/sprintsnapshot/:id/edit" element={<SprintSnapshotEdit />} />
          <Route path="/lesson" element={<LessonList />} />
          <Route path="/lesson/new" element={<LessonCreate />} />
          <Route path="/lesson/:id" element={<LessonShow />} />
          <Route path="/lesson/:id/edit" element={<LessonEdit />} />
          <Route path="/commentmention" element={<CommentMentionList />} />
          <Route path="/commentmention/new" element={<CommentMentionCreate />} />
          <Route path="/commentmention/:id" element={<CommentMentionShow />} />
          <Route path="/commentmention/:id/edit" element={<CommentMentionEdit />} />
          <Route path="/maintenanceschedule" element={<MaintenanceScheduleList />} />
          <Route path="/maintenanceschedule/new" element={<MaintenanceScheduleCreate />} />
          <Route path="/maintenanceschedule/:id" element={<MaintenanceScheduleShow />} />
          <Route path="/maintenanceschedule/:id/edit" element={<MaintenanceScheduleEdit />} />
          <Route path="/resourceassignment" element={<ResourceAssignmentList />} />
          <Route path="/resourceassignment/new" element={<ResourceAssignmentCreate />} />
          <Route path="/resourceassignment/:id" element={<ResourceAssignmentShow />} />
          <Route path="/resourceassignment/:id/edit" element={<ResourceAssignmentEdit />} />
          <Route path="/eps" element={<EpsList />} />
          <Route path="/eps/new" element={<EpsCreate />} />
          <Route path="/eps/:id" element={<EpsShow />} />
          <Route path="/eps/:id/edit" element={<EpsEdit />} />
          <Route path="/organization" element={<OrganizationList />} />
          <Route path="/organization/new" element={<OrganizationCreate />} />
          <Route path="/organization/:id" element={<OrganizationShow />} />
          <Route path="/organization/:id/edit" element={<OrganizationEdit />} />
          <Route path="/inspection" element={<InspectionList />} />
          <Route path="/inspection/new" element={<InspectionCreate />} />
          <Route path="/inspection/:id" element={<InspectionShow />} />
          <Route path="/inspection/:id/edit" element={<InspectionEdit />} />
          <Route path="/workitemlink" element={<WorkItemLinkList />} />
          <Route path="/workitemlink/new" element={<WorkItemLinkCreate />} />
          <Route path="/workitemlink/:id" element={<WorkItemLinkShow />} />
          <Route path="/workitemlink/:id/edit" element={<WorkItemLinkEdit />} />
          <Route path="/activitylog" element={<ActivityLogList />} />
          <Route path="/activitylog/new" element={<ActivityLogCreate />} />
          <Route path="/activitylog/:id" element={<ActivityLogShow />} />
          <Route path="/activitylog/:id/edit" element={<ActivityLogEdit />} />
          <Route path="/calendarexception" element={<CalendarExceptionList />} />
          <Route path="/calendarexception/new" element={<CalendarExceptionCreate />} />
          <Route path="/calendarexception/:id" element={<CalendarExceptionShow />} />
          <Route path="/calendarexception/:id/edit" element={<CalendarExceptionEdit />} />
          <Route path="/alert" element={<AlertList />} />
          <Route path="/alert/new" element={<AlertCreate />} />
          <Route path="/alert/:id" element={<AlertShow />} />
          <Route path="/alert/:id/edit" element={<AlertEdit />} />
          <Route path="/evmsnapshot" element={<EvmSnapshotList />} />
          <Route path="/evmsnapshot/new" element={<EvmSnapshotCreate />} />
          <Route path="/evmsnapshot/:id" element={<EvmSnapshotShow />} />
          <Route path="/evmsnapshot/:id/edit" element={<EvmSnapshotEdit />} />
          <Route path="/workitem" element={<WorkItemList />} />
          <Route path="/workitem/new" element={<WorkItemCreate />} />
          <Route path="/workitem/:id" element={<WorkItemShow />} />
          <Route path="/workitem/:id/edit" element={<WorkItemEdit />} />
          <Route path="/integrationconnection" element={<IntegrationConnectionList />} />
          <Route path="/integrationconnection/new" element={<IntegrationConnectionCreate />} />
          <Route path="/integrationconnection/:id" element={<IntegrationConnectionShow />} />
          <Route path="/integrationconnection/:id/edit" element={<IntegrationConnectionEdit />} />
          <Route path="/document" element={<DocumentList />} />
          <Route path="/document/new" element={<DocumentCreate />} />
          <Route path="/document/:id" element={<DocumentShow />} />
          <Route path="/document/:id/edit" element={<DocumentEdit />} />
          <Route path="/organizationsettings" element={<OrganizationSettingsList />} />
          <Route path="/organizationsettings/new" element={<OrganizationSettingsCreate />} />
          <Route path="/organizationsettings/:id" element={<OrganizationSettingsShow />} />
          <Route path="/organizationsettings/:id/edit" element={<OrganizationSettingsEdit />} />
          <Route path="/projectmember" element={<ProjectMemberList />} />
          <Route path="/projectmember/new" element={<ProjectMemberCreate />} />
          <Route path="/projectmember/:id" element={<ProjectMemberShow />} />
          <Route path="/projectmember/:id/edit" element={<ProjectMemberEdit />} />
          <Route path="/projectclosure" element={<ProjectClosureList />} />
          <Route path="/projectclosure/new" element={<ProjectClosureCreate />} />
          <Route path="/projectclosure/:id" element={<ProjectClosureShow />} />
          <Route path="/projectclosure/:id/edit" element={<ProjectClosureEdit />} />
          <Route path="/checklistitem" element={<ChecklistItemList />} />
          <Route path="/checklistitem/new" element={<ChecklistItemCreate />} />
          <Route path="/checklistitem/:id" element={<ChecklistItemShow />} />
          <Route path="/checklistitem/:id/edit" element={<ChecklistItemEdit />} />
          <Route path="/approvalpolicystep" element={<ApprovalPolicyStepList />} />
          <Route path="/approvalpolicystep/new" element={<ApprovalPolicyStepCreate />} />
          <Route path="/approvalpolicystep/:id" element={<ApprovalPolicyStepShow />} />
          <Route path="/approvalpolicystep/:id/edit" element={<ApprovalPolicyStepEdit />} />
          <Route path="/costtransaction" element={<CostTransactionList />} />
          <Route path="/costtransaction/new" element={<CostTransactionCreate />} />
          <Route path="/costtransaction/:id" element={<CostTransactionShow />} />
          <Route path="/costtransaction/:id/edit" element={<CostTransactionEdit />} />
          <Route path="/contract" element={<ContractList />} />
          <Route path="/contract/new" element={<ContractCreate />} />
          <Route path="/contract/:id" element={<ContractShow />} />
          <Route path="/contract/:id/edit" element={<ContractEdit />} />
          <Route path="/idpinboxevent" element={<IdpInboxEventList />} />
          <Route path="/idpinboxevent/new" element={<IdpInboxEventCreate />} />
          <Route path="/idpinboxevent/:id" element={<IdpInboxEventShow />} />
          <Route path="/idpinboxevent/:id/edit" element={<IdpInboxEventEdit />} />
          <Route path="/workitemstatus" element={<WorkItemStatusList />} />
          <Route path="/workitemstatus/new" element={<WorkItemStatusCreate />} />
          <Route path="/workitemstatus/:id" element={<WorkItemStatusShow />} />
          <Route path="/workitemstatus/:id/edit" element={<WorkItemStatusEdit />} />
          <Route path="/projectlifecyclestep" element={<ProjectLifecycleStepList />} />
          <Route path="/projectlifecyclestep/new" element={<ProjectLifecycleStepCreate />} />
          <Route path="/projectlifecyclestep/:id" element={<ProjectLifecycleStepShow />} />
          <Route path="/projectlifecyclestep/:id/edit" element={<ProjectLifecycleStepEdit />} />
          <Route path="/progressreport" element={<ProgressReportList />} />
          <Route path="/progressreport/new" element={<ProgressReportCreate />} />
          <Route path="/progressreport/:id" element={<ProgressReportShow />} />
          <Route path="/progressreport/:id/edit" element={<ProgressReportEdit />} />
          <Route path="/timeentry" element={<TimeEntryList />} />
          <Route path="/timeentry/new" element={<TimeEntryCreate />} />
          <Route path="/timeentry/:id" element={<TimeEntryShow />} />
          <Route path="/timeentry/:id/edit" element={<TimeEntryEdit />} />
          <Route path="/vendor" element={<VendorList />} />
          <Route path="/vendor/new" element={<VendorCreate />} />
          <Route path="/vendor/:id" element={<VendorShow />} />
          <Route path="/vendor/:id/edit" element={<VendorEdit />} />
          <Route path="/lifecycletemplatestep" element={<LifecycleTemplateStepList />} />
          <Route path="/lifecycletemplatestep/new" element={<LifecycleTemplateStepCreate />} />
          <Route path="/lifecycletemplatestep/:id" element={<LifecycleTemplateStepShow />} />
          <Route path="/lifecycletemplatestep/:id/edit" element={<LifecycleTemplateStepEdit />} />
          <Route path="/rfqresponse" element={<RfqResponseList />} />
          <Route path="/rfqresponse/new" element={<RfqResponseCreate />} />
          <Route path="/rfqresponse/:id" element={<RfqResponseShow />} />
          <Route path="/rfqresponse/:id/edit" element={<RfqResponseEdit />} />
          <Route path="/timesheet" element={<TimesheetList />} />
          <Route path="/timesheet/new" element={<TimesheetCreate />} />
          <Route path="/timesheet/:id" element={<TimesheetShow />} />
          <Route path="/timesheet/:id/edit" element={<TimesheetEdit />} />
          <Route path="/equipmentsitelog" element={<EquipmentSiteLogList />} />
          <Route path="/equipmentsitelog/new" element={<EquipmentSiteLogCreate />} />
          <Route path="/equipmentsitelog/:id" element={<EquipmentSiteLogShow />} />
          <Route path="/equipmentsitelog/:id/edit" element={<EquipmentSiteLogEdit />} />
          <Route path="/site" element={<SiteList />} />
          <Route path="/site/new" element={<SiteCreate />} />
          <Route path="/site/:id" element={<SiteShow />} />
          <Route path="/site/:id/edit" element={<SiteEdit />} />
          <Route path="/checklist" element={<ChecklistList />} />
          <Route path="/checklist/new" element={<ChecklistCreate />} />
          <Route path="/checklist/:id" element={<ChecklistShow />} />
          <Route path="/checklist/:id/edit" element={<ChecklistEdit />} />
          <Route path="/handover" element={<HandoverList />} />
          <Route path="/handover/new" element={<HandoverCreate />} />
          <Route path="/handover/:id" element={<HandoverShow />} />
          <Route path="/handover/:id/edit" element={<HandoverEdit />} />
          <Route path="/projectcategory" element={<ProjectCategoryList />} />
          <Route path="/projectcategory/new" element={<ProjectCategoryCreate />} />
          <Route path="/projectcategory/:id" element={<ProjectCategoryShow />} />
          <Route path="/projectcategory/:id/edit" element={<ProjectCategoryEdit />} />
          <Route path="/closuretemplateitem" element={<ClosureTemplateItemList />} />
          <Route path="/closuretemplateitem/new" element={<ClosureTemplateItemCreate />} />
          <Route path="/closuretemplateitem/:id" element={<ClosureTemplateItemShow />} />
          <Route path="/closuretemplateitem/:id/edit" element={<ClosureTemplateItemEdit />} />
          <Route path="/sprintcapacity" element={<SprintCapacityList />} />
          <Route path="/sprintcapacity/new" element={<SprintCapacityCreate />} />
          <Route path="/sprintcapacity/:id" element={<SprintCapacityShow />} />
          <Route path="/sprintcapacity/:id/edit" element={<SprintCapacityEdit />} />
          <Route path="/risk" element={<RiskList />} />
          <Route path="/risk/new" element={<RiskCreate />} />
          <Route path="/risk/:id" element={<RiskShow />} />
          <Route path="/risk/:id/edit" element={<RiskEdit />} />
          <Route path="/comment" element={<CommentList />} />
          <Route path="/comment/new" element={<CommentCreate />} />
          <Route path="/comment/:id" element={<CommentShow />} />
          <Route path="/comment/:id/edit" element={<CommentEdit />} />
          <Route path="/workcalendar" element={<WorkCalendarList />} />
          <Route path="/workcalendar/new" element={<WorkCalendarCreate />} />
          <Route path="/workcalendar/:id" element={<WorkCalendarShow />} />
          <Route path="/workcalendar/:id/edit" element={<WorkCalendarEdit />} />
          <Route path="/wbsnode" element={<WbsNodeList />} />
          <Route path="/wbsnode/new" element={<WbsNodeCreate />} />
          <Route path="/wbsnode/:id" element={<WbsNodeShow />} />
          <Route path="/wbsnode/:id/edit" element={<WbsNodeEdit />} />
          <Route path="/recurringworkitem" element={<RecurringWorkItemList />} />
          <Route path="/recurringworkitem/new" element={<RecurringWorkItemCreate />} />
          <Route path="/recurringworkitem/:id" element={<RecurringWorkItemShow />} />
          <Route path="/recurringworkitem/:id/edit" element={<RecurringWorkItemEdit />} />
          <Route path="/lifecycletemplate" element={<LifecycleTemplateList />} />
          <Route path="/lifecycletemplate/new" element={<LifecycleTemplateCreate />} />
          <Route path="/lifecycletemplate/:id" element={<LifecycleTemplateShow />} />
          <Route path="/lifecycletemplate/:id/edit" element={<LifecycleTemplateEdit />} />
          <Route path="/resource" element={<ResourceList />} />
          <Route path="/resource/new" element={<ResourceCreate />} />
          <Route path="/resource/:id" element={<ResourceShow />} />
          <Route path="/resource/:id/edit" element={<ResourceEdit />} />
          <Route path="/release" element={<ReleaseList />} />
          <Route path="/release/new" element={<ReleaseCreate />} />
          <Route path="/release/:id" element={<ReleaseShow />} />
          <Route path="/release/:id/edit" element={<ReleaseEdit />} />
          <Route path="/refreshtoken" element={<RefreshTokenList />} />
          <Route path="/refreshtoken/new" element={<RefreshTokenCreate />} />
          <Route path="/refreshtoken/:id" element={<RefreshTokenShow />} />
          <Route path="/refreshtoken/:id/edit" element={<RefreshTokenEdit />} />
          <Route path="/userprofile" element={<UserProfileList />} />
          <Route path="/userprofile/new" element={<UserProfileCreate />} />
          <Route path="/userprofile/:id" element={<UserProfileShow />} />
          <Route path="/userprofile/:id/edit" element={<UserProfileEdit />} />
          <Route path="/closuretemplate" element={<ClosureTemplateList />} />
          <Route path="/closuretemplate/new" element={<ClosureTemplateCreate />} />
          <Route path="/closuretemplate/:id" element={<ClosureTemplateShow />} />
          <Route path="/closuretemplate/:id/edit" element={<ClosureTemplateEdit />} />
          <Route path="/budgetline" element={<BudgetLineList />} />
          <Route path="/budgetline/new" element={<BudgetLineCreate />} />
          <Route path="/budgetline/:id" element={<BudgetLineShow />} />
          <Route path="/budgetline/:id/edit" element={<BudgetLineEdit />} />
          <Route path="/baseline" element={<BaselineList />} />
          <Route path="/baseline/new" element={<BaselineCreate />} />
          <Route path="/baseline/:id" element={<BaselineShow />} />
          <Route path="/baseline/:id/edit" element={<BaselineEdit />} />
          <Route path="/workitemdependency" element={<WorkItemDependencyList />} />
          <Route path="/workitemdependency/new" element={<WorkItemDependencyCreate />} />
          <Route path="/workitemdependency/:id" element={<WorkItemDependencyShow />} />
          <Route path="/workitemdependency/:id/edit" element={<WorkItemDependencyEdit />} />
          <Route path="/portfolio" element={<PortfolioList />} />
          <Route path="/portfolio/new" element={<PortfolioCreate />} />
          <Route path="/portfolio/:id" element={<PortfolioShow />} />
          <Route path="/portfolio/:id/edit" element={<PortfolioEdit />} />
          <Route path="/rolesandpermissions" element={<RolesAndPermissionsList />} />
          <Route path="/rolesandpermissions/new" element={<RolesAndPermissionsCreate />} />
          <Route path="/rolesandpermissions/:id" element={<RolesAndPermissionsShow />} />
          <Route path="/rolesandpermissions/:id/edit" element={<RolesAndPermissionsEdit />} />
          <Route path="/workflowrule" element={<WorkflowRuleList />} />
          <Route path="/workflowrule/new" element={<WorkflowRuleCreate />} />
          <Route path="/workflowrule/:id" element={<WorkflowRuleShow />} />
          <Route path="/workflowrule/:id/edit" element={<WorkflowRuleEdit />} />
          <Route path="/maintenancelog" element={<MaintenanceLogList />} />
          <Route path="/maintenancelog/new" element={<MaintenanceLogCreate />} />
          <Route path="/maintenancelog/:id" element={<MaintenanceLogShow />} />
          <Route path="/maintenancelog/:id/edit" element={<MaintenanceLogEdit />} />
          <Route path="/sprint" element={<SprintList />} />
          <Route path="/sprint/new" element={<SprintCreate />} />
          <Route path="/sprint/:id" element={<SprintShow />} />
          <Route path="/sprint/:id/edit" element={<SprintEdit />} />
          <Route path="/punchlistitem" element={<PunchListItemList />} />
          <Route path="/punchlistitem/new" element={<PunchListItemCreate />} />
          <Route path="/punchlistitem/:id" element={<PunchListItemShow />} />
          <Route path="/punchlistitem/:id/edit" element={<PunchListItemEdit />} />
          <Route path="/project" element={<ProjectList />} />
          <Route path="/project/new" element={<ProjectCreate />} />
          <Route path="/project/:id" element={<ProjectShow />} />
          <Route path="/project/:id/edit" element={<ProjectEdit />} />
          <Route path="/approvalstep" element={<ApprovalStepList />} />
          <Route path="/approvalstep/new" element={<ApprovalStepCreate />} />
          <Route path="/approvalstep/:id" element={<ApprovalStepShow />} />
          <Route path="/approvalstep/:id/edit" element={<ApprovalStepEdit />} />
          <Route path="/procurement" element={<ProcurementList />} />
          <Route path="/procurement/new" element={<ProcurementCreate />} />
          <Route path="/procurement/:id" element={<ProcurementShow />} />
          <Route path="/procurement/:id/edit" element={<ProcurementEdit />} />
          <Route path="/closureitem" element={<ClosureItemList />} />
          <Route path="/closureitem/new" element={<ClosureItemCreate />} />
          <Route path="/closureitem/:id" element={<ClosureItemShow />} />
          <Route path="/closureitem/:id/edit" element={<ClosureItemEdit />} />
          <Route path="/businessunit" element={<BusinessUnitList />} />
          <Route path="/businessunit/new" element={<BusinessUnitCreate />} />
          <Route path="/businessunit/:id" element={<BusinessUnitShow />} />
          <Route path="/businessunit/:id/edit" element={<BusinessUnitEdit />} />
          <Route path="/riskmitigation" element={<RiskMitigationList />} />
          <Route path="/riskmitigation/new" element={<RiskMitigationCreate />} />
          <Route path="/riskmitigation/:id" element={<RiskMitigationShow />} />
          <Route path="/riskmitigation/:id/edit" element={<RiskMitigationEdit />} />
          <Route path="/Project/projectconflict" element={<ProjectConflictList />} />
          <Route path="/Project/projectconflict/new" element={<ProjectConflictCreate />} />
          <Route path="/Project/projectconflict/:id" element={<ProjectConflictShow />} />
          <Route path="/Project/projectconflict/:id/edit" element={<ProjectConflictEdit />} />
          <Route path="/statustransition" element={<StatusTransitionList />} />
          <Route path="/statustransition/new" element={<StatusTransitionCreate />} />
          <Route path="/statustransition/:id" element={<StatusTransitionShow />} />
          <Route path="/statustransition/:id/edit" element={<StatusTransitionEdit />} />
          <Route path="/benchmark" element={<BenchmarkList />} />
          <Route path="/benchmark/new" element={<BenchmarkCreate />} />
          <Route path="/benchmark/:id" element={<BenchmarkShow />} />
          <Route path="/benchmark/:id/edit" element={<BenchmarkEdit />} />
          <Route path="/approvalrequest" element={<ApprovalRequestList />} />
          <Route path="/approvalrequest/new" element={<ApprovalRequestCreate />} />
          <Route path="/approvalrequest/:id" element={<ApprovalRequestShow />} />
          <Route path="/approvalrequest/:id/edit" element={<ApprovalRequestEdit />} />
          <Route path="/workitemassignee" element={<WorkItemAssigneeList />} />
          <Route path="/workitemassignee/new" element={<WorkItemAssigneeCreate />} />
          <Route path="/workitemassignee/:id" element={<WorkItemAssigneeShow />} />
          <Route path="/workitemassignee/:id/edit" element={<WorkItemAssigneeEdit />} />
          <Route path="/apikey" element={<ApiKeyList />} />
          <Route path="/apikey/new" element={<ApiKeyCreate />} />
          <Route path="/apikey/:id" element={<ApiKeyShow />} />
          <Route path="/apikey/:id/edit" element={<ApiKeyEdit />} />
          <Route path="/user" element={<UserList />} />
          <Route path="/user/new" element={<UserCreate />} />
          <Route path="/user/:id" element={<UserShow />} />
          <Route path="/user/:id/edit" element={<UserEdit />} />
          <Route path="/baselineitem" element={<BaselineItemList />} />
          <Route path="/baselineitem/new" element={<BaselineItemCreate />} />
          <Route path="/baselineitem/:id" element={<BaselineItemShow />} />
          <Route path="/baselineitem/:id/edit" element={<BaselineItemEdit />} />
          <Route path="/escalation" element={<EscalationList />} />
          <Route path="/escalation/new" element={<EscalationCreate />} />
          <Route path="/escalation/:id" element={<EscalationShow />} />
          <Route path="/escalation/:id/edit" element={<EscalationEdit />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  );
}
