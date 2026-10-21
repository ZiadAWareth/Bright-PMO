/** A previous step whose (raw) output can be mapped from. */
export interface DataStep {
  nodeId: string;
  label: string;
  output: unknown;
}

// `availableDataSteps` and its `upstreamIds` helper lived here and were removed: they were an
// earlier, narrower design that only ever offered a node its UPSTREAM steps. The modeler now
// builds `DataStep[]` inline (WorkflowModelerPage `modalSteps`) and deliberately offers every
// OTHER node that has a captured output, n8n-style. Nothing called them in the generator, in a
// freshly generated app, or in either deployed sandbox.
//
// They also carried a latent build failure: the import `PulseTestStep from './workflowService'`
// named a type that workflowService has never exported. Deployed apps run `vite dev`, which uses
// esbuild and strips `import type` without checking it, so nothing complained — but the generated
// `package.json` build script is `tsc --noEmit && vite build`, so the first production build of
// any generated app would have failed on it.

/** Resolve a dotted path against an object. */
export function resolvePath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (acc, k) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[k] : undefined),
    obj,
  );
}

/** Replace {{path}} tokens in a string with resolved values (for previews). */
export function interpolate(tpl: string, vars: Record<string, unknown>): string {
  return (tpl ?? '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, p: string) => {
    const v = resolvePath(vars, p);
    return v == null ? '' : String(v);
  });
}

/** The label of the step whose output produced this path (for a token pill). */
export function sourceLabelFor(path: string, steps: DataStep[]): string | undefined {
  for (const s of steps) if (resolvePath(s.output, path) !== undefined) return s.label;
  return undefined;
}

/** A short, human preview of a sample value. */
export function previewValue(v: unknown): string {
  if (v === null || v === undefined) return String(v);
  if (typeof v === 'object') return Array.isArray(v) ? `[${v.length}]` : '{…}';
  const s = String(v);
  return s.length > 40 ? s.slice(0, 39) + '…' : s;
}

/** Does this value (or any descendant path) match the search term? */
export function subtreeMatches(value: unknown, path: string, term: string): boolean {
  if (!term) return true;
  if (path.toLowerCase().includes(term)) return true;
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(([k, v]) =>
      subtreeMatches(v, path ? `${path}.${k}` : k, term),
    );
  }
  return false;
}
