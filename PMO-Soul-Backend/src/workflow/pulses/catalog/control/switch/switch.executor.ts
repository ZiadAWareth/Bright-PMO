import { resolveTemplate, type PulseExecutor } from '../../../core';

interface SwitchCase {
  equals?: unknown;
  branch?: string;
}

/** Emits the branch of the first case whose value matches; else the default. The
 *  `value` is an expression field (raw), so resolve it against the variables here. */
export const execute: PulseExecutor = async (inputs, ctx) => {
  const value = resolveTemplate(String(inputs.value ?? ''), ctx.variables as Record<string, unknown>);
  const cases: SwitchCase[] = Array.isArray(inputs.cases) ? (inputs.cases as SwitchCase[]) : [];
  for (const c of cases) {
    if (c && String(c.equals) === String(value)) return { branch: String(c.branch ?? '') };
  }
  return { branch: String(inputs.default ?? 'default') };
};
