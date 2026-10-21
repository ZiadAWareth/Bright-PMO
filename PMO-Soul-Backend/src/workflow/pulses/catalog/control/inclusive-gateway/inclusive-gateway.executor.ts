import { evaluate, type PulseExecutor } from '../../../core';

interface OrCase {
  when?: string;
  branch?: string;
}

/**
 * Activates EVERY branch whose condition is true (via `branches[]`), so several
 * paths can run. When nothing matches, takes the optional default. `cases` reaches this
 * executor RAW (rawTemplates) and each `when` is evaluated against the run variables here —
 * see the exclusive gateway for why substituting first broke missing and multi-word values.
 *
 * Note: reconverging an inclusive split needs an inclusive join that knows how
 * many branches fired — deferred. For now, let OR branches end independently or
 * merge at a plain node, not a strict AND join (which would wait forever).
 */
export const execute: PulseExecutor = async (inputs, ctx) => {
  const cases: OrCase[] = Array.isArray(inputs.cases) ? (inputs.cases as OrCase[]) : [];
  const vars = (ctx && ctx.variables) || {};
  const branches = cases.filter((c) => c && evaluate(String(c.when ?? ''), vars)).map((c) => String(c.branch ?? ''));
  if (branches.length) return { branches };
  if (inputs.default != null && inputs.default !== '') return { branches: [String(inputs.default)] };
  return { branches: [] };
};
