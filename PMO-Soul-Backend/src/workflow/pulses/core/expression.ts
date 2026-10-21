/**
 * Minimal, dependency-free expression + template helpers for the Pulses engine.
 *
 * Intentionally small and PLUGGABLE — the Wave 1 "expression language" decision
 * can swap this out without touching pulses or the interpreter. No `eval`, no code
 * execution: only variable-path lookup, {{template}} interpolation, and boolean
 * conditions built from `<operand> <op> <operand>` comparisons joined with
 * `&&` / `||` (`and` / `or`), negated with `!` / `not`, grouped with parentheses.
 */

/** Resolve a dotted path (e.g. `opportunity.id`) against a variables object. */
export function getPath(vars: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, vars);
}

/** Replace {{path}} tokens in a string with variable values. If the whole string
 *  is a single {{path}}, returns the raw (typed) value; otherwise interpolates. */
/**
 * Where unresolved template variables are reported (G4).
 *
 * An unresolvable {{binding}} silently became an empty string: emails addressed
 * to "", records created with an empty name, conditions comparing "" and taking
 * the wrong branch — with no error, no warning and no log, so the fault was
 * undiagnosable in production. Substitution still happens (one bad binding must
 * not abort a run), but it is now reported with the keys that WERE available.
 *
 * The host injects a logger; the console fallback means nothing is ever lost.
 */
let templateWarn: (message: string) => void = (message) =>
  console.warn(`[workflow] ${message}`);

export function setTemplateWarningSink(fn: (message: string) => void): void {
  templateWarn = fn;
}

function reportUnresolved(path: string, vars: Record<string, unknown>): void {
  const available = Object.keys(vars ?? {})
    .filter((k) => !k.startsWith('$'))
    .join(', ');
  templateWarn(
    `Template variable "{{${path}}}" did not resolve — substituting an empty string. ` +
      `Available keys: ${available || '(none)'}`,
  );
}

export function resolveTemplate(tpl: string, vars: Record<string, unknown>): unknown {
  // A field holding ONE pill — the designer's chip field pads it with a space each side — is that
  // value, typed (the number 30, not the text " 30 "): an id must still be a number.
  const whole = /^\s*\{\{\s*([\w.]+)\s*\}\}\s*$/.exec(tpl);
  if (whole) {
    const v = getPath(vars, whole[1]);
    // A whole-template binding returns the raw value, so undefined is a real
    // miss rather than an empty substitution — still worth reporting.
    if (v === undefined || v === null) reportUnresolved(whole[1], vars);
    return v;
  }
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, p: string) => {
    const v = getPath(vars, p);
    if (v === undefined || v === null) {
      reportUnresolved(p, vars);
      return '';
    }
    return String(v);
  });
}

/**
 * The {{paths}} in a config value that name NOTHING in `vars` — absent, not merely empty (a field
 * that exists with a null value is a real value). A test run fails the step on these, so a typo or a
 * variable no earlier step provides is caught in the designer instead of becoming blank text live.
 */
export function missingTemplatePaths(value: unknown, vars: Record<string, unknown>): string[] {
  const out = new Set<string>();
  const walk = (v: unknown): void => {
    if (typeof v === 'string') {
      for (const m of v.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) if (getPath(vars, m[1]) === undefined) out.add(m[1]);
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v as Record<string, unknown>).forEach(walk);
  };
  walk(value);
  return [...out];
}

/** Explains missing template paths in words a designer can act on. */
export function describeMissingPaths(paths: string[], vars: Record<string, unknown>): string {
  const parts = paths.map((p) => {
    const segs = p.split('.');
    // Name the deepest part that DOES exist, so "record has no field x" reads differently from
    // "nothing provides previous".
    for (let i = segs.length - 1; i > 0; i--) {
      const parent = segs.slice(0, i).join('.');
      const pv = getPath(vars, parent);
      if (pv && typeof pv === 'object') return `{{${p}}}: "${parent}" has no "${segs[i]}"`;
    }
    return `{{${p}}}: no trigger or earlier step provides "${segs[0]}"`;
  });
  return `Unknown variable${paths.length === 1 ? '' : 's'} — ${parts.join('; ')}. In a live run ${paths.length === 1 ? 'it' : 'they'} would be left blank.`;
}

/** Deep-resolve {{...}} templates inside a config object's string values. */
export function resolveDeep<T>(value: T, vars: Record<string, unknown>): T {
  if (typeof value === 'string') return resolveTemplate(value, vars) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => resolveDeep(v, vars)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = resolveDeep(v, vars);
    return out as unknown as T;
  }
  return value;
}

// ── Comparison semantics ──────────────────────────────────────────────────────
//
// Workflow variables arrive as whatever the record, the form or the template gave
// them: `"250000"` from a text input, `250000` from the database, `"2026-09-22"`
// from a date picker. Loose JS comparison made `"250000" > 100000` lexical (false)
// and `"9" == 9` an accident of coercion. The rules below are the ones a designer
// expects when reading the condition aloud:
//   - both sides numeric        → compare as numbers
//   - both sides ISO dates      → compare as timestamps (ordering ops only)
//   - null/undefined            → equal to `null`, unequal to everything else,
//                                 never greater or smaller than anything
//   - otherwise                 → compare as trimmed strings

const NUMERIC = /^-?\d+(\.\d+)?$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

const isNil = (v: unknown): boolean => v === null || v === undefined;

function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string' && v.trim() !== '' && NUMERIC.test(v.trim())) return Number(v);
  return undefined;
}

function asTime(v: unknown): number | undefined {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : v.getTime();
  if (typeof v === 'string' && ISO_DATE.test(v.trim())) {
    const t = Date.parse(v.trim());
    return Number.isNaN(t) ? undefined : t;
  }
  return undefined;
}

/** `==` semantics: numeric when both sides are numbers, else trimmed-string equality. */
export function looseEquals(a: unknown, b: unknown): boolean {
  if (isNil(a) || isNil(b)) return isNil(a) && isNil(b);
  const na = asNumber(a);
  const nb = asNumber(b);
  if (na !== undefined && nb !== undefined) return na === nb;
  if (typeof a === 'boolean' || typeof b === 'boolean') return String(a) === String(b);
  return String(a).trim() === String(b).trim();
}

/**
 * Ordering: -1 / 0 / 1, or `undefined` when either side is null/undefined (no
 * ordering op is true against a missing value). Numbers, then ISO dates, then
 * lexical — the same rules the trigger rule evaluator uses for gt/lt.
 */
export function compareOrder(a: unknown, b: unknown): number | undefined {
  if (isNil(a) || isNil(b)) return undefined;
  const na = asNumber(a);
  const nb = asNumber(b);
  if (na !== undefined && nb !== undefined) return na === nb ? 0 : na < nb ? -1 : 1;
  const ta = asTime(a);
  const tb = asTime(b);
  if (ta !== undefined && tb !== undefined) return ta === tb ? 0 : ta < tb ? -1 : 1;
  const sa = String(a).trim();
  const sb = String(b).trim();
  return sa === sb ? 0 : sa < sb ? -1 : 1;
}

const ordered = (test: (c: number) => boolean) => (a: unknown, b: unknown): boolean => {
  const c = compareOrder(a, b);
  return c === undefined ? false : test(c);
};

const OPS: Record<string, (a: unknown, b: unknown) => boolean> = {
  '==': looseEquals,
  '!=': (a, b) => !looseEquals(a, b),
  '===': (a, b) => a === b,
  '!==': (a, b) => a !== b,
  '>': ordered((c) => c > 0),
  '>=': ordered((c) => c >= 0),
  '<': ordered((c) => c < 0),
  '<=': ordered((c) => c <= 0),
};

// ── Boolean grammar ───────────────────────────────────────────────────────────
//
//   expr    := and ( ('||' | 'or') and )*          lowest precedence
//   and     := unary ( ('&&' | 'and') unary )*
//   unary   := ('!' | 'not') unary | '(' expr ')' | leaf
//   leaf    := {{var}} | true | false | <operand> <op> <operand>
//
// Evaluation is left to right with short-circuit. The word forms are case-
// insensitive and must stand alone between spaces; an unquoted string operand
// containing the words "and"/"or" must be quoted (`{{colour}} == 'black and white'`).
// Operands keep today's leniency (templates, numbers, quoted strings, bare paths),
// which is why this is a top-level splitter rather than a full tokenizer: a leaf
// is handed to the same single-comparison parser it always was.

type Splitter = { symbol: string; word: string };
const OR: Splitter = { symbol: '||', word: 'or' };
const AND: Splitter = { symbol: '&&', word: 'and' };

/** Split `src` on a connective, ignoring anything inside quotes, parentheses or {{ }}. */
function splitTopLevel(src: string, on: Splitter): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let braces = 0;
  let start = 0;
  const lower = src.toLowerCase();
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') { quote = ch; continue; }
    if (ch === '{' && src[i + 1] === '{') { braces++; i++; continue; }
    if (ch === '}' && src[i + 1] === '}' && braces > 0) { braces--; i++; continue; }
    if (braces > 0) continue;
    if (ch === '(') { depth++; continue; }
    if (ch === ')') { depth--; continue; }
    if (depth !== 0) continue;
    if (src.startsWith(on.symbol, i)) {
      parts.push(src.slice(start, i));
      i += on.symbol.length - 1;
      start = i + 1;
      continue;
    }
    const w = on.word;
    if (
      lower.startsWith(w, i) &&
      (i === 0 || /\s/.test(src[i - 1])) &&
      /\s/.test(src[i + w.length] ?? '')
    ) {
      parts.push(src.slice(start, i));
      i += w.length - 1;
      start = i + 1;
    }
  }
  parts.push(src.slice(start));
  return parts;
}

/** True when `src` is one balanced `( ... )` group, so the wrapper can be peeled. */
function isWrapped(src: string): boolean {
  if (!src.startsWith('(') || !src.endsWith(')')) return false;
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quote) { if (ch === quote) quote = null; continue; }
    if (ch === "'" || ch === '"') { quote = ch; continue; }
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0 && i < src.length - 1) return false;
    }
  }
  return depth === 0;
}

function checkBalanced(src: string): void {
  let depth = 0;
  let quote: string | null = null;
  for (const ch of src) {
    if (quote) { if (ch === quote) quote = null; continue; }
    if (ch === "'" || ch === '"') { quote = ch; continue; }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth < 0) break;
  }
  if (depth !== 0) throw new Error(`Invalid condition "${src}": unbalanced parentheses.`);
}

/** Evaluate a boolean expression against the run variables.
 *
 *  Supports `&&`/`||` (or `and`/`or`), `!`/`not`, parentheses, a single
 *  `<operand> <op> <operand>` comparison, a bare {{path}} (truthiness), and a raw
 *  boolean. Empty/undefined → true (no gate). Malformed → throws (G1). */
export function evaluate(expr: string | boolean | undefined, vars: Record<string, unknown>): boolean {
  if (expr === undefined || expr === '') return true;
  if (typeof expr === 'boolean') return expr;
  const trimmed = expr.trim();
  if (trimmed === '') return true;
  checkBalanced(trimmed);
  return evalOr(trimmed, trimmed, vars);
}

function evalOr(src: string, whole: string, vars: Record<string, unknown>): boolean {
  const parts = splitTopLevel(src, OR);
  if (parts.length === 1) return evalAnd(src, whole, vars);
  // Validate every operand BEFORE evaluating: a short-circuit must not hide a malformed tail.
  const operands = parts.map((part) => requireOperand(part, whole, OR));
  for (const operand of operands) if (evalAnd(operand, whole, vars)) return true;
  return false;
}

function evalAnd(src: string, whole: string, vars: Record<string, unknown>): boolean {
  const parts = splitTopLevel(src, AND);
  if (parts.length === 1) return evalUnary(src.trim(), whole, vars);
  const operands = parts.map((part) => requireOperand(part, whole, AND));
  for (const operand of operands) if (!evalUnary(operand, whole, vars)) return false;
  return true;
}

function requireOperand(part: string, whole: string, on: Splitter): string {
  const t = part.trim();
  if (t === '') {
    throw new Error(`Invalid condition "${whole}": expected an expression on both sides of "${on.symbol}".`);
  }
  return t;
}

function evalUnary(src: string, whole: string, vars: Record<string, unknown>): boolean {
  if (src.startsWith('!') && src[1] !== '=') return !evalUnary(src.slice(1).trim(), whole, vars);
  const notWord = /^not\s+/i.exec(src);
  if (notWord) return !evalUnary(src.slice(notWord[0].length).trim(), whole, vars);
  if (isWrapped(src)) return evalOr(src.slice(1, -1).trim(), whole, vars);
  return evalLeaf(src, whole, vars);
}

function evalLeaf(trimmed: string, whole: string, vars: Record<string, unknown>): boolean {
  if (trimmed === '') throw new Error(`Invalid condition "${whole}": empty expression.`);
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  const bare = /^\{\{\s*([\w.]+)\s*\}\}$/.exec(trimmed);
  if (bare) return Boolean(getPath(vars, bare[1]));

  const m = /^(.+?)\s*(===|!==|==|!=|>=|<=|>|<)\s*(.+)$/.exec(trimmed);
  if (m) {
    const [, lRaw, op, rRaw] = m;
    return OPS[op](resolveOperand(lRaw.trim(), vars), resolveOperand(rRaw.trim(), vars));
  }

  // G1 — an expression that parses as neither a bare {{var}} nor a comparison is
  // a MISCONFIGURATION, not a truthy string. Coercing it silently made
  // "status contains web" evaluate to true and take the wrong branch with no
  // error, no warning and no log. Named operators (contains/startsWith/in/...)
  // are the common mistake, so say so explicitly.
  const named = /^\s*\S+\s+(eq|neq|contains|startsWith|endsWith|in|notIn|isNull|isNotNull|gt|gte|lt|lte)\s+/i.exec(trimmed);
  if (named) {
    throw new Error(
      `Invalid condition "${trimmed}": "${named[1]}" is not an expression operator. ` +
        `Use a comparison instead, e.g. {{status}} == 'ACTIVE'.`,
    );
  }
  throw new Error(
    `Invalid condition "${trimmed}": expected {{variable}} or a comparison ` +
      `(==, !=, ===, !==, >, >=, <, <=), optionally combined with && / || and parentheses.`,
  );
}

function resolveOperand(raw: string, vars: Record<string, unknown>): unknown {
  const tpl = /^\{\{\s*([\w.]+)\s*\}\}$/.exec(raw);
  if (tpl) return getPath(vars, tpl[1]);
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null') return null;
  const q = /^["'](.*)["']$/.exec(raw);
  if (q) return q[1];
  const v = getPath(vars, raw);
  return v !== undefined ? v : raw;
}
