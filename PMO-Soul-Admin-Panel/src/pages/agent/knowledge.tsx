import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Boxes,
  ChevronRight,
  EyeOff,
  GitBranch,
  Lock,
  Route as RouteIcon,
  Search,
  Sparkles,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/** Mirrors GroundingPack in src/agent/grounding/grounding.service.ts. */
interface Field {
  name: string;
  type: string;
  kind: string;
  required: boolean;
  list: boolean;
  unique: boolean;
  isId: boolean;
  generated: boolean;
  sensitive: boolean;
  description?: string;
}
interface Relation { field: string; target: string; cardinality: string; foreignKeys: string[] }
interface Entity {
  name: string;
  displayField: string;
  idField: string;
  description?: string;
  fields: Field[];
  relations: Relation[];
}
interface WorkflowEntry {
  id: string;
  name: string;
  description?: string;
  entity?: string;
  status: string;
  version?: number;
  triggers: { id: string; type: string; label?: string; describedAs?: string }[];
  steps: { id: string; type: string; label?: string }[];
  transitions: unknown[];
}
interface RouteEntry {
  method: string;
  path: string;
  entity?: string;
  operation: string;
  mutates: boolean;
}
interface GroundingPack {
  appName: string;
  schema: { entities: Entity[]; enums: { name: string; values: string[] }[]; fingerprint: string };
  workflows: { workflows: WorkflowEntry[]; inactiveCount: number };
  catalog: { routes: RouteEntry[]; pulses: { type: string; category: string; label: string; description: string }[] };
  redactedFields: { entity: string; field: string; reason: string }[];
  hiddenByPermissionCount: number;
  version: string;
  builtAt: string;
}

interface AgentHealth {
  configured: boolean;
  provider?: string;
  providerLabel?: string;
  model?: string;
  reason?: string;
}

/** Every pane scrolls inside itself, so the page is one screen tall however big the app is. */
const PANE_HEIGHT = 'h-[min(620px,calc(100vh-19rem))] min-h-[360px]';

const plural = (n: number, word: string) => n + ' ' + word + (n === 1 ? '' : 's');

function StatTile({ label, value, icon: Icon, onClick }: { label: string; value: number; icon: LucideIcon; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-semibold tabular-nums leading-tight">{value}</span>
        <span className="block truncate text-xs text-muted-foreground">{label}</span>
      </span>
    </button>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-9 pl-9" />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="grid h-full place-items-center p-8 text-center text-sm text-muted-foreground">{children}</div>;
}

function FieldFlags({ field }: { field: Field }) {
  return (
    <div className="flex flex-wrap gap-1">
      {field.isId && <Badge variant="secondary">id</Badge>}
      {field.required && !field.isId && <Badge variant="outline">required</Badge>}
      {field.unique && !field.isId && <Badge variant="outline">unique</Badge>}
      {field.list && <Badge variant="outline">list</Badge>}
      {field.generated && <Badge variant="outline">auto</Badge>}
      {field.sensitive && (
        <Badge variant="destructive" className="gap-1">
          <Lock className="h-3 w-3" /> withheld
        </Badge>
      )}
    </div>
  );
}

/** One table, in full: what it is, its fields (with their fixed choices inline) and its links. */
function EntityDetail({ entity, enums, onOpen }: { entity: Entity; enums: Map<string, string[]>; onOpen: (name: string) => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">{entity.name}</h2>
          <Badge variant="secondary">shown as {entity.displayField}</Badge>
          <span className="text-xs text-muted-foreground">{plural(entity.fields.length, 'field')}</span>
        </div>
        {entity.description && <p className="mt-1.5 text-sm text-muted-foreground">{entity.description}</p>}
        {entity.relations.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-medium text-muted-foreground">Linked to</span>
            {entity.relations.map((relation) => (
              <button
                key={relation.field}
                type="button"
                onClick={() => onOpen(relation.target)}
                className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title={'Open ' + relation.target}
              >
                <GitBranch className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{relation.target}</span>
                <span className="text-muted-foreground">
                  via {relation.field} · {relation.cardinality === 'many' ? 'many' : 'one'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground shadow-[0_1px_0_0_hsl(var(--border))]">
            <tr>
              <th className="px-5 py-2.5 text-left font-medium">Field</th>
              <th className="px-3 py-2.5 text-left font-medium">Type</th>
              <th className="px-5 py-2.5 text-left font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {entity.fields.map((field) => {
              const choices = enums.get(field.type);
              return (
                <tr key={field.name} className="border-t align-top">
                  <td className="px-5 py-2.5">
                    <span className="font-medium">{field.name}</span>
                    {field.description && <span className="mt-0.5 block text-xs text-muted-foreground">{field.description}</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-xs text-muted-foreground">{field.type}{field.list ? '[]' : ''}</span>
                    {choices && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {choices.slice(0, 6).map((value) => (
                          <span key={value} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{value}</span>
                        ))}
                        {choices.length > 6 && <span className="text-[11px] text-muted-foreground">+{choices.length - 6} more</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-2.5"><FieldFlags field={field} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AgentKnowledge() {
  const [tab, setTab] = useState('data');
  const [entityQuery, setEntityQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [ruleQuery, setRuleQuery] = useState('');
  const [routeQuery, setRouteQuery] = useState('');
  const [routeKind, setRouteKind] = useState<'all' | 'read' | 'change'>('all');

  const { data, isLoading, error } = useQuery<GroundingPack>({
    queryKey: ['agent', 'grounding'],
    queryFn: async () => (await api.get('/api/agent/grounding')).data,
  });

  // Health is a separate, deliberately cheap call: it makes no outbound request to the provider.
  const { data: health } = useQuery<AgentHealth>({
    queryKey: ['agent', 'health'],
    queryFn: async () => (await api.get('/api/agent/health')).data,
  });

  const enums = useMemo(
    () => new Map((data?.schema.enums ?? []).map((e) => [e.name, e.values] as [string, string[]])),
    [data],
  );
  const entities = useMemo(() => {
    const q = entityQuery.trim().toLowerCase();
    return (data?.schema.entities ?? []).filter((entity) =>
      !q || entity.name.toLowerCase().includes(q) || entity.fields.some((f) => f.name.toLowerCase().includes(q)));
  }, [data, entityQuery]);
  const routes = useMemo(() => {
    const q = routeQuery.trim().toLowerCase();
    return (data?.catalog.routes ?? []).filter((route) =>
      (routeKind === 'all' || (routeKind === 'change') === route.mutates) &&
      (!q || route.path.toLowerCase().includes(q) || (route.entity ?? '').toLowerCase().includes(q) || route.operation.toLowerCase().includes(q)));
  }, [data, routeQuery, routeKind]);
  const rules = useMemo(() => {
    const q = ruleQuery.trim().toLowerCase();
    return (data?.workflows.workflows ?? []).filter((w) =>
      !q || w.name.toLowerCase().includes(q) || (w.entity ?? '').toLowerCase().includes(q));
  }, [data, ruleQuery]);
  const withheldByEntity = useMemo(() => {
    const groups = new Map<string, { field: string; reason: string }[]>();
    for (const item of data?.redactedFields ?? []) {
      groups.set(item.entity, [...(groups.get(item.entity) ?? []), { field: item.field, reason: item.reason }]);
    }
    return [...groups.entries()];
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-96" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
        <Skeleton className="h-[480px]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
          <AlertCircle className="h-5 w-5" />
          Could not load what this app knows about itself.
        </CardContent>
      </Card>
    );
  }

  const current = data.schema.entities.find((e) => e.name === selected) ?? entities[0] ?? null;
  const fieldCount = data.schema.entities.reduce((total, entity) => total + entity.fields.length, 0);
  const openEntity = (name: string) => {
    setTab('data');
    setEntityQuery('');
    setSelected(name);
  };

  return (
    <div className="space-y-5">
      {/* ── What this is, and whether the assistant is on ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">App knowledge</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            What the assistant is told about {data.appName} before it answers, filtered to what you are
            allowed to see. Viewing it never calls an AI provider.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {health?.configured ? (
            <Badge variant="success" className="gap-1.5">
              <Sparkles className="h-3 w-3" />
              Assistant on · {health.providerLabel ?? health.provider}{health.model ? ' · ' + health.model : ''}
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1.5" title="No AI provider key is configured, so nothing is sent anywhere.">
              <Sparkles className="h-3 w-3" /> Assistant dormant
            </Badge>
          )}
          <span className="text-[11px] text-muted-foreground">
            Version {data.version} · built {new Date(data.builtAt).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={'Tables · ' + plural(fieldCount, 'field')} value={data.schema.entities.length} icon={Boxes} onClick={() => setTab('data')} />
        <StatTile label="Live rules (workflows)" value={data.workflows.workflows.length} icon={Workflow} onClick={() => setTab('rules')} />
        <StatTile label="Actions it can take" value={data.catalog.routes.length} icon={RouteIcon} onClick={() => setTab('actions')} />
        <StatTile label="Fields withheld" value={data.redactedFields.length} icon={EyeOff} onClick={() => setTab('withheld')} />
      </div>

      {data.hiddenByPermissionCount > 0 && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <EyeOff className="h-3.5 w-3.5" />
          {plural(data.hiddenByPermissionCount, 'table')} hidden by your role, so the assistant will not see them for you either.
        </p>
      )}

      <Tabs value={tab} onValueChange={setTab} className="space-y-3">
        <TabsList className="h-auto flex-wrap justify-start gap-1 rounded-xl p-1">
          <TabsTrigger value="data" className="gap-2 rounded-lg px-3.5 py-1.5">
            Data <span className="text-xs text-muted-foreground">{data.schema.entities.length}</span>
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2 rounded-lg px-3.5 py-1.5">
            Rules <span className="text-xs text-muted-foreground">{data.workflows.workflows.length}</span>
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-2 rounded-lg px-3.5 py-1.5">
            Actions <span className="text-xs text-muted-foreground">{data.catalog.routes.length}</span>
          </TabsTrigger>
          <TabsTrigger value="withheld" className="gap-2 rounded-lg px-3.5 py-1.5">
            Withheld <span className="text-xs text-muted-foreground">{data.redactedFields.length}</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Data: a table list beside ONE table's detail ── */}
        <TabsContent value="data" className="mt-0">
          <Card className={cn('grid overflow-hidden md:grid-cols-[17rem_1fr]', PANE_HEIGHT)}>
            <div className="flex min-h-0 flex-col border-b md:border-b-0 md:border-r">
              <div className="border-b p-3">
                <SearchBox value={entityQuery} onChange={setEntityQuery} placeholder="Find a table or field" />
              </div>
              <nav aria-label="Tables" className="min-h-0 flex-1 overflow-y-auto p-2">
                {entities.length === 0 && <Empty>No table or field matches.</Empty>}
                {entities.map((entity) => {
                  const active = current?.name === entity.name;
                  return (
                    <button
                      key={entity.name}
                      type="button"
                      onClick={() => setSelected(entity.name)}
                      aria-current={active ? 'true' : undefined}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active ? 'bg-primary/10 text-foreground' : 'hover:bg-muted/60',
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className={cn('block truncate', active ? 'font-semibold' : 'font-medium')}>{entity.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {plural(entity.fields.length, 'field')}
                          {entity.relations.length ? ' · ' + plural(entity.relations.length, 'link') : ''}
                        </span>
                      </span>
                      <ChevronRight className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground/50')} />
                    </button>
                  );
                })}
              </nav>
            </div>
            <div className="min-h-0">
              {current ? <EntityDetail entity={current} enums={enums} onOpen={openEntity} /> : <Empty>Pick a table on the left.</Empty>}
            </div>
          </Card>
        </TabsContent>

        {/* ── Rules: the workflows that actually run ── */}
        <TabsContent value="rules" className="mt-0">
          <Card className={cn('flex flex-col overflow-hidden', PANE_HEIGHT)}>
            <div className="flex flex-wrap items-center gap-3 border-b p-3">
              <div className="w-full max-w-xs"><SearchBox value={ruleQuery} onChange={setRuleQuery} placeholder="Find a rule" /></div>
              {data.workflows.inactiveCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {plural(data.workflows.inactiveCount, 'draft or inactive workflow')} left out — only rules that run are shared.
                </span>
              )}
            </div>
            <div className="min-h-0 flex-1 divide-y overflow-y-auto">
              {rules.length === 0 && <Empty>{data.workflows.workflows.length ? 'No rule matches.' : 'No live workflows.'}</Empty>}
              {rules.map((workflow) => (
                <details key={workflow.id} className="group px-4 py-3 open:bg-muted/30">
                  <summary className="flex cursor-pointer list-none items-center gap-3">
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{workflow.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {workflow.triggers.length === 0
                          ? 'Started manually'
                          : 'Runs when ' + workflow.triggers.map((t) => t.label || t.describedAs || t.type).join(' or ')}
                      </span>
                    </span>
                    {workflow.entity && (
                      <button type="button" onClick={(e) => { e.preventDefault(); openEntity(workflow.entity as string); }}>
                        <Badge variant="secondary">{workflow.entity}</Badge>
                      </button>
                    )}
                    <span className="hidden text-xs text-muted-foreground sm:inline">{plural(workflow.steps.length, 'step')}</span>
                    <Badge variant="success">{workflow.status}</Badge>
                  </summary>
                  <div className="mt-3 space-y-2 pl-7">
                    {workflow.description && <p className="text-sm text-muted-foreground">{workflow.description}</p>}
                    <ol className="flex flex-wrap items-center gap-1.5 text-xs">
                      {workflow.steps.map((step, i) => (
                        <li key={step.id} className="flex items-center gap-1.5">
                          {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                          <span className="rounded-md border bg-card px-2 py-0.5">{step.label || step.type}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </details>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ── Actions: what the assistant's tools can call ── */}
        <TabsContent value="actions" className="mt-0">
          <Card className={cn('flex flex-col overflow-hidden', PANE_HEIGHT)}>
            <div className="flex flex-wrap items-center gap-3 border-b p-3">
              <div className="w-full max-w-xs"><SearchBox value={routeQuery} onChange={setRouteQuery} placeholder="Find an action, table or path" /></div>
              <div role="radiogroup" aria-label="Kind of action" className="inline-flex rounded-lg border p-0.5">
                {([['all', 'All'], ['read', 'Reads'], ['change', 'Changes data']] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={routeKind === id}
                    onClick={() => setRouteKind(id)}
                    className={cn('rounded-md px-2.5 py-1 text-xs font-medium transition-colors', routeKind === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="ml-auto text-xs text-muted-foreground">{plural(routes.length, 'action')}</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {routes.length === 0 ? <Empty>No action matches.</Empty> : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground shadow-[0_1px_0_0_hsl(var(--border))]">
                    <tr>
                      <th className="w-24 px-4 py-2.5 text-left font-medium">Method</th>
                      <th className="px-3 py-2.5 text-left font-medium">Does</th>
                      <th className="px-4 py-2.5 text-left font-medium">Path</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routes.map((route) => (
                      <tr key={route.method + route.path} className="border-t">
                        <td className="px-4 py-2">
                          <Badge variant={route.mutates ? 'default' : 'secondary'} className="font-mono text-[11px]">{route.method}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          {route.operation}
                          {route.entity && <span className="text-muted-foreground"> · {route.entity}</span>}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{route.path}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* ── Withheld: fields whose VALUES the assistant can never be given ── */}
        <TabsContent value="withheld" className="mt-0">
          <Card className={cn('flex flex-col overflow-hidden', PANE_HEIGHT)}>
            <div className="border-b p-4">
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                The assistant is told these fields exist, so it can describe your data accurately, but it
                can never be given their values — not by any question, and not by any tool.
              </p>
            </div>
            <div className="min-h-0 flex-1 divide-y overflow-y-auto">
              {withheldByEntity.length === 0 && <Empty>Nothing is withheld.</Empty>}
              {withheldByEntity.map(([entity, fields]) => (
                <div key={entity} className="flex flex-wrap items-start gap-3 px-4 py-3">
                  <button type="button" onClick={() => openEntity(entity)} className="w-40 shrink-0 truncate text-left text-sm font-medium hover:text-primary">
                    {entity}
                  </button>
                  <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                    {fields.map((f) => (
                      <Badge key={f.field} variant="destructive" className="gap-1" title={f.reason}>
                        <Lock className="h-3 w-3" /> {f.field}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
