import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PulseManifestEntry, TriggerInputSpec } from './workflowService';

export interface CatalogEntity {
  name: string;
  fields: string[];
}

export interface CatalogPulse {
  type: string;
  category: string;
  kind: 'trigger' | 'condition' | 'action';
  label: string;
  description?: string;
  /** The pulse's declared icon name (meta.icon), drawn by PulseIcon on the canvas and in the panel. */
  icon?: string;
  config: Array<Record<string, any>>;
  io?: { inputs: Array<{ key: string; label?: string }>; outputs: Array<{ key: string; label?: string }> };
  /** Fixed outcomes (user task: completed/overdue, wait: timeout, loops: body/done). */
  branches?: string[];
  /** 'cases' when branches come from config.cases[].branch + config.default. */
  dynamicBranches?: 'cases' | null;
  /** A loop head — its body may edge back into it. */
  loop?: boolean;
  /** May carry an outgoing edge labelled 'error'. */
  errorEdge?: boolean;
  /** Triggers: what a run starts with, and where it comes from (a row, a call, a tick, a form). */
  triggerInput?: TriggerInputSpec | null;
}

export interface WorkflowCatalog {
  pulses: CatalogPulse[];
  entities: CatalogEntity[];
  roles: string[];
  conditionOperators: string[];
  conditionOperatorLabels: Record<string, string>;
}

/**
 * The single source for what the designer may offer.
 *
 * Fetched, never bundled: the entity list used to be a literal frozen into two
 * files at build time, so a new model needed a frontend rebuild and the two
 * copies could disagree (G19).
 */
export function useWorkflowCatalog() {
  return useQuery<WorkflowCatalog>({
    queryKey: ['workflow-catalog'],
    queryFn: async () => (await api.get('/api/workflow/meta/catalog')).data,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Adapt a catalogue entry to the shape the pulse configuration modal expects.
 *
 * The catalogue endpoint returns a flat CatalogPulse; the modal (and every field
 * editor it composes) reads a nested PulseManifestEntry. Adapting here keeps the
 * modal untouched, so it stays a verbatim copy of its source.
 */
export function toManifestEntry(p: CatalogPulse): PulseManifestEntry {
  return {
    meta: {
      type: p.type,
      category: p.category,
      label: p.label,
      description: p.description || '',
      async: 'auto',
      hasSideEffects: p.kind === 'action',
      triggerInput: p.triggerInput ?? undefined,
    },
    config: (p.config || []) as PulseManifestEntry['config'],
    io: {
      inputs: (p.io?.inputs || []).map((i) => ({ key: i.key, label: i.label || i.key })),
      outputs: (p.io?.outputs || []).map((o) => ({ key: o.key, label: o.label || o.key })),
    },
  };
}

/** Find a catalogue pulse by its namespaced type, already adapted for the modal. */
export function findManifestEntry(
  pulses: CatalogPulse[] | undefined,
  type: string | undefined,
): PulseManifestEntry | null {
  if (!pulses || !type) return null;
  const hit = pulses.find((p) => p.type === type);
  return hit ? toManifestEntry(hit) : null;
}

/**
 * PG-05 — what else already fires on this entity event.
 *
 * Fan-out is unbounded by design: every matching workflow runs. Making that
 * visible at authoring time is the guardrail — an author adding another workflow
 * to an entity's update event should be able to see the ones already there, and
 * the order they run in.
 */
export function useFanOut(entityName?: string, excludeId?: string, triggerType?: string) {
  return useQuery<{ count: number; workflows: Array<{ id: string; name: string }>; order: string }>({
    queryKey: ['workflow-fan-out', entityName ?? '', excludeId ?? '', triggerType ?? ''],
    queryFn: async () =>
      (
        await api.get('/api/workflow/meta/fan-out', {
          params: { entityName, ...(excludeId ? { excludeId } : {}), ...(triggerType ? { triggerType } : {}) },
        })
      ).data,
    enabled: !!entityName,
    staleTime: 30_000,
  });
}

/** Role names, for the recipient picker (PG-06). */
export function useRoleNames(): string[] {
  const { data } = useWorkflowCatalog();
  return data?.roles ?? [];
}

/** Entity names only — the common case for a target-entity dropdown. */
export function useEntityNames(): string[] {
  const { data } = useWorkflowCatalog();
  return (data?.entities ?? []).map((e) => e.name);
}
