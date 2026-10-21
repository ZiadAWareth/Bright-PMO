import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { ApprovalPolicyModule } from './approvalpolicy/approvalpolicy.module';
import { SprintSnapshotModule } from './sprintsnapshot/sprintsnapshot.module';
import { LessonModule } from './lesson/lesson.module';
import { CommentMentionModule } from './commentmention/commentmention.module';
import { MaintenanceScheduleModule } from './maintenanceschedule/maintenanceschedule.module';
import { ResourceAssignmentModule } from './resourceassignment/resourceassignment.module';
import { EpsModule } from './eps/eps.module';
import { OrganizationModule } from './organization/organization.module';
import { InspectionModule } from './inspection/inspection.module';
import { WorkItemLinkModule } from './workitemlink/workitemlink.module';
import { ActivityLogModule } from './activitylog/activitylog.module';
import { CalendarExceptionModule } from './calendarexception/calendarexception.module';
import { AlertModule } from './alert/alert.module';
import { EvmSnapshotModule } from './evmsnapshot/evmsnapshot.module';
import { WorkItemModule } from './workitem/workitem.module';
import { IntegrationConnectionModule } from './integrationconnection/integrationconnection.module';
import { DocumentModule } from './document/document.module';
import { OrganizationSettingsModule } from './organizationsettings/organizationsettings.module';
import { ProjectMemberModule } from './projectmember/projectmember.module';
import { ProjectClosureModule } from './projectclosure/projectclosure.module';
import { ChecklistItemModule } from './checklistitem/checklistitem.module';
import { ApprovalPolicyStepModule } from './approvalpolicystep/approvalpolicystep.module';
import { CostTransactionModule } from './costtransaction/costtransaction.module';
import { ContractModule } from './contract/contract.module';
import { IdpInboxEventModule } from './idpinboxevent/idpinboxevent.module';
import { WorkItemStatusModule } from './workitemstatus/workitemstatus.module';
import { ProjectLifecycleStepModule } from './projectlifecyclestep/projectlifecyclestep.module';
import { ProgressReportModule } from './progressreport/progressreport.module';
import { TimeEntryModule } from './timeentry/timeentry.module';
import { VendorModule } from './vendor/vendor.module';
import { LifecycleTemplateStepModule } from './lifecycletemplatestep/lifecycletemplatestep.module';
import { RfqResponseModule } from './rfqresponse/rfqresponse.module';
import { TimesheetModule } from './timesheet/timesheet.module';
import { EquipmentSiteLogModule } from './equipmentsitelog/equipmentsitelog.module';
import { SiteModule } from './site/site.module';
import { ChecklistModule } from './checklist/checklist.module';
import { HandoverModule } from './handover/handover.module';
import { ProjectCategoryModule } from './projectcategory/projectcategory.module';
import { ClosureTemplateItemModule } from './closuretemplateitem/closuretemplateitem.module';
import { SprintCapacityModule } from './sprintcapacity/sprintcapacity.module';
import { RiskModule } from './risk/risk.module';
import { CommentModule } from './comment/comment.module';
import { WorkCalendarModule } from './workcalendar/workcalendar.module';
import { WbsNodeModule } from './wbsnode/wbsnode.module';
import { RecurringWorkItemModule } from './recurringworkitem/recurringworkitem.module';
import { LifecycleTemplateModule } from './lifecycletemplate/lifecycletemplate.module';
import { ResourceModule } from './resource/resource.module';
import { ReleaseModule } from './release/release.module';
import { SavedReportModule } from './savedreport/savedreport.module';
import { RefreshTokenModule } from './refreshtoken/refreshtoken.module';
import { UserProfileModule } from './userprofile/userprofile.module';
import { ClosureTemplateModule } from './closuretemplate/closuretemplate.module';
import { BudgetLineModule } from './budgetline/budgetline.module';
import { BaselineModule } from './baseline/baseline.module';
import { WorkItemDependencyModule } from './workitemdependency/workitemdependency.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { RolesAndPermissionsModule } from './rolesandpermissions/rolesandpermissions.module';
import { WorkflowRuleModule } from './workflowrule/workflowrule.module';
import { MaintenanceLogModule } from './maintenancelog/maintenancelog.module';
import { SprintModule } from './sprint/sprint.module';
import { PunchListItemModule } from './punchlistitem/punchlistitem.module';
import { ProjectModule } from './project/project.module';
import { ApprovalStepModule } from './approvalstep/approvalstep.module';
import { ProcurementModule } from './procurement/procurement.module';
import { ClosureItemModule } from './closureitem/closureitem.module';
import { BusinessUnitModule } from './businessunit/businessunit.module';
import { RiskMitigationModule } from './riskmitigation/riskmitigation.module';
import { ProjectConflictModule } from './projectconflict/projectconflict.module';
import { StatusTransitionModule } from './statustransition/statustransition.module';
import { BenchmarkModule } from './benchmark/benchmark.module';
import { ApprovalRequestModule } from './approvalrequest/approvalrequest.module';
import { WorkItemAssigneeModule } from './workitemassignee/workitemassignee.module';
import { ApiKeyModule } from './apikey/apikey.module';
import { UserModule } from './user/user.module';
import { BaselineItemModule } from './baselineitem/baselineitem.module';
import { EscalationModule } from './escalation/escalation.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ApisIntrospectorModule } from './apis-introspector/apis-introspector.module';
import { WorkflowModule } from './workflow/workflow.module';
import { NotificationModule } from './notifications/notification.module';
import { ReportsModule } from './reports/reports.module';
import { UploadsModule } from './uploads/uploads.module';
import { AgentModule } from './agent/agent.module';
import { MailModule } from './mail/mail.module';
import { AppContractModule } from './app-contract/app-contract.module';
import { ConnectorsModule } from './connectors/connectors.module';
import { FrontendDesignModule } from './frontend-design/frontend-design.module';
import { DashboardEngineModule } from './dashboard-engine/dashboard-engine.module';
import { TenantMiddleware } from './organization-scope/tenant.middleware';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';

@Module({
  imports: [JwtModule.register({
    global:true,
    secret:process.env.JWT_SECRET,
  }), PrismaModule, AuthModule, ApisIntrospectorModule, WorkflowModule, NotificationModule, ReportsModule, UploadsModule, AgentModule, MailModule, AppContractModule, ConnectorsModule, FrontendDesignModule, DashboardEngineModule, ApprovalPolicyModule, SprintSnapshotModule, LessonModule, CommentMentionModule, MaintenanceScheduleModule, ResourceAssignmentModule, EpsModule, OrganizationModule, InspectionModule, WorkItemLinkModule, ActivityLogModule, CalendarExceptionModule, AlertModule, EvmSnapshotModule, WorkItemModule, IntegrationConnectionModule, DocumentModule, OrganizationSettingsModule, ProjectMemberModule, ProjectClosureModule, ChecklistItemModule, ApprovalPolicyStepModule, CostTransactionModule, ContractModule, IdpInboxEventModule, WorkItemStatusModule, ProjectLifecycleStepModule, ProgressReportModule, TimeEntryModule, VendorModule, LifecycleTemplateStepModule, RfqResponseModule, TimesheetModule, EquipmentSiteLogModule, SiteModule, ChecklistModule, HandoverModule, ProjectCategoryModule, ClosureTemplateItemModule, SprintCapacityModule, RiskModule, CommentModule, WorkCalendarModule, WbsNodeModule, RecurringWorkItemModule, LifecycleTemplateModule, ResourceModule, ReleaseModule, SavedReportModule, RefreshTokenModule, UserProfileModule, ClosureTemplateModule, BudgetLineModule, BaselineModule, WorkItemDependencyModule, PortfolioModule, RolesAndPermissionsModule, WorkflowRuleModule, MaintenanceLogModule, SprintModule, PunchListItemModule, ProjectModule, ApprovalStepModule, ProcurementModule, ClosureItemModule, BusinessUnitModule, RiskMitigationModule, ProjectConflictModule, StatusTransitionModule, BenchmarkModule, ApprovalRequestModule, WorkItemAssigneeModule, ApiKeyModule, UserModule, BaselineItemModule, EscalationModule],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  // PG-11 — establish the tenant context for EVERY request, before any guard or
  // handler runs. Applied globally rather than per-route so a new controller
  // cannot be added outside tenant scoping by omission.
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
