import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Pencil, Plug, Plus, ShieldAlert, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

/** Mirrors ConnectorInfo / ConnectorProp in src/connectors/connector-runtime.ts. */
interface ConnectorProp {
  key: string;
  type: string;
  required: boolean;
  label: string;
  description?: string;
  options?: Array<{ label: string; value: unknown }>;
  secret?: boolean;
}
interface ConnectorInfo {
  id: string;
  label: string;
  available: boolean;
  problem?: string;
  auth: Array<{ kind: string; label: string; description?: string; props: ConnectorProp[] }>;
  actions: Array<{ name: string; label: string }>;
}
interface Connection {
  id: number;
  connectorId: string;
  name: string;
  authKind: string;
  hint: string;
  updatedAt: string;
  updatedByEmail: string | null;
}

function errorMessage(err: unknown): string {
  const res = (err as { response?: { data?: { message?: string | string[] }; status?: number } }).response;
  const message = res?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message || (err as Error).message || 'Something went wrong.';
}

function isForbidden(err: unknown): boolean {
  return (err as { response?: { status?: number } })?.response?.status === 403;
}

/** One input, chosen by what the connector says the value is. */
function Field({ prop, value, editing, onChange }: { prop: ConnectorProp; value: string; editing: boolean; onChange: (v: string) => void }) {
  const id = 'f-' + prop.key;
  const label = prop.label + (prop.required && !(editing && prop.secret) ? ' *' : '');
  let control;
  if (prop.options && prop.options.length) {
    control = (
      <select id={id} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose…</option>
        {prop.options.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
      </select>
    );
  } else if (prop.type === 'LONG_TEXT') {
    control = <Textarea id={id} rows={4} value={value} onChange={(e) => onChange(e.target.value)} placeholder={editing && prop.secret ? 'Saved — leave blank to keep' : ''} />;
  } else if (prop.type === 'CHECKBOX') {
    control = <input id={id} type="checkbox" className="h-4 w-4" checked={value === 'true'} onChange={(e) => onChange(e.target.checked ? 'true' : '')} />;
  } else {
    control = (
      <Input
        id={id}
        type={prop.secret ? 'password' : prop.type === 'NUMBER' ? 'number' : 'text'}
        autoComplete={prop.secret ? 'new-password' : 'off'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={editing && prop.secret ? 'Saved — leave blank to keep' : ''}
      />
    );
  }
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {control}
      {prop.description && <p className="text-xs text-muted-foreground">{prop.description}</p>}
    </div>
  );
}

/** Add or edit one connection. A secret left blank on edit keeps what is saved. */
function ConnectionForm({ connector, existing, onDone }: { connector: ConnectorInfo; existing?: Connection; onDone: () => void }) {
  const client = useQueryClient();
  const option = connector.auth[0];
  const [name, setName] = useState(existing?.name ?? '');
  const [values, setValues] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: async () => {
      const typed: Record<string, unknown> = {};
      for (const p of option.props) {
        const v = values[p.key];
        if (v === undefined || v === '') continue;
        typed[p.key] = p.type === 'NUMBER' ? Number(v) : p.type === 'CHECKBOX' ? v === 'true' : v;
      }
      const body = { connectorId: connector.id, name, authKind: option.kind, values: typed };
      return existing ? api.patch('/connectors/connections/' + existing.id, body) : api.post('/connectors/connections', body);
    },
    onSuccess: () => {
      toast.success(existing ? 'Connection saved.' : 'Connection added.');
      client.invalidateQueries({ queryKey: ['connections'] });
      onDone();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  return (
    <form className="space-y-3 rounded-md border p-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <div className="space-y-1">
        <Label htmlFor="conn-name">Name *</Label>
        <Input id="conn-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Finance database" />
      </div>
      {option.description && <p className="text-xs text-muted-foreground">{option.description}</p>}
      {option.props.map((p) => (
        <Field key={p.key} prop={p} editing={!!existing} value={values[p.key] ?? ''} onChange={(v) => setValues((s) => ({ ...s, [p.key]: v }))} />
      ))}
      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending}>{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save</Button>
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

function ConnectionRow({ connection, connector }: { connection: Connection; connector: ConnectorInfo }) {
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [verdict, setVerdict] = useState<{ valid: boolean | null; message?: string } | null>(null);
  const test = useMutation({
    mutationFn: async () => (await api.post('/connectors/connections/' + connection.id + '/test')).data,
    onSuccess: (v) => setVerdict(v),
    onError: (err) => setVerdict({ valid: false, message: errorMessage(err) }),
  });
  const remove = useMutation({
    mutationFn: async () => api.delete('/connectors/connections/' + connection.id),
    onSuccess: () => { toast.success('Connection removed.'); client.invalidateQueries({ queryKey: ['connections'] }); },
    onError: (err) => toast.error(errorMessage(err)),
  });
  if (editing) return <ConnectionForm connector={connector} existing={connection} onDone={() => setEditing(false)} />;
  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium">{connection.name} <span className="text-xs text-muted-foreground">#{connection.id}</span></div>
          <div className="truncate text-xs text-muted-foreground">{connection.hint || 'No details to show'}</div>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => test.mutate()} disabled={test.isPending}>
            {test.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Test
          </Button>
          <Button size="sm" variant="ghost" aria-label="Edit" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" aria-label="Remove"
            onClick={() => { if (window.confirm('Remove the connection "' + connection.name + '"? Workflow steps that use it will fail.')) remove.mutate(); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {verdict && (
        <div className={'mt-2 flex items-start gap-2 text-sm ' + (verdict.valid ? 'text-green-700' : verdict.valid === false ? 'text-destructive' : 'text-muted-foreground')}>
          {verdict.valid ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <XCircle className="mt-0.5 h-4 w-4" />}
          <span className="whitespace-pre-wrap break-words">{verdict.valid ? 'Connected.' : verdict.message || 'The connection was refused.'}</span>
        </div>
      )}
    </div>
  );
}

export default function ConnectionsPage() {
  const catalog = useQuery<ConnectorInfo[]>({ queryKey: ['connectors-catalog'], queryFn: async () => (await api.get('/connectors/catalog')).data, retry: false });
  const connections = useQuery<Connection[]>({ queryKey: ['connections'], queryFn: async () => (await api.get('/connectors/connections')).data, retry: false, enabled: !!catalog.data?.length });
  const [adding, setAdding] = useState<string | null>(null);

  if (catalog.isLoading) return <div className="space-y-3 p-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-40 w-full" /></div>;
  if (catalog.isError) {
    return (
      <div className="p-6">
        <Card><CardContent className="flex items-start gap-3 pt-6 text-sm">
          <ShieldAlert className="h-5 w-5 text-muted-foreground" />
          {isForbidden(catalog.error) ? 'Only an administrator can manage this app\'s connections.' : errorMessage(catalog.error)}
        </CardContent></Card>
      </div>
    );
  }
  const list = catalog.data ?? [];
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><Plug className="h-6 w-6" /> Connections</h1>
        <p className="text-sm text-muted-foreground">
          Connect the outside systems this app&apos;s workflows use. Values are stored encrypted; passwords and keys are never shown again.
        </p>
      </div>
      {!list.length && (
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">
          No connectors are enabled for this app. Tick them in Soul (Generation → Connectors) and redeploy.
        </CardContent></Card>
      )}
      {list.map((c) => {
        const mine = (connections.data ?? []).filter((x) => x.connectorId === c.id);
        return (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                {c.label}
                {c.available ? <Badge variant="secondary">{c.actions.length} actions</Badge> : <Badge variant="destructive">Not installed</Badge>}
              </CardTitle>
              <CardDescription>
                {c.available ? (c.auth.length ? 'Connects with: ' + c.auth[0].label : 'This connector needs a sign-in flow Soul does not offer yet.') : c.problem}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {mine.map((conn) => <ConnectionRow key={conn.id} connection={conn} connector={c} />)}
              {c.available && c.auth.length > 0 && (adding === c.id
                ? <ConnectionForm connector={c} onDone={() => setAdding(null)} />
                : <Button variant="outline" size="sm" onClick={() => setAdding(c.id)}><Plus className="mr-1 h-4 w-4" /> Add connection</Button>)}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
