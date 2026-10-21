import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Table2 } from 'lucide-react';
import { createResourceApi } from '@/lib/resource-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const RESOURCES: { resource: string; label: string }[] = [
  { resource: 'approvalpolicy', label: 'Approval Policies' },
  { resource: 'sprintsnapshot', label: 'Sprint Snapshots' },
  { resource: 'lesson', label: 'Lessons' },
  { resource: 'commentmention', label: 'Comment Mentions' },
  { resource: 'maintenanceschedule', label: 'Maintenance Schedules' },
  { resource: 'resourceassignment', label: 'Resource Assignments' },
  { resource: 'eps', label: 'Eps' },
  { resource: 'organization', label: 'Organizations' },
  { resource: 'inspection', label: 'Inspections' },
  { resource: 'workitemlink', label: 'Work Item Links' },
  { resource: 'activitylog', label: 'Activity Logs' },
  { resource: 'calendarexception', label: 'Calendar Exceptions' },
  { resource: 'alert', label: 'Alerts' },
  { resource: 'evmsnapshot', label: 'Evm Snapshots' },
  { resource: 'workitem', label: 'Work Items' },
  { resource: 'integrationconnection', label: 'Integration Connections' },
  { resource: 'document', label: 'Documents' },
  { resource: 'organizationsettings', label: 'Organization Settings' },
  { resource: 'projectmember', label: 'Project Members' },
  { resource: 'projectclosure', label: 'Project Closures' },
  { resource: 'checklistitem', label: 'Checklist Items' },
  { resource: 'approvalpolicystep', label: 'Approval Policy Steps' },
  { resource: 'costtransaction', label: 'Cost Transactions' },
  { resource: 'contract', label: 'Contracts' },
  { resource: 'idpinboxevent', label: 'Idp Inbox Events' },
  { resource: 'workitemstatus', label: 'Work Item Statuses' },
  { resource: 'projectlifecyclestep', label: 'Project Lifecycle Steps' },
  { resource: 'progressreport', label: 'Progress Reports' },
  { resource: 'timeentry', label: 'Time Entries' },
  { resource: 'vendor', label: 'Vendors' },
  { resource: 'lifecycletemplatestep', label: 'Lifecycle Template Steps' },
  { resource: 'rfqresponse', label: 'Rfq Responses' },
  { resource: 'timesheet', label: 'Timesheets' },
  { resource: 'equipmentsitelog', label: 'Equipment Site Logs' },
  { resource: 'site', label: 'Sites' },
  { resource: 'checklist', label: 'Checklists' },
  { resource: 'handover', label: 'Handovers' },
  { resource: 'projectcategory', label: 'Project Categories' },
  { resource: 'closuretemplateitem', label: 'Closure Template Items' },
  { resource: 'sprintcapacity', label: 'Sprint Capacities' },
  { resource: 'risk', label: 'Risks' },
  { resource: 'comment', label: 'Comments' },
  { resource: 'workcalendar', label: 'Work Calendars' },
  { resource: 'wbsnode', label: 'Wbs Nodes' },
  { resource: 'recurringworkitem', label: 'Recurring Work Items' },
  { resource: 'lifecycletemplate', label: 'Lifecycle Templates' },
  { resource: 'resource', label: 'Resources' },
  { resource: 'release', label: 'Releases' },
  { resource: 'refreshtoken', label: 'Refresh Tokens' },
  { resource: 'userprofile', label: 'User Profiles' },
  { resource: 'closuretemplate', label: 'Closure Templates' },
  { resource: 'budgetline', label: 'Budget Lines' },
  { resource: 'baseline', label: 'Baselines' },
  { resource: 'workitemdependency', label: 'Work Item Dependencies' },
  { resource: 'portfolio', label: 'Portfolios' },
  { resource: 'rolesandpermissions', label: 'Roles And Permissions' },
  { resource: 'workflowrule', label: 'Workflow Rules' },
  { resource: 'maintenancelog', label: 'Maintenance Logs' },
  { resource: 'sprint', label: 'Sprints' },
  { resource: 'punchlistitem', label: 'Punch List Items' },
  { resource: 'project', label: 'Projects' },
  { resource: 'approvalstep', label: 'Approval Steps' },
  { resource: 'procurement', label: 'Procurements' },
  { resource: 'closureitem', label: 'Closure Items' },
  { resource: 'businessunit', label: 'Business Units' },
  { resource: 'riskmitigation', label: 'Risk Mitigations' },
  { resource: 'projectconflict', label: 'Project Conflicts' },
  { resource: 'statustransition', label: 'Status Transitions' },
  { resource: 'benchmark', label: 'Benchmarks' },
  { resource: 'approvalrequest', label: 'Approval Requests' },
  { resource: 'workitemassignee', label: 'Work Item Assignees' },
  { resource: 'apikey', label: 'Api Keys' },
  { resource: 'user', label: 'Users' },
  { resource: 'baselineitem', label: 'Baseline Items' },
  { resource: 'escalation', label: 'Escalations' },
];

function StatCard({ resource, label }: { resource: string; label: string }) {
  const { data, isLoading } = useQuery({
    queryKey: [resource, 'count'],
    queryFn: () => createResourceApi<{ id: number }>(resource).list({ page: 0, limit: 1 }),
  });

  return (
    <Link to={`/${resource}`} className="block">
      <Card className="transition-all hover:border-primary/40 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          <Table2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-9 w-16" />
          ) : (
            <div className="text-3xl font-bold tracking-tight">{data?.total ?? 0}</div>
          )}
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            View all <ArrowUpRight className="h-3 w-3" />
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to another test PMO. Here's an overview of your data.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {RESOURCES.map((r) => (
          <StatCard key={r.resource} {...r} />
        ))}
      </div>
    </div>
  );
}
