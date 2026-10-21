import { evaluate, type PulseExecutor } from '../../../core';

interface GatewayCase {
  when?: string;
  branch?: string;
}

/**
 * Evaluates each case's condition in declared order and emits the first true
 * branch; if none match, emits the mandatory default branch.
 *
 * `cases` reaches this executor RAW (rawTemplates) and each `when` is evaluated against the
 * run variables here. It used to be substituted by the wrapper and then evaluated against an
 * empty scope: a variable with no value (the checker's decision in a test run, where the task
 * completes with an empty form) became `== 'approve'`, which no parser accepts, and the run
 * failed instead of taking the default branch. A malformed expression is still a
 * misconfiguration and still throws (G1).
 */
export const execute: PulseExecutor = async (inputs, ctx) => {
  const cases: GatewayCase[] = Array.isArray(inputs.cases) ? (inputs.cases as GatewayCase[]) : [];
  const vars = (ctx && ctx.variables) || {};
  for (const c of cases) {
    if (c && evaluate(String(c.when ?? ''), vars)) {
      return { branch: String(c.branch ?? '') };
    }
  }
  return { branch: String(inputs.default ?? 'default') };
};
