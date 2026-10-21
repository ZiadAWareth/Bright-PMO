import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Activity, BarChart3, Bell, Bot, Boxes, BrainCircuit, Briefcase, Building2, Calendar, CalendarRange, ChartColumn, ChevronDown, CircleCheck, ClipboardCheck, ClipboardList, Clock, FileBarChart, FileText, FolderKanban, FolderOpen, HardHat, KeyRound, LayoutDashboard, LayoutGrid, ListChecks, ListTodo, MailCheck, Package, PanelLeftClose, PenTool, Plug, PlugZap, Settings, Shield, ShieldAlert, ShoppingCart, Sparkles, Table, Table2, Tags, Users, Wallet, Workflow, X, Zap, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { hasFeatureIn } from '@/lib/features';
import { UserMenu } from '@/components/layout/user-menu';

// Per-model icons (the table's chosen icon from the schema editor).
const ICON_MAP: Record<string, LucideIcon> = {
  'table': Table,
  'workflow': Workflow,
  'activity': Activity,
  'list-checks': ListChecks,
  'sparkles': Sparkles,
  'key-round': KeyRound,
  'bot': Bot,
  'brain-circuit': BrainCircuit,
  'mail-check': MailCheck,
  'plug': Plug,
  'clipboard-list': ClipboardList,
  'pen-tool': PenTool,
  'settings': Settings,
  'plug-zap': PlugZap,
  'calendar': Calendar,
  'package': Package,
  'chart-column': ChartColumn,
  'bell': Bell,
  'file-text': FileText,
  'tags': Tags,
  'shield': Shield,
  'users': Users,
  'building-2': Building2,
  'briefcase': Briefcase,
  'folder-kanban': FolderKanban,
  'list-todo': ListTodo,
  'calendar-range': CalendarRange,
  'zap': Zap,
  'clock': Clock,
  'wallet': Wallet,
  'shield-alert': ShieldAlert,
  'shopping-cart': ShoppingCart,
  'hard-hat': HardHat,
  'circle-check': CircleCheck,
  'clipboard-check': ClipboardCheck,
  'folder-open': FolderOpen,
};

// Resource (data) navigation — one entry per model, plus the workflow modeler.
// Bright PMO: tables are grouped into PMO modules (one expandable section each).
// "feature": shown only to roles with that switch on (src/lib/features.tsx). Hiding is tidiness;
// the backend refuses the screen's routes regardless.
const RESOURCE_NAV: { to: string; label: string; icon: string; group: string; groupIcon?: string; feature?: string }[] = [
  { to: '/my-tasks', label: 'My Tasks', icon: 'clipboard-list', group: '' },
  // Organization & Access
  { to: '/organization', label: 'Organizations', icon: 'table', group: 'Organization & Access', groupIcon: 'building-2' },
  { to: '/organizationsettings', label: 'Organization Settings', icon: 'settings', group: 'Organization & Access' },
  { to: '/businessunit', label: 'Business Units', icon: 'table', group: 'Organization & Access' },
  { to: '/user', label: 'Users', icon: 'users', group: 'Organization & Access' },
  { to: '/userprofile', label: 'User Profiles', icon: 'users', group: 'Organization & Access' },
  { to: '/rolesandpermissions', label: 'Roles & Permissions', icon: 'key-round', group: 'Organization & Access' },
  { to: '/apikey', label: 'API Keys', icon: 'table', group: 'Organization & Access' },
  { to: '/integrationconnection', label: 'Integration Connections', icon: 'table', group: 'Organization & Access' },
  { to: '/refreshtoken', label: 'Refresh Tokens', icon: 'shield', group: 'Organization & Access' },
  { to: '/idpinboxevent', label: 'IdP Inbox Events', icon: 'chart-column', group: 'Organization & Access' },
  // Portfolio Management
  { to: '/eps', label: 'EPS', icon: 'table', group: 'Portfolio Management', groupIcon: 'briefcase' },
  { to: '/portfolio', label: 'Portfolios', icon: 'table', group: 'Portfolio Management' },
  { to: '/projectcategory', label: 'Project Categories', icon: 'tags', group: 'Portfolio Management' },
  { to: '/benchmark', label: 'Benchmarks', icon: 'table', group: 'Portfolio Management' },
  // Projects
  { to: '/project', label: 'Projects', icon: 'table', group: 'Projects', groupIcon: 'folder-kanban' },
  { to: '/projectmember', label: 'Project Members', icon: 'table', group: 'Projects' },
  { to: '/projectlifecyclestep', label: 'Project Lifecycle Steps', icon: 'table', group: 'Projects' },
  { to: '/Project/projectconflict', label: 'Project Conflicts', icon: 'table', group: 'Projects' },
  { to: '/progressreport', label: 'Progress Reports', icon: 'chart-column', group: 'Projects' },
  { to: '/lifecycletemplate', label: 'Lifecycle Templates', icon: 'table', group: 'Projects' },
  { to: '/lifecycletemplatestep', label: 'Lifecycle Template Steps', icon: 'table', group: 'Projects' },
  // Work Management
  { to: '/workitem', label: 'Work Items', icon: 'package', group: 'Work Management', groupIcon: 'list-todo' },
  { to: '/workitemstatus', label: 'Work Item Statuses', icon: 'package', group: 'Work Management' },
  { to: '/statustransition', label: 'Status Transitions', icon: 'table', group: 'Work Management' },
  { to: '/workitemassignee', label: 'Work Item Assignees', icon: 'package', group: 'Work Management' },
  { to: '/workitemdependency', label: 'Work Item Dependencies', icon: 'package', group: 'Work Management' },
  { to: '/workitemlink', label: 'Work Item Links', icon: 'package', group: 'Work Management' },
  { to: '/recurringworkitem', label: 'Recurring Work Items', icon: 'package', group: 'Work Management' },
  { to: '/comment', label: 'Comments', icon: 'table', group: 'Work Management' },
  { to: '/commentmention', label: 'Comment Mentions', icon: 'table', group: 'Work Management' },
  { to: '/workflowrule', label: 'Workflow Rules', icon: 'workflow', group: 'Work Management' },
  // Schedule & Baselines
  { to: '/wbsnode', label: 'WBS Nodes', icon: 'table', group: 'Schedule & Baselines', groupIcon: 'calendar-range' },
  { to: '/baseline', label: 'Baselines', icon: 'table', group: 'Schedule & Baselines' },
  { to: '/baselineitem', label: 'Baseline Items', icon: 'package', group: 'Schedule & Baselines' },
  { to: '/evmsnapshot', label: 'EVM Snapshots', icon: 'table', group: 'Schedule & Baselines' },
  { to: '/workcalendar', label: 'Work Calendars', icon: 'calendar', group: 'Schedule & Baselines' },
  { to: '/calendarexception', label: 'Calendar Exceptions', icon: 'calendar', group: 'Schedule & Baselines' },
  // Agile
  { to: '/sprint', label: 'Sprints', icon: 'table', group: 'Agile', groupIcon: 'zap' },
  { to: '/sprintcapacity', label: 'Sprint Capacities', icon: 'table', group: 'Agile' },
  { to: '/sprintsnapshot', label: 'Sprint Snapshots', icon: 'table', group: 'Agile' },
  { to: '/release', label: 'Releases', icon: 'table', group: 'Agile' },
  // Resources & Time
  { to: '/resource', label: 'Resources', icon: 'table', group: 'Resources & Time', groupIcon: 'clock' },
  { to: '/resourceassignment', label: 'Resource Assignments', icon: 'table', group: 'Resources & Time' },
  { to: '/timesheet', label: 'Timesheets', icon: 'table', group: 'Resources & Time' },
  { to: '/timeentry', label: 'Time Entries', icon: 'table', group: 'Resources & Time' },
  // Finance
  { to: '/budgetline', label: 'Budget Lines', icon: 'table', group: 'Finance', groupIcon: 'wallet' },
  { to: '/costtransaction', label: 'Cost Transactions', icon: 'table', group: 'Finance' },
  // Risk
  { to: '/risk', label: 'Risks', icon: 'table', group: 'Risk', groupIcon: 'shield-alert' },
  { to: '/riskmitigation', label: 'Risk Mitigations', icon: 'table', group: 'Risk' },
  // Procurement
  { to: '/vendor', label: 'Vendors', icon: 'table', group: 'Procurement', groupIcon: 'shopping-cart' },
  { to: '/procurement', label: 'Procurements', icon: 'table', group: 'Procurement' },
  { to: '/rfqresponse', label: 'RFQ Responses', icon: 'table', group: 'Procurement' },
  { to: '/contract', label: 'Contracts', icon: 'table', group: 'Procurement' },
  // Sites & Equipment
  { to: '/site', label: 'Sites', icon: 'table', group: 'Sites & Equipment', groupIcon: 'hard-hat' },
  { to: '/equipmentsitelog', label: 'Equipment Site Logs', icon: 'chart-column', group: 'Sites & Equipment' },
  { to: '/maintenanceschedule', label: 'Maintenance Schedules', icon: 'calendar', group: 'Sites & Equipment' },
  { to: '/maintenancelog', label: 'Maintenance Logs', icon: 'chart-column', group: 'Sites & Equipment' },
  // Approvals
  { to: '/approvalpolicy', label: 'Approval Policies', icon: 'table', group: 'Approvals', groupIcon: 'circle-check' },
  { to: '/approvalpolicystep', label: 'Approval Policy Steps', icon: 'table', group: 'Approvals' },
  { to: '/approvalrequest', label: 'Approval Requests', icon: 'table', group: 'Approvals' },
  { to: '/approvalstep', label: 'Approval Steps', icon: 'table', group: 'Approvals' },
  // Quality & Closure
  { to: '/checklist', label: 'Checklists', icon: 'table', group: 'Quality & Closure', groupIcon: 'clipboard-check' },
  { to: '/checklistitem', label: 'Checklist Items', icon: 'package', group: 'Quality & Closure' },
  { to: '/inspection', label: 'Inspections', icon: 'table', group: 'Quality & Closure' },
  { to: '/punchlistitem', label: 'Punch List Items', icon: 'package', group: 'Quality & Closure' },
  { to: '/handover', label: 'Handovers', icon: 'table', group: 'Quality & Closure' },
  { to: '/closuretemplate', label: 'Closure Templates', icon: 'table', group: 'Quality & Closure' },
  { to: '/closuretemplateitem', label: 'Closure Template Items', icon: 'package', group: 'Quality & Closure' },
  { to: '/projectclosure', label: 'Project Closures', icon: 'table', group: 'Quality & Closure' },
  { to: '/closureitem', label: 'Closure Items', icon: 'package', group: 'Quality & Closure' },
  { to: '/lesson', label: 'Lessons', icon: 'table', group: 'Quality & Closure' },
  // Documents & Monitoring
  { to: '/document', label: 'Documents', icon: 'file-text', group: 'Documents & Monitoring', groupIcon: 'folder-open' },
  { to: '/alert', label: 'Alerts', icon: 'bell', group: 'Documents & Monitoring' },
  { to: '/escalation', label: 'Escalations', icon: 'table', group: 'Documents & Monitoring' },
  { to: '/activitylog', label: 'Activity Logs', icon: 'chart-column', group: 'Documents & Monitoring' },
  // Platform
  { to: '/automation/workflows', label: 'Workflows', icon: 'workflow', group: 'Automation', groupIcon: 'workflow' },
  { to: '/automation/runs', label: 'Runs & Incidents', icon: 'activity', group: 'Automation' },
  { to: '/automation/tasks', label: 'All Tasks', icon: 'list-checks', group: 'Automation' },
  { to: '/agent/assistant', label: 'Assistant', icon: 'bot', group: 'AI', groupIcon: 'sparkles', feature: 'assistant' },
  { to: '/agent/knowledge', label: 'Knowledge', icon: 'sparkles', group: 'AI' },
  { to: '/agent/agents', label: 'Agents', icon: 'brain-circuit', group: 'AI' },
  { to: '/agent/settings', label: 'Provider & Key', icon: 'key-round', group: 'AI', feature: 'aiSettings' },
  { to: '/design-frontend', label: 'Customer Pages', icon: 'pen-tool', group: 'Settings', groupIcon: 'settings', feature: 'designFrontend' },
  { to: '/settings/sign-in', label: 'Sign-in & Email', icon: 'mail-check', group: 'Settings', feature: 'signInSettings' },
  { to: '/settings/dashboard-engine', label: 'Dashboard Engine', icon: 'plug-zap', group: 'Settings', feature: 'manageDynamicDashboards' },
];

/**
 * PG-10 — nav sections.
 *
 * Entries sharing a group (module) collapse into ONE expandable section,
 * regardless of whether they're adjacent in RESOURCE_NAV — so a table assigned
 * to a module always lands under that module. Sections keep the author's order
 * via first-appearance (the group's first member sets its position); ungrouped
 * entries collapse into a single flat block at their first appearance.
 */
type NavEntry = (typeof RESOURCE_NAV)[number];

const NAV_SECTIONS: { group: string; icon?: string; items: NavEntry[] }[] = (() => {
  const order: string[] = [];
  const byGroup: Record<string, NavEntry[]> = {};
  for (const item of RESOURCE_NAV) {
    const key = item.group || '';
    if (!(key in byGroup)) {
      byGroup[key] = [];
      order.push(key);
    }
    byGroup[key].push(item);
  }
  return order.map((group) => ({
    group,
    icon: byGroup[group].find((i) => i.groupIcon)?.groupIcon,
    items: byGroup[group],
  }));
})();

const navLinkClass = (collapsed: boolean) =>
  ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center rounded-lg text-sm font-medium transition-colors',
      collapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2',
      isActive
        ? 'bg-accent text-accent-foreground'
        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
    );

/**
 * variant "rail" — the desktop sidebar: a collapsible card beside the content, md and up.
 * variant "drawer" — the same navigation inside the phone/tablet slide-in panel (app-layout.tsx):
 * always fully expanded (a 64px icon rail is useless on a touch screen), with a close button
 * where the rail has its collapse button.
 */
export function Sidebar({
  collapsed: collapsedProp,
  setCollapsed,
  variant = 'rail',
  onClose,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  variant?: 'rail' | 'drawer';
  onClose?: () => void;
}) {
  const drawer = variant === 'drawer';
  const collapsed = drawer ? false : collapsedProp;
  const { pathname } = useLocation();
  // Sections start collapsed, so the sidebar opens as a short, scannable outline. The one exception
  // is the section holding the current page: it opens on its own, or the user could not see where
  // they are. An explicit click always wins over that default.
  const isHere = (to: string) => pathname === to || pathname.startsWith(to + '/');
  const [analyticsToggle, setAnalyticsOpen] = useState<boolean | undefined>(undefined);
  const analyticsOpen = analyticsToggle ?? (isHere('/analytics') || isHere('/reports'));
  const { user } = useAuth();
  const visible = (item: NavEntry) =>
    !item.feature || hasFeatureIn(user?.permissions, user?.isPlatformAdmin, item.feature);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const sectionOpen = (section: { group: string; items: NavEntry[] }) =>
    openGroups[section.group] ?? section.items.some((i) => isHere(i.to));
  const brandIcon = (import.meta.env.VITE_BRAND_ICON_URL ||
    import.meta.env.VITE_BRAND_LOGO_URL) as string | undefined;

  // Collapsed → clicking an expandable group expands the rail AND opens the group.
  const onAnalyticsClick = () => {
    if (collapsed) {
      setCollapsed(false);
      setAnalyticsOpen(true);
    } else {
      setAnalyticsOpen(!analyticsOpen);
    }
  };

  // Section headers behave exactly like Analytics: collapsed rail → expand it and open the
  // section; expanded → toggle. Sections default to collapsed (see sectionOpen).
  const onGroupClick = (section: { group: string; items: NavEntry[] }) => {
    const group = section.group;
    if (collapsed) {
      setCollapsed(false);
      setOpenGroups((g) => ({ ...g, [group]: true }));
    } else {
      setOpenGroups((g) => ({ ...g, [group]: !sectionOpen(section) }));
    }
  };

  const Brand = brandIcon ? (
    <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-white ring-1 ring-border">
      <img src={brandIcon} alt="" className="h-full w-full object-contain p-0.5" />
    </div>
  ) : (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">
      A
    </div>
  );

  return (
    <aside
      className={cn(
        drawer
          ? 'flex h-full w-full flex-col rounded-2xl border border-border bg-card shadow-xl'
          : 'hidden h-full shrink-0 flex-col rounded-2xl border border-border bg-card shadow-sm transition-[width] duration-200 md:flex',
        !drawer && (collapsed ? 'w-16' : 'w-64')
      )}
    >
      {/* Header — when collapsed, the whole header expands the rail on click */}
      {collapsed ? (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Expand sidebar"
          aria-label="Expand sidebar"
          className="flex h-16 w-full items-center justify-center border-b border-border transition-colors hover:bg-accent/50"
        >
          {Brand}
        </button>
      ) : (
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          {Brand}
          <span className="truncate font-semibold tracking-tight text-foreground">
            another test PMO
          </span>
          {drawer ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="ml-auto grid h-10 w-10 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              className="ml-auto grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-auto p-3">
        {/* Analytics — expandable group */}
        <button
          type="button"
          onClick={onAnalyticsClick}
          aria-expanded={!collapsed && analyticsOpen}
          title={collapsed ? 'Analytics' : undefined}
          className={cn(
            'flex w-full items-center rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground',
            collapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2'
          )}
        >
          <BarChart3 className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Analytics</span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 transition-transform',
                  analyticsOpen ? 'rotate-0' : '-rotate-90'
                )}
              />
            </>
          )}
        </button>
        {!collapsed && analyticsOpen && (
          <div className="ml-4 space-y-1 border-l border-border pl-2">
            <NavLink to="/analytics/dashboard" className={navLinkClass(false)}>
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              <span className="truncate">Dashboard</span>
            </NavLink>
            {/* Reporting Engine — the report builder, below the dashboard. */}
            <NavLink to="/analytics/report-builder" className={navLinkClass(false)}>
              <FileBarChart className="h-4 w-4 shrink-0" />
              <span className="truncate">Report Builder</span>
            </NavLink>
            {/* Reports — role-filtered saved reports, under Analytics. */}
            <NavLink to="/reports" className={navLinkClass(false)}>
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">Reports</span>
            </NavLink>
            {/* Dynamic Dashboards — Dashboard Engine dashboards for this person's organization. */}
            {hasFeatureIn(user?.permissions, user?.isPlatformAdmin, 'dynamicDashboards') && (
              <NavLink to="/analytics/dynamic-dashboards" className={navLinkClass(false)}>
                <LayoutGrid className="h-4 w-4 shrink-0" />
                <span className="truncate">Dynamic Dashboards</span>
              </NavLink>
            )}
          </div>
        )}

        {/* Data + workflows */}
        <div className="space-y-1 pt-2">
          {NAV_SECTIONS.map((section) => {
            // Ungrouped entries render flat, exactly as before.
            if (!section.group) {
              return section.items.filter(visible).map(({ to, label, icon }) => {
                const Icon = ICON_MAP[icon] ?? Table2;
                return (
                  <NavLink
                    key={to}
                    to={to}
                    title={collapsed ? label : undefined}
                    className={navLinkClass(collapsed)}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </NavLink>
                );
              });
            }

            // Module group — mirrors the Analytics tab exactly: a header with a
            // module icon + name + a right-aligned chevron, and its models
            // rendered in an indented, left-bordered rail when open.
            // A section whose every screen this role cannot use is not shown at all.
            const items = section.items.filter(visible);
            if (!items.length) return null;
            const isOpen = sectionOpen(section);
            const SectionIcon = (section.icon && ICON_MAP[section.icon]) || Boxes;
            return (
              <div key={section.group}>
                <button
                  type="button"
                  onClick={() => onGroupClick(section)}
                  aria-expanded={!collapsed && isOpen}
                  title={collapsed ? section.group : undefined}
                  className={cn(
                    'flex w-full items-center rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground',
                    collapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2'
                  )}
                >
                  <SectionIcon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate text-left">{section.group}</span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 shrink-0 transition-transform',
                          isOpen ? 'rotate-0' : '-rotate-90'
                        )}
                      />
                    </>
                  )}
                </button>
                {!collapsed && isOpen && (
                  <div className="ml-4 space-y-1 border-l border-border pl-2">
                    {items.map(({ to, label, icon }) => {
                      const Icon = ICON_MAP[icon] ?? Table2;
                      return (
                        <NavLink key={to} to={to} className={navLinkClass(false)}>
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Who is signed in, with the same menu as the top bar's avatar (user-menu.tsx). */}
      <div className={cn('border-t border-border', collapsed ? 'p-2' : 'p-3')}>
        <UserMenu variant="sidebar" collapsed={collapsed} />
      </div>
    </aside>
  );
}
