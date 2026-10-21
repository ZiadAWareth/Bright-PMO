import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Plus,
  ArrowLeft,
  Loader2,
  Save,
  Eye,
  Pencil,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { makeResourceHooks } from '@/lib/use-resource';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { FEATURES, FEATURES_KEY, hasFeatureIn } from '@/lib/features';
import { useAuth } from '@/lib/auth';
import RunWorkflowButton from '@/workflow/RunWorkflowButton';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

type Perms = Record<string, Record<string, boolean>>;

interface Role {
  id: number;
  role: string;
  entityPermissions: Perms;
  createdAt?: string;
  /** Provided by the platform to every organization: read-only inside an organization. */
  isPlatform?: boolean;
}

/** A role the platform provides can be used by every organization but changed only by the platform. */
function usePlatformReadOnly() {
  const { user } = useAuth();
  const isPlatformAdmin = !!user?.isPlatformAdmin || user?.organizationId === 0;
  return (role?: { isPlatform?: boolean } | null) => !!role?.isPlatform && !isPlatformAdmin;
}

/**
 * Where the roles pages live. In an app that groups tables into modules they sit under the module
 * (e.g. /Administration/rolesandpermissions), so a hard-coded "/rolesandpermissions" sent every
 * button and every save to a page that does not exist.
 */
function useRolesBase(): string {
  const { pathname } = useLocation();
  const i = pathname.toLowerCase().indexOf('/rolesandpermissions');
  return i >= 0 ? pathname.slice(0, i + '/rolesandpermissions'.length) : '/rolesandpermissions';
}

function PlatformBadge() {
  return (
    <span
      title="Provided by the platform to every organization"
      className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary ring-1 ring-inset ring-primary/20"
    >
      Platform
    </span>
  );
}

const hooks = makeResourceHooks<Role>('rolesandpermissions', 'Role');

const ENTITIES: { key: string; label: string }[] = [
  { key: 'approvalpolicy', label: 'Approval Policy' },
  { key: 'sprintsnapshot', label: 'Sprint Snapshot' },
  { key: 'lesson', label: 'Lesson' },
  { key: 'commentmention', label: 'Comment Mention' },
  { key: 'maintenanceschedule', label: 'Maintenance Schedule' },
  { key: 'resourceassignment', label: 'Resource Assignment' },
  { key: 'eps', label: 'Eps' },
  { key: 'organization', label: 'Organization' },
  { key: 'inspection', label: 'Inspection' },
  { key: 'workitemlink', label: 'Work Item Link' },
  { key: 'activitylog', label: 'Activity Log' },
  { key: 'calendarexception', label: 'Calendar Exception' },
  { key: 'alert', label: 'Alert' },
  { key: 'evmsnapshot', label: 'Evm Snapshot' },
  { key: 'workitem', label: 'Work Item' },
  { key: 'integrationconnection', label: 'Integration Connection' },
  { key: 'document', label: 'Document' },
  { key: 'organizationsettings', label: 'Organization Settings' },
  { key: 'projectmember', label: 'Project Member' },
  { key: 'projectclosure', label: 'Project Closure' },
  { key: 'checklistitem', label: 'Checklist Item' },
  { key: 'approvalpolicystep', label: 'Approval Policy Step' },
  { key: 'costtransaction', label: 'Cost Transaction' },
  { key: 'contract', label: 'Contract' },
  { key: 'workflow', label: 'Workflow' },
  { key: 'idpinboxevent', label: 'Idp Inbox Event' },
  { key: 'workitemstatus', label: 'Work Item Status' },
  { key: 'projectlifecyclestep', label: 'Project Lifecycle Step' },
  { key: 'progressreport', label: 'Progress Report' },
  { key: 'timeentry', label: 'Time Entry' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'lifecycletemplatestep', label: 'Lifecycle Template Step' },
  { key: 'rfqresponse', label: 'Rfq Response' },
  { key: 'timesheet', label: 'Timesheet' },
  { key: 'equipmentsitelog', label: 'Equipment Site Log' },
  { key: 'site', label: 'Site' },
  { key: 'checklist', label: 'Checklist' },
  { key: 'handover', label: 'Handover' },
  { key: 'projectcategory', label: 'Project Category' },
  { key: 'closuretemplateitem', label: 'Closure Template Item' },
  { key: 'sprintcapacity', label: 'Sprint Capacity' },
  { key: 'risk', label: 'Risk' },
  { key: 'comment', label: 'Comment' },
  { key: 'workcalendar', label: 'Work Calendar' },
  { key: 'wbsnode', label: 'Wbs Node' },
  { key: 'recurringworkitem', label: 'Recurring Work Item' },
  { key: 'lifecycletemplate', label: 'Lifecycle Template' },
  { key: 'resource', label: 'Resource' },
  { key: 'release', label: 'Release' },
  { key: 'savedreport', label: 'Saved Report' },
  { key: 'refreshtoken', label: 'Refresh Token' },
  { key: 'userprofile', label: 'User Profile' },
  { key: 'closuretemplate', label: 'Closure Template' },
  { key: 'budgetline', label: 'Budget Line' },
  { key: 'baseline', label: 'Baseline' },
  { key: 'workitemdependency', label: 'Work Item Dependency' },
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'rolesandpermissions', label: 'Roles And Permissions' },
  { key: 'workflowrule', label: 'Workflow Rule' },
  { key: 'maintenancelog', label: 'Maintenance Log' },
  { key: 'sprint', label: 'Sprint' },
  { key: 'punchlistitem', label: 'Punch List Item' },
  { key: 'project', label: 'Project' },
  { key: 'approvalstep', label: 'Approval Step' },
  { key: 'procurement', label: 'Procurement' },
  { key: 'closureitem', label: 'Closure Item' },
  { key: 'businessunit', label: 'Business Unit' },
  { key: 'riskmitigation', label: 'Risk Mitigation' },
  { key: 'projectconflict', label: 'Project Conflict' },
  { key: 'statustransition', label: 'Status Transition' },
  { key: 'notification', label: 'Notification' },
  { key: 'benchmark', label: 'Benchmark' },
  { key: 'approvalrequest', label: 'Approval Request' },
  { key: 'workitemassignee', label: 'Work Item Assignee' },
  { key: 'apikey', label: 'Api Key' },
  { key: 'user', label: 'User' },
  { key: 'baselineitem', label: 'Baseline Item' },
  { key: 'escalation', label: 'Escalation' },
  { key: 'workflowversion', label: 'Workflow Version' },
  { key: 'workflowrun', label: 'Workflow Run' },
  { key: 'workflowrunstep', label: 'Workflow Run Step' },
  { key: 'workflowtask', label: 'Workflow Task' },
  { key: 'workflowtimer', label: 'Workflow Timer' },
  { key: 'workflowschedule', label: 'Workflow Schedule' },
  { key: 'agentsetting', label: 'Agent Setting' },
  { key: 'agentrun', label: 'Agent Run' },
  { key: 'agentrunstep', label: 'Agent Run Step' },
  { key: 'agentconversation', label: 'Agent Conversation' },
  { key: 'agentmessage', label: 'Agent Message' },
  { key: 'agent', label: 'Agent' },
  { key: 'mailsetting', label: 'Mail Setting' },
  { key: 'authsetting', label: 'Auth Setting' },
  { key: 'authsetuptoken', label: 'Auth Setup Token' },
  { key: 'authlogincode', label: 'Auth Login Code' },
  { key: 'authsessionrevocation', label: 'Auth Session Revocation' },
  { key: 'builderkey', label: 'Builder Key' },
  { key: 'dashboardengineconnection', label: 'Dashboard Engine Connection' },
  { key: 'dashboardengineorg', label: 'Dashboard Engine Org' },
  { key: 'embeddeddashboard', label: 'Embedded Dashboard' },
];

const ACTIONS: { key: string; label: string }[] = [
  { key: 'getAll', label: 'List' },
  { key: 'get', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'update', label: 'Update' },
  { key: 'delete', label: 'Delete' },
];

function emptyPerms(): Perms {
  const p: Perms = {};
  for (const e of ENTITIES) {
    p[e.key] = {};
    for (const a of ACTIONS) p[e.key][a.key] = false;
  }
  return p;
}

function normalize(input?: Perms): Perms {
  const base = emptyPerms();
  if (input) {
    for (const e of ENTITIES) {
      for (const a of ACTIONS) {
        if (input[e.key]?.[a.key]) base[e.key][a.key] = true;
      }
    }
  }
  return base;
}

function countGranted(p?: Perms): number {
  if (!p) return 0;
  let n = 0;
  for (const e of ENTITIES) for (const a of ACTIONS) if (p[e.key]?.[a.key]) n++;
  return n;
}

type Features = Record<string, boolean>;

/**
 * The role's feature switches as they currently take effect. A role saved before the switches
 * existed has none stored, so each shows what it effectively grants today (hasFeatureIn applies the
 * same legacy rule the backend does) — saving then writes those values down explicitly.
 */
function featuresOf(stored?: Perms): Features {
  const out: Features = {};
  for (const f of FEATURES) out[f.key] = hasFeatureIn(stored, false, f.key);
  return out;
}

/** A new role starts with only what every signed-in person already had. */
function defaultFeatures(): Features {
  const out: Features = {};
  for (const f of FEATURES) out[f.key] = f.legacy === 'everyone';
  return out;
}

/**
 * The permission JSON to save: the role's stored JSON with the matrix and the switches applied on
 * top. Merged, never rebuilt — the matrix only knows CRUD cells, and rebuilding from it dropped
 * everything else on the role (a workflow's action permissions: activate, roll back…).
 */
function mergeForSave(stored: Perms | undefined, matrix: Perms, features: Features): Perms {
  const out: Perms = { ...(stored || {}) };
  for (const [entity, cells] of Object.entries(matrix)) {
    out[entity] = { ...(stored?.[entity] || {}), ...cells };
  }
  out[FEATURES_KEY] = { ...((stored?.[FEATURES_KEY] as Features) || {}), ...features };
  return out;
}

function countFeatures(stored?: Perms): number {
  const on = featuresOf(stored);
  return FEATURES.filter((f) => on[f.key]).length;
}

/**
 * Screens a role either may use or may not — no create/read/update/delete to tick. Each is a
 * switch, enforced by the backend (src/guards/features.ts) and reflected in the sidebar.
 */
function FeatureAccess({
  value,
  onChange,
  readOnly,
}: {
  value: Features;
  onChange?: (f: Features) => void;
  readOnly?: boolean;
}) {
  if (FEATURES.length === 0) return null;
  return (
    <div className="space-y-3">
      <div>
        <Label>Feature access</Label>
        <p className="mt-1 text-sm text-muted-foreground">
          Screens a role can either use or not. Changes apply the next time a person signs in.
        </p>
      </div>
      <div className="divide-y rounded-xl border bg-card">
        {FEATURES.map((f) => {
          const id = 'feature-' + f.key;
          return (
            <div key={f.key} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <label htmlFor={id} className="text-sm font-medium">
                  {f.label}
                </label>
                <p className="text-xs text-muted-foreground">{f.description}</p>
              </div>
              <Switch
                id={id}
                disabled={readOnly}
                checked={!!value[f.key]}
                onCheckedChange={(on) => onChange?.({ ...value, [f.key]: !!on })}
                aria-label={f.label}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PermissionMatrix({
  value,
  onChange,
  readOnly,
}: {
  value: Perms;
  onChange?: (p: Perms) => void;
  readOnly?: boolean;
}) {
  const toggle = (ent: string, act: string) =>
    onChange?.({ ...value, [ent]: { ...value[ent], [act]: !value[ent]?.[act] } });
  const toggleRow = (ent: string, on: boolean) => {
    const row: Record<string, boolean> = {};
    for (const a of ACTIONS) row[a.key] = on;
    onChange?.({ ...value, [ent]: row });
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {/* Sticky, so on a narrow screen the row's name stays put while the checkboxes scroll. */}
            <TableHead className="sticky left-0 z-10 min-w-[8.5rem] bg-card">Entity</TableHead>
            {ACTIONS.map((a) => (
              <TableHead key={a.key} className="text-center">
                {a.label}
              </TableHead>
            ))}
            <TableHead className="text-center">All</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ENTITIES.map((e) => {
            const all = ACTIONS.every((a) => value[e.key]?.[a.key]);
            return (
              <TableRow key={e.key}>
                <TableCell className="sticky left-0 z-10 min-w-[8.5rem] bg-card font-medium">{e.label}</TableCell>
                {ACTIONS.map((a) => (
                  <TableCell key={a.key} className="text-center">
                    <Checkbox
                      disabled={readOnly}
                      checked={!!value[e.key]?.[a.key]}
                      onCheckedChange={() => toggle(e.key, a.key)}
                    />
                  </TableCell>
                ))}
                <TableCell className="text-center">
                  <Checkbox
                    disabled={readOnly}
                    checked={all}
                    onCheckedChange={(c) => toggleRow(e.key, !!c)}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function RolesAndPermissionsList() {
  const navigate = useNavigate();
  const base = useRolesBase();
  const [toDelete, setToDelete] = useState<{ id: number } | null>(null);
  const { data, isLoading } = hooks.useList({ page: 0, limit: 100 });
  const del = hooks.useDelete();
  const rows: Role[] = data?.data ?? [];
  const readOnly = usePlatformReadOnly();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roles &amp; Permissions</h1>
          <p className="text-sm text-muted-foreground">Manage roles and what each can access.</p>
        </div>
        <Button onClick={() => navigate(base + '/new')}>
          <Plus className="h-4 w-4" /> Add Role
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Permissions granted</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                  No roles yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`${base}/${row.id}`)}
                >
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      {row.role}
                      {row.isPlatform ? <PlatformBadge /> : null}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex flex-wrap gap-1.5">
                      <Badge variant="secondary">{countGranted(row.entityPermissions)} permissions</Badge>
                      {FEATURES.length > 0 && (
                        <Badge variant="outline">
                          {countFeatures(row.entityPermissions)}/{FEATURES.length} features
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="View"
                        aria-label="View"
                        onClick={() => navigate(`${base}/${row.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {readOnly(row) ? null : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Edit"
                            aria-label="Edit"
                            onClick={() => navigate(`${base}/${row.id}/edit`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Delete"
                            aria-label="Delete"
                            onClick={() => setToDelete({ id: row.id })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete role?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={del.isPending}
              onClick={() => toDelete && del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
            >
              {del.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoleForm({ mode }: { mode: 'create' | 'edit' }) {
  const navigate = useNavigate();
  const base = useRolesBase();
  const { id } = useParams();
  const isEdit = mode === 'edit';
  const [role, setRole] = useState('');
  const [perms, setPerms] = useState<Perms>(emptyPerms());
  const [features, setFeatures] = useState<Features>(defaultFeatures());
  const [error, setError] = useState('');

  const one = hooks.useOne(isEdit ? id : undefined);
  const create = hooks.useCreate();
  const update = hooks.useUpdate();

  useEffect(() => {
    if (isEdit && one.data) {
      setRole(one.data.role ?? '');
      setPerms(normalize(one.data.entityPermissions));
      setFeatures(featuresOf(one.data.entityPermissions));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, one.data]);

  const saving = create.isPending || update.isPending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role.trim()) {
      setError('Role name is required');
      return;
    }
    setError('');
    const stored = isEdit ? one.data?.entityPermissions : undefined;
    const payload = { role: role.trim(), entityPermissions: mergeForSave(stored, perms, features) };
    if (isEdit) {
      update.mutate({ id: id as string, payload }, { onSuccess: () => navigate(base) });
    } else {
      create.mutate(payload, { onSuccess: () => navigate(base) });
    }
  };

  if (isEdit && one.isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{isEdit ? 'Edit Role' : 'New Role'}</h1>
      </div>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="max-w-sm space-y-2">
            <Label htmlFor="role">
              Role name<span className="text-destructive"> *</span>
            </Label>
            <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. admin" />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          {/* Member is the role public sign-up offers first. This is a warning about what sign-up
              would be granting — not a claim that registration is on. Nothing else in the product says it. */}
          {role.trim().toLowerCase() === 'member' && (
            <div className="rounded-md border border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <strong>This is the sign-up role.</strong> If public sign-up hands out this role,
              whatever you tick here is granted to anyone who signs up. Check Settings → Sign-in &amp;
              Email to see whether sign-up is on, and which role it gives.
            </div>
          )}

          <div className="space-y-2">
            <Label>Permissions</Label>
            <PermissionMatrix value={perms} onChange={setPerms} />
          </div>

          <FeatureAccess value={features} onChange={setFeatures} />

          <div className="flex justify-end gap-2 border-t pt-5">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEdit ? 'Save changes' : 'Create role'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

export function RolesAndPermissionsCreate() {
  return <RoleForm mode="create" />;
}

export function RolesAndPermissionsEdit() {
  return <RoleForm mode="edit" />;
}

export function RolesAndPermissionsShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const base = useRolesBase();
  const { data, isLoading } = hooks.useOne(id);
  const readOnly = usePlatformReadOnly();

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data) return <div className="text-muted-foreground">Role not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(base)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {data.role}
            {data.isPlatform ? <PlatformBadge /> : null}
          </h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Active Manual Start workflows on roles, run on this role. */}
          <RunWorkflowButton entity="RolesAndPermissions" recordId={data.id} />
          {readOnly(data) ? (
            <p className="text-sm text-muted-foreground">Provided by the platform. Your organization can assign it, not change it.</p>
          ) : (
            <Button onClick={() => navigate(`${base}/${data.id}/edit`)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          )}
        </div>
      </div>
      <PermissionMatrix value={normalize(data.entityPermissions)} readOnly />
      <FeatureAccess value={featuresOf(data.entityPermissions)} readOnly />
    </div>
  );
}
