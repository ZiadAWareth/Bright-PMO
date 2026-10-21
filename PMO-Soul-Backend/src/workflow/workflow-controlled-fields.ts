/** The pulse that moves a record between states; its stateField is the field the workflow owns. */
export const TRANSITION_STATE_TYPE = 'data.transitionState';

/** entity (lower-case) -> field -> the workflow that sets it. */
export type ControlledMap = Record<string, Record<string, string>>;

export interface WorkflowRowLike {
  name?: string | null;
  status?: string | null;
  entityName?: string | null;
  definition?: any;
}

/** Every (entity, field) an ACTIVE workflow sets through a transition-state step. */
export function controlledFields(rows: readonly WorkflowRowLike[]): ControlledMap {
  const out: ControlledMap = {};
  for (const row of rows || []) {
    if (String(row?.status ?? '').toUpperCase() !== 'ACTIVE') continue;
    const nodes: any[] = Array.isArray(row?.definition?.nodes) ? row.definition.nodes : [];
    for (const n of nodes) {
      if (n?.type !== TRANSITION_STATE_TYPE) continue;
      const entity = String(n?.config?.entity || row?.entityName || '').toLowerCase();
      const field = String(n?.config?.stateField || 'status');
      if (!entity) continue;
      (out[entity] ??= {})[field] ??= String(row?.name || 'a workflow');
    }
  }
  return out;
}

/** The controlled fields this request tries to write (a key present with a value). */
export function controlledWrites(map: ControlledMap, entity: string, dto: any): Array<{ field: string; workflow: string }> {
  const owned = map[String(entity).toLowerCase()] || {};
  return Object.keys(dto || {})
    .filter((k) => dto[k] !== undefined && owned[k])
    .map((k) => ({ field: k, workflow: owned[k] }));
}

export function refusalMessage(hits: Array<{ field: string; workflow: string }>): string {
  return hits.map((h) => h.field + ' is set by the workflow "' + h.workflow + '"').join('; ')
    + ', so it cannot be changed here. Leave it out, and the workflow will set it.';
}

// Read on every create / update, so cached briefly: a workflow activated or changed takes effect
// within TTL_MS, without a restart.
const TTL_MS = 15000;
let cached: { at: number; map: ControlledMap } | null = null;

export async function loadControlledFields(prisma: any): Promise<ControlledMap> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.map;
  const rows = await prisma.workflow.findMany({
    where: { status: 'ACTIVE' as any },
    select: { name: true, status: true, entityName: true, definition: true },
  });
  cached = { at: Date.now(), map: controlledFields(rows) };
  return cached.map;
}

/** For tests and for a workflow save that must take effect at once. */
export function forgetControlledFields(): void {
  cached = null;
}
