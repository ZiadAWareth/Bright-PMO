import type { Pulse, PulseContext, PulseResult } from './pulse.contract';
import { evaluate, resolveDeep, resolveTemplate, missingTemplatePaths, describeMissingPaths } from './expression';

/**
 * The node WRAPPER — the single place cross-cutting concerns live. A Pulse's
 * `execute()` stays pure: no retry, no timeout, no onError handling, no logging of
 * its own, no direct variable mutation. All of that is here.
 *
 *   runPulse(node):
 *     if !condition -> skip
 *     inputs  = resolveTemplates(config) overlaid with inputMap
 *     result  = withTimeout(withRetry(pulse.execute(inputs, ctx)))
 *     on error -> onError policy: fail | continue | (route/incident handled by interpreter)
 *     variables = applyOutputMapping(result.outputs)
 *
 * `idempotencyKey` is accepted here and is the seam where replay-dedup will attach
 * once the Prisma-backed store lands (Wave 4 / migration); side-effecting pulses
 * declare `meta.hasSideEffects` so that enforcement can be made mandatory.
 */
export interface NodeRuntimeConfig {
  condition?: string;
  inputMap?: Record<string, string>;
  outputMap?: Record<string, string>;
  retry?: { max: number; delayMs?: number };
  timeoutMs?: number;
  onError?: 'fail' | 'continue' | 'route' | 'incident';
  idempotencyKey?: string;
}

export interface RunPulseNode {
  id: string;
  /** The pulse's designer config (already split from `_runtime`). */
  config: Record<string, unknown>;
  runtime: NodeRuntimeConfig;
}

export interface RunPulseHooks {
  onStart?: (nodeId: string, inputs: Record<string, unknown>) => void;
  onEnd?: (nodeId: string, result: PulseResult) => void;
  onSkip?: (nodeId: string) => void;
  onError?: (nodeId: string, err: Error) => void;
  /** A Parallel Join got a branch but still waits for others (`arrived` of `needed`). */
  onArrive?: (nodeId: string, arrived: number, needed: number) => void;
}

export interface RunPulseOutcome {
  status: 'completed' | 'skipped' | 'failed';
  result?: PulseResult;
  /** Variables AFTER output mapping (the wrapper owns mutation). */
  variables: Record<string, unknown>;
  error?: Error;
}

/**
 * G7 — every pulse that reaches outside the process carries a bound by DEFAULT.
 * Timeout used to be opt-in per node, so an integration node with no explicit
 * runtime config could hang a workflow indefinitely. A node may still raise or
 * lower its own timeout; it just cannot have none.
 */
const DEFAULT_TIMEOUT_MS = 30_000;

function effectiveTimeout(node: RunPulseNode, pulse: Pulse): number | undefined {
  if (node.runtime?.timeoutMs != null) return node.runtime.timeoutMs;
  const needsBound =
    pulse.meta.hasSideEffects ||
    pulse.meta.category === 'integration' ||
    pulse.meta.category === 'script';
  return needsBound ? DEFAULT_TIMEOUT_MS : undefined;
}

function withTimeout<T>(ms: number | undefined, p: Promise<T>): Promise<T> {
  if (!ms || ms <= 0) return p;
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Pulse timed out after ${ms}ms`)), ms);
  });
  // Clear the timer once either side settles so it never dangles past the node.
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

async function withRetry<T>(retry: NodeRuntimeConfig['retry'], fn: () => Promise<T>): Promise<T> {
  const max = retry?.max ?? 0;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= max; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === max) break;
      // G7 — exponential backoff, capped. A fixed delay hammers a service that is
      // already failing; no delay at all retries instantly and is worse.
      const base = retry?.delayMs ?? 250;
      const wait = Math.min(base * 2 ** attempt, 10_000);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

/** Execute one node inside the wrapper. Returns the outcome + mapped variables;
 *  control signals (branch/wait/error/end) bubble up via `result`. */
/**
 * Write a node's outputs into the run's variables.
 *
 * Exported because a durable pause has a second, later path to the same place: when a User Task
 * is completed, `PulseInterpreter.resume()` has outputs to apply but no `runPulse` call to apply
 * them. Two copies of this rule would mean a node whose `outputMap` is honoured when it runs
 * straight through and ignored when a human completes it.
 */
export function applyOutputMapping(
  node: { runtime: { outputMap?: Record<string, string> } },
  outputs: Record<string, unknown>,
  variables: Record<string, unknown>,
): void {
  if (node.runtime.outputMap && Object.keys(node.runtime.outputMap).length) {
    for (const [outKey, varName] of Object.entries(node.runtime.outputMap)) {
      variables[varName] = outputs[outKey];
    }
  } else {
    Object.assign(variables, outputs);
  }
}

export async function runPulse(
  pulse: Pulse,
  node: RunPulseNode,
  ctx: PulseContext,
  hooks: RunPulseHooks = {},
): Promise<RunPulseOutcome> {
  const variables: Record<string, unknown> = { ...ctx.variables };

  // 1. Guard condition — skip the node (but still traverse its outgoing edges).
  if (node.runtime.condition && !evaluate(node.runtime.condition, variables)) {
    hooks.onSkip?.(node.id);
    return { status: 'skipped', variables };
  }

  // 2. Build inputs: the designer config with {{templates}} resolved — EXCEPT
  //    `expression`-typed fields, which reach the executor RAW so it can evaluate
  //    them against the variables itself (correct truthiness for bare {{field}}).
  const exprKeys = new Set(pulse.config.filter((f) => f.type === 'expression' || f.rawTemplates).map((f) => f.key));
  // A setting of another mode (showWhen — a Wait's record fields while it waits for a date) is left
  // over from before the mode changed: not this step's input, resolved or checked. A test failed
  // on {{record.id}} in a hidden field that the chosen mode never reads.
  const inactive = new Set(
    pulse.config
      .filter((f) => {
        if (!f.showWhen) return false;
        const ctl = pulse.config.find((c) => c.key === f.showWhen!.key);
        return !f.showWhen.is.includes(String(node.config[f.showWhen.key] ?? ctl?.default ?? ''));
      })
      .map((f) => f.key),
  );
  const inputs: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node.config)) {
    if (inactive.has(k)) continue;
    inputs[k] = exprKeys.has(k) ? v : resolveDeep(v, variables);
  }
  if (node.runtime.inputMap) {
    for (const [inKey, src] of Object.entries(node.runtime.inputMap)) {
      inputs[inKey] = resolveTemplate(src, variables);
    }
  }

  hooks.onStart?.(node.id, inputs);

  // In a test, a {{variable}} nothing provides fails the step with a clear message. A live run
  // keeps substituting blank (and logging it), so one bad binding never stops production work.
  if (ctx.isTest) {
    const templated = Object.fromEntries(Object.entries(node.config).filter(([k]) => !exprKeys.has(k) && !inactive.has(k)));
    const missing = missingTemplatePaths([templated, Object.values(node.runtime.inputMap ?? {})], variables);
    if (missing.length) {
      const error = new Error(describeMissingPaths(missing, variables));
      error.name = 'UnknownVariable';
      hooks.onError?.(node.id, error);
      return { status: 'failed', error, variables };
    }
  }

  try {
    const result = await withTimeout(
      effectiveTimeout(node, pulse),
      withRetry(node.runtime.retry, () => pulse.execute(inputs, { ...ctx, variables })),
    );

    // 3. Output mapping: explicit map wins; otherwise merge outputs as-is.
    applyOutputMapping(node, result.outputs ?? {}, variables);

    hooks.onEnd?.(node.id, result);
    return { status: 'completed', result, variables };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    hooks.onError?.(node.id, error);
    // 'continue' swallows the error and proceeds; 'route'/'incident' surface as
    // failed and the interpreter decides where to go; 'fail' (default) stops.
    if ((node.runtime.onError ?? 'fail') === 'continue') {
      return { status: 'completed', result: {}, variables };
    }
    return { status: 'failed', error, variables };
  }
}
