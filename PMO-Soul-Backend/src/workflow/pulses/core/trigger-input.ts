import type { TriggerInputSpec } from './pulse.contract';
import { declaredWorkflowInputs, sampleWorkflowInput, shapeWorkflowInputs } from './workflow-inputs';

/**
 * Trigger input — the ONE place a run's starting data is shaped.
 *
 * Every trigger declares where its input comes from (`meta.triggerInput`). The live entry points
 * (webhook controller, schedule clock), Test flow and the designer's Simulate all call
 * `buildTriggerInput`, so a test is shaped exactly like a real run. The designer used to load a
 * table row for every trigger: right for record triggers, wrong for a webhook (whose body has
 * nothing to do with the table), a schedule or a sign-up — and the mismatch only showed in
 * production, as `{{payload.role}}` coming out empty.
 *
 * What it returns is the TRIGGER DATA (stored as WorkflowRun.triggerData); the runner turns it
 * into variables the same way for every run.
 *
 * Where the sample comes from, best first (designer side, `pulse.controller` trigger-input):
 *   1. the input of this workflow's last REAL run of this trigger;
 *   2. the sample the designer typed (`config._sample`);
 *   3. record triggers only: a real row of the table.
 */

/** A bcrypt-shaped placeholder for secret inputs in TESTS: it satisfies "already hashed" checks
 *  and matches no password, so even a leaked test record could never be signed in to. */
export const TEST_SECRET_PLACEHOLDER = '$2b$10$' + 'TestRunPlaceholderHashMatchesNoPassword'.padEnd(53, '.');

/** The node config key that holds the sample a designer typed. Ignored by the engine at run time. */
export const SAMPLE_KEY = '_sample';

type Bag = Record<string, unknown>;

const asBag = (v: unknown): Bag => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Bag) : {});

/** JSON text (or an already-parsed value) → the value; undefined when it is not JSON. */
export function parseJsonSample(raw: unknown): unknown {
  if (raw !== null && typeof raw === 'object') return raw;
  const text = String(raw ?? '').trim();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export interface BuildTriggerInputOptions {
  /** The trigger type (only record triggers vary by it: an update also carries "before"). */
  type?: string;
  /** A test or a designer simulation: secrets become the placeholder, missing values the examples. */
  test?: boolean;
  now?: Date;
}

/**
 * The trigger data a run of this trigger starts with.
 *
 * @param given what actually arrived (live), or what the designer chose (test). Missing parts
 *              fall back to the designer's typed sample, then to the declaration's examples.
 */
export function buildTriggerInput(
  spec: TriggerInputSpec,
  config: unknown,
  given: unknown,
  opts: BuildTriggerInputOptions = {},
): Bag {
  const cfg = asBag(config);
  const g = asBag(given);
  const sample = asBag(cfg[SAMPLE_KEY]);
  const now = (opts.now ?? new Date()).toISOString();

  switch (spec.source) {
    case 'call': {
      // Exactly what the webhook controller receives. The body is never a table row.
      const payload =
        'payload' in g
          ? g.payload
          : 'payload' in sample
            ? sample.payload
            : parseJsonSample(cfg.sampleBody) ?? {};
      const { secret: _secret, ...query } = asBag(g.query);
      return {
        payload: payload ?? {},
        headers: asBag(g.headers),
        query,
        method: String(g.method ?? cfg.method ?? 'POST').toUpperCase(),
      };
    }
    case 'clock': {
      // A tick: when it fired, by which schedule. No record.
      const firedAt = String(g.firedAt ?? sample.firedAt ?? now);
      return {
        firedAt,
        cron: String(g.cron ?? cfg.cron ?? ''),
        timezone: String(g.timezone ?? (cfg.timezone || 'UTC')),
      };
    }
    case 'form': {
      const form = spec.form;
      if (!form) return {};
      const typed = asBag(g[form.key] ?? sample[form.key]);
      const details: Bag = {};
      for (const f of form.fields) {
        const v = typed[f.key];
        let s = v === undefined || v === null || v === '' ? (opts.test ? f.example : '') : String(v);
        if (f.type === 'email') s = s.trim().toLowerCase();
        details[f.key] = s;
      }
      if (form.stampedAt) details[form.stampedAt] = String(typed[form.stampedAt] ?? now);
      const out: Bag = { [form.key]: details };
      for (const k of spec.secret ?? []) out[k] = opts.test ? TEST_SECRET_PLACEHOLDER : g[k];
      return out;
    }
    case 'workflow': {
      // What the calling step passed, shaped by the declared inputs (undeclared dropped, missing null).
      // A test starts from the typed sample, or an empty value of each declared input.
      const declaration = declaredWorkflowInputs(cfg);
      const raw = 'input' in g ? g.input : 'input' in sample ? sample.input : opts.test ? sampleWorkflowInput(declaration) : {};
      // Lenient here (a designer's sample, a stored run): the strict check is the live call's.
      const shaped = shapeWorkflowInputs(declaration, raw, { convert: true });
      return { input: shaped.ok ? shaped.input : asBag(raw) };
    }
    case 'record':
    default: {
      // The row itself. An update also carries the row as it was and the changed field names; a
      // test has no real change, so "before" is the same row and nothing changed.
      const rec = 'record' in g && g.record && typeof g.record === 'object' ? asBag(g.record) : g;
      if (opts.type !== 'trigger.recordUpdated') return { ...rec };
      return {
        ...rec,
        _previous: g._previous ?? g.previous ?? (opts.test ? rec : undefined),
        _changedFields: g._changedFields ?? g.changedFields ?? (opts.test ? [] : undefined),
      };
    }
  }
}

/**
 * A real run's stored trigger data, made safe to hand to the designer or reuse in a test: secrets
 * replaced, and only the parts the declaration says a run of this trigger has.
 */
export function reuseRealTriggerInput(spec: TriggerInputSpec, config: unknown, data: unknown, type?: string): Bag {
  const raw = asBag(data);
  const given: Bag = { ...raw };
  for (const k of spec.secret ?? []) delete given[k];
  return buildTriggerInput(spec, config, given, { type, test: true });
}

/** The variable names a run of this trigger carries (besides `record`), for the catalogue check. */
export function triggerInputKeys(spec: TriggerInputSpec, type?: string): string[] {
  const data = buildTriggerInput(spec, {}, {}, { type, test: true });
  if (spec.source === 'record') return type === 'trigger.recordUpdated' ? ['record', 'previous', 'changedFields'] : ['record'];
  return Object.keys(data);
}
