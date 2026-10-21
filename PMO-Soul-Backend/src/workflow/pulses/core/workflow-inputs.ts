/**
 * What a workflow called by another one accepts — the "When Called by Another Workflow" trigger's
 * declared inputs (n8n's "When Executed by Another Workflow", fields mode): named inputs, each with
 * a type (any, string, number, boolean, array, object). The designer edits them as rows or as a
 * JSON example; both are the same list.
 *
 * The called workflow receives exactly those inputs: anything else the caller passes is dropped,
 * and an input it does not pass arrives as null. A value of the wrong
 * type is refused — unless the calling step turned on "Attempt to convert types", which turns
 * "42" into 42, "true" into true and JSON text into an array or object where it can.
 *
 * Pure (no Nest, no Prisma) so the run, the test and the designer all shape input the same way.
 */

export const WORKFLOW_INPUT_TYPES = ['any', 'string', 'number', 'boolean', 'array', 'object'] as const;
export type WorkflowInputType = (typeof WORKFLOW_INPUT_TYPES)[number];
/** Kept for the older "accept all data" shape a workflow may still be read with. */
export type WorkflowInputMode = 'fields' | 'any';

export interface WorkflowInputField {
  name: string;
  type: WorkflowInputType;
}

export interface WorkflowInputDeclaration {
  mode: WorkflowInputMode;
  /** The inputs, in order. Empty for `any`. */
  fields: WorkflowInputField[];
}

type Bag = Record<string, unknown>;
const asBag = (v: unknown): Bag => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Bag) : {});

/** The type a value has, in the declaration's terms. null/undefined count as "any". */
export function typeOfValue(value: unknown): WorkflowInputType {
  if (value === null || value === undefined) return 'any';
  if (Array.isArray(value)) return 'array';
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') return t;
  if (t === 'object') return 'object';
  return 'any';
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

/** The trigger's settings as a declaration. Unnamed and repeated inputs are dropped. */
export function declaredWorkflowInputs(config: unknown): WorkflowInputDeclaration {
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

const ARTICLE: Record<WorkflowInputType, string> = {
  any: 'any value',
  string: 'a text value',
  number: 'a number',
  boolean: 'true or false',
  array: 'a list',
  object: 'an object',
};

function describe(value: unknown): string {
  const t = typeOfValue(value);
  if (t === 'string') return '"' + String(value).slice(0, 40) + '"';
  if (t === 'array') return 'a list';
  if (t === 'object') return 'an object';
  return String(value);
}

/** "Attempt to convert types": the value as `type`, or undefined when it cannot be. */
export function convertValue(value: unknown, type: WorkflowInputType): unknown {
  if (type === 'any' || typeOfValue(value) === type) return value;
  switch (type) {
    case 'string':
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    case 'number': {
      if (typeof value === 'boolean') return value ? 1 : 0;
      const text = String(value).trim();
      if (!text) return undefined;
      const n = Number(text);
      return Number.isFinite(n) ? n : undefined;
    }
    case 'boolean': {
      if (typeof value === 'number') return value === 1 ? true : value === 0 ? false : undefined;
      const text = String(value).trim().toLowerCase();
      return text === 'true' || text === '1' ? true : text === 'false' || text === '0' ? false : undefined;
    }
    case 'array':
    case 'object': {
      const parsed = typeof value === 'string' ? parseJson(value) : undefined;
      return typeOfValue(parsed) === type ? parsed : undefined;
    }
    default:
      return undefined;
  }
}

export type ShapedWorkflowInput = { ok: true; input: Bag } | { ok: false; message: string };

/**
 * What the called workflow receives, from what the calling step passed. Declared inputs only (null
 * when not passed); every value of its declared type, converted when asked, refused otherwise.
 */
export function shapeWorkflowInputs(
  declaration: WorkflowInputDeclaration,
  passed: unknown,
  opts: { convert?: boolean } = {},
): ShapedWorkflowInput {
  const given = asBag(passed);
  if (declaration.mode === 'any') {
    const input: Bag = {};
    for (const [k, v] of Object.entries(given)) if (!k.startsWith('$')) input[k] = v;
    return { ok: true, input };
  }
  const input: Bag = {};
  for (const field of declaration.fields) {
    const raw = given[field.name];
    if (raw === undefined || raw === null) {
      input[field.name] = null;
      continue;
    }
    if (field.type === 'any' || typeOfValue(raw) === field.type) {
      input[field.name] = raw;
      continue;
    }
    const converted = opts.convert ? convertValue(raw, field.type) : undefined;
    if (converted === undefined) {
      return {
        ok: false,
        message:
          'Input "' + field.name + '" expects ' + ARTICLE[field.type] + ' but got ' + describe(raw) + '. ' +
          (opts.convert
            ? 'It cannot be converted.'
            : 'Send ' + ARTICLE[field.type] + ', or turn on "Attempt to convert types" on the calling step.'),
      };
    }
    input[field.name] = converted;
  }
  return { ok: true, input };
}

/** A starting sample for a test: each declared input with an empty value of its type. */
export function sampleWorkflowInput(declaration: WorkflowInputDeclaration): Bag {
  const empty: Record<WorkflowInputType, unknown> = { any: null, string: '', number: 0, boolean: false, array: [], object: {} };
  const out: Bag = {};
  for (const f of declaration.fields) out[f.name] = empty[f.type];
  return out;
}
