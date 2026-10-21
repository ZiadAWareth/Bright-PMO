import { hash32 } from './schema-context';

/** The workflow row shape this needs, as stored by the builder. */
export interface WorkflowRow {
  id: string;
  name: string;
  description?: string | null;
  entityName?: string | null;
  status?: string | null;
  version?: number | null;
  definition?: unknown;
  updatedAt?: Date | string | null;
}

export interface WorkflowStepContext {
  id: string;
  /** Namespaced pulse type, e.g. `data.createRecord`. */
  type: string;
  label?: string;
  /** Human wording from the pulse catalog, when the type is known to this build. */
  describedAs?: string;
}

export interface WorkflowTransitionContext {
  from: string;
  to: string;
  /** Branch label — `true`/`false` or a gateway case. Absent = unconditional. */
  when?: string;
}

export interface WorkflowContextEntry {
  id: string;
  name: string;
  description?: string;
  entity?: string;
  status: string;
  version?: number;
  triggers: WorkflowStepContext[];
  steps: WorkflowStepContext[];
  transitions: WorkflowTransitionContext[];
  updatedAt?: string;
}

export interface WorkflowContext {
  workflows: WorkflowContextEntry[];
  /** Count of rows excluded because they are not live. Reported so the inspector page can say
   *  "3 drafts hidden" rather than silently under-reporting the app's automation. */
  inactiveCount: number;
  fingerprint: string;
}

export interface BuildWorkflowContextOptions {
  /** `meta.type` -> one-line description, from the pulse registry manifest. */
  pulseDescriptions?: Record<string, string>;
  /** Statuses considered "in force". Drafts are excluded because describing a rule that is not
   *  running is worse than omitting it — the agent would assert behaviour that never happens. */
  activeStatuses?: string[];
  includeInactive?: boolean;
}

const DEFAULT_ACTIVE_STATUSES = ['ACTIVE', 'PUBLISHED'];

export function buildWorkflowContext(
  rows: readonly WorkflowRow[],
  options: BuildWorkflowContextOptions = {},
): WorkflowContext {
  const active = new Set((options.activeStatuses || DEFAULT_ACTIVE_STATUSES).map((s) => s.toUpperCase()));
  const descriptions = options.pulseDescriptions || {};

  const kept = rows.filter((row) => options.includeInactive || active.has(String(row.status || '').toUpperCase()));

  const workflows = kept
    .map((row) => buildEntry(row, descriptions))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    workflows,
    inactiveCount: rows.length - kept.length,
    fingerprint: hash32(
      workflows.map((w) => `${w.id}:${w.version ?? ''}:${w.status}:${w.updatedAt ?? ''}`).join('|'),
    ),
  };
}

function buildEntry(row: WorkflowRow, descriptions: Record<string, string>): WorkflowContextEntry {
  const { nodes, edges } = readDefinition(row.definition);

  const steps: WorkflowStepContext[] = nodes.map((node) => ({
    id: String(node.id),
    type: String(node.type || ''),
    label: typeof node.label === 'string' ? node.label : undefined,
    describedAs: descriptions[String(node.type || '')],
  }));

  // Triggers are what the agent needs to answer "when does this happen?". Identified by pulse
  // namespace, with the legacy `kind` as fallback for definitions written before namespacing.
  const triggers = steps.filter((step, index) => {
    if (step.type.startsWith('trigger.')) return true;
    const kind = nodes[index]?.kind;
    return typeof kind === 'string' && kind.toLowerCase() === 'trigger';
  });

  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    entity: row.entityName || undefined,
    status: String(row.status || 'UNKNOWN').toUpperCase(),
    version: row.version ?? undefined,
    triggers,
    steps,
    transitions: edges.map((edge) => ({
      from: String(edge.from),
      to: String(edge.to),
      when: edge.condition ? String(edge.condition) : undefined,
    })),
    updatedAt: toIso(row.updatedAt),
  };
}

interface RawNode { id: unknown; type?: unknown; kind?: unknown; label?: unknown }
interface RawEdge { from: unknown; to: unknown; condition?: unknown }

/**
 * `definition` is a Json column, so it is `unknown` at runtime and may predate the current
 * shape. Parsed defensively: a malformed workflow must degrade to "no steps", never throw and
 * take the whole grounding pack — and therefore the assistant — down with it.
 */
function readDefinition(definition: unknown): { nodes: RawNode[]; edges: RawEdge[] } {
  let value = definition;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return { nodes: [], edges: [] };
    }
  }
  if (!value || typeof value !== 'object') return { nodes: [], edges: [] };

  const record = value as Record<string, unknown>;
  const nodes = Array.isArray(record.nodes) ? (record.nodes as RawNode[]).filter(hasId) : [];
  const edges = Array.isArray(record.edges)
    ? (record.edges as RawEdge[]).filter((edge) => edge && edge.from != null && edge.to != null)
    : [];
  return { nodes, edges };
}

function hasId(node: RawNode): boolean {
  return Boolean(node && node.id != null);
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
