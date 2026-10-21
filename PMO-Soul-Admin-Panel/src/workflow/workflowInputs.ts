/**
 * The designer's reading of a "When Called by Another Workflow" trigger's declared inputs — the
 * same rules as the engine's core/workflow-inputs.ts (one list of typed inputs), used to
 * show a Call Workflow step one box per input and to start a test sample. The engine checks again
 * when the call really happens.
 */

export const CALLED_BY_WORKFLOW = 'trigger.calledByWorkflow';
export const WORKFLOW_INPUT_TYPES = ['any', 'string', 'number', 'boolean', 'array', 'object'] as const;
export type WorkflowInputType = (typeof WORKFLOW_INPUT_TYPES)[number];
export type WorkflowInputMode = 'fields' | 'any';

export interface WorkflowInputField {
  name: string;
  type: WorkflowInputType;
}

type Bag = Record<string, unknown>;
const asBag = (v: unknown): Bag => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Bag) : {});

export function typeOfValue(value: unknown): WorkflowInputType {
  if (value === null || value === undefined) return 'any';
  if (Array.isArray(value)) return 'array';
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') return t;
  return t === 'object' ? 'object' : 'any';
}

function parseJson(raw: unknown): unknown {
  if (raw !== null && typeof raw === 'object') return raw;
  const text = String(raw ?? '').trim();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function declaredWorkflowInputs(config: unknown): { mode: WorkflowInputMode; fields: WorkflowInputField[] } {
  const cfg = asBag(config);
  const mode: WorkflowInputMode = 'fields';
  const seen = new Set<string>();
  const fields: WorkflowInputField[] = [];
  const add = (name: unknown, type: unknown) => {
    const n = String(name ?? '').trim();
    if (!n || seen.has(n)) return;
    seen.add(n);
    const t = String(type ?? 'any') as WorkflowInputType;
    fields.push({ name: n, type: (WORKFLOW_INPUT_TYPES as readonly string[]).includes(t) ? t : 'any' });
  };
  for (const row of Array.isArray(cfg.inputs) ? cfg.inputs : []) add(asBag(row).name, asBag(row).type);
  return { mode, fields };
}

/** An empty value of each declared input — where a test sample starts. */
export function sampleWorkflowInput(fields: WorkflowInputField[]): Bag {
  const empty: Record<WorkflowInputType, unknown> = { any: null, string: '', number: 0, boolean: false, array: [], object: {} };
  const out: Bag = {};
  for (const f of fields) out[f.name] = empty[f.type];
  return out;
}

/**
 * What a typed box holds, as the input's type: "5" for a number input is 5, "true" for a boolean is
 * true, JSON text for a list or object is that list or object. A {{template}} stays text — the
 * engine fills it in with the value's own type when the step runs.
 */
export function typedEntry(text: string, type: WorkflowInputType): unknown {
  const t = text.trim();
  if (t === '' || /\{\{[\s\S]*\}\}/.test(t)) return text === '' ? undefined : text;
  if (type === 'number' && /^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if (type === 'boolean' && (t === 'true' || t === 'false')) return t === 'true';
  if ((type === 'array' || type === 'object') && typeOfValue(parseJson(t)) === type) return parseJson(t);
  return text;
}

/** The trigger a workflow's definition starts with. */
export function triggerOf(definition: unknown): { type?: string; config?: unknown } | undefined {
  const nodes = (asBag(definition).nodes as unknown[]) ?? [];
  return (Array.isArray(nodes) ? nodes : []).map(asBag).find((n) => String(n.type ?? '').startsWith('trigger.')) as
    | { type?: string; config?: unknown }
    | undefined;
}
