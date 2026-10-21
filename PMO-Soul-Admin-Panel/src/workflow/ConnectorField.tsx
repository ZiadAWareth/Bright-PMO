import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * The Connector step's three linked pickers: connector → action → connection, from THIS app's
 * enabled connectors (GET /api/connectors/catalog) and its connections (/api/connectors/connections).
 *
 * Both routes are administrator-only. For anyone else, or an app with nothing enabled, the field falls
 * back to a plain text box — typing the id still works, and the step refuses a wrong one by name.
 */
type Kind = 'connector' | 'connectorAction' | 'connection';

interface CatalogEntry {
  id: string;
  label: string;
  available: boolean;
  actions: Array<{ name: string; label: string; description?: string; props: Array<{ key: string; label: string; required: boolean }> }>;
}
interface Connection { id: number; connectorId: string; name: string; hint: string }

const cls =
  'h-8 w-full rounded-md border border-border bg-background px-2 text-[13px] text-foreground focus:border-primary/50 focus:outline-none';

export default function ConnectorField({
  kind,
  value,
  config,
  onChange,
}: {
  kind: Kind;
  value: string;
  config: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const catalog = useQuery<CatalogEntry[]>({
    queryKey: ['connectors-catalog'],
    queryFn: async () => (await api.get('/connectors/catalog')).data,
    retry: false,
    staleTime: 60_000,
  });
  const connections = useQuery<Connection[]>({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connectors/connections')).data,
    retry: false,
    staleTime: 30_000,
    enabled: kind === 'connection',
  });
  const plain = (
    <input className={cls} value={value} onChange={(e) => onChange({ [keyOf(kind)]: e.target.value })} placeholder={placeholder(kind)} />
  );
  const list = (catalog.data ?? []).filter((c) => c.available);
  if (catalog.isError || !list.length) return plain;

  const connectorId = String(config.connector ?? '');
  if (kind === 'connector') {
    return (
      // A new connector clears the action and the connection: neither belongs to the old one.
      <select className={cls} value={value} onChange={(e) => onChange({ connector: e.target.value, action: '', connection: '' })}>
        <option value="">Choose a connector…</option>
        {list.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
    );
  }
  const entry = list.find((c) => c.id === connectorId);
  if (!entry) return <p className="text-[12px] text-muted-foreground">Choose a connector first.</p>;
  if (kind === 'connectorAction') {
    const chosen = entry.actions.find((a) => a.name === value);
    return (
      <div className="space-y-1">
        <select className={cls} value={value} onChange={(e) => onChange({ action: e.target.value })}>
          <option value="">Choose an action…</option>
          {entry.actions.map((a) => <option key={a.name} value={a.name}>{a.label}</option>)}
        </select>
        {chosen?.description && <p className="text-[12px] text-muted-foreground">{chosen.description}</p>}
        {chosen && chosen.props.length > 0 && (
          <p className="text-[12px] text-muted-foreground">
            Inputs: {chosen.props.map((p) => p.key + (p.required ? '*' : '')).join(', ')} — set them under Inputs.
          </p>
        )}
      </div>
    );
  }
  if (connections.isError) return plain;
  const mine = (connections.data ?? []).filter((c) => c.connectorId === connectorId);
  if (!connections.isLoading && !mine.length) {
    return <p className="text-[12px] text-muted-foreground">No {entry.label} connection yet — add one on the Connections page.</p>;
  }
  return (
    <select className={cls} value={value} onChange={(e) => onChange({ connection: e.target.value })}>
      <option value="">Choose a connection…</option>
      {mine.map((c) => <option key={c.id} value={String(c.id)}>{c.name}{c.hint ? ' — ' + c.hint : ''}</option>)}
    </select>
  );
}

const keyOf = (kind: Kind) => (kind === 'connectorAction' ? 'action' : kind);
const placeholder = (kind: Kind) =>
  kind === 'connector' ? 'e.g. oracle-database' : kind === 'connectorAction' ? 'e.g. find_row' : 'Connection id';
