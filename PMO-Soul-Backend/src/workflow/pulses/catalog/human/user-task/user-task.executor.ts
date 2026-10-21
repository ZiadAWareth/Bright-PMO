import type { PulseExecutor } from '../../../core';

/**
 * Assigns work to a person and pauses until they complete it.
 *
 * The `human` category previously contained only Request Approval, so any process
 * needing "someone does a thing, then the flow continues" — data entry, review,
 * triage, fulfilment — could only be modelled as approve/reject. That distorts
 * the process and loses whatever the person actually produced.
 *
 * Emits a durable `wait`, so the run survives a restart: the interpreter records
 * the pause, and the task-completion endpoint resumes it down the `completed`
 * branch (or `overdue`, when a deadline passes and escalation is configured).
 */
export const execute: PulseExecutor = async (inputs, ctx) => {
  const title = String(inputs.title ?? '').trim();
  const assignee = inputs.assignee;

  if (!title) {
    return { error: { name: 'MissingTitle', message: 'User Task requires a title.' } };
  }
  if (assignee == null || String(assignee).trim() === '') {
    // An unassigned task is invisible work that nobody is asked to do.
    return { error: { name: 'MissingAssignee', message: 'User Task requires an assignee.' } };
  }

  // A test run must not park waiting for a human, or "Test flow" never returns. The Test dialog
  // may supply the answer this person would have given (`$testAnswers[nodeId]`), so a gateway
  // reading the decision walks the real path instead of the default one.
  if (ctx.isTest) {
    return {
      branch: 'completed',
      outputs: { completedBy: 'test-user', formData: { ...sampleFormData(inputs.form), ...testAnswerFor(ctx) } },
    };
  }

  const dueInHours = Number(inputs.dueInHours);
  return {
    wait: {
      kind: 'task',
      config: {
        title,
        instructions: inputs.instructions ?? '',
        assignee,
        form: inputs.form ?? null,
        dueAt:
          Number.isFinite(dueInHours) && dueInHours > 0
            ? new Date(Date.now() + dueInHours * 3_600_000).toISOString()
            : null,
        onOverdue: inputs.onOverdue ?? 'continue',
      },
    },
  };
};

/**
 * A test answer for every field the task's form asks for: its first option, its default, or a
 * placeholder. The steps after a task read these ({{formData.decision}}); an empty form made each
 * of them an unknown variable in a test, while a real completion always fills them in.
 */
export function sampleFormData(form: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of Array.isArray(form) ? form : []) {
    const key = f && typeof f === 'object' ? String((f as any).key ?? (f as any).name ?? '').trim() : '';
    if (!key) continue;
    const opts = Array.isArray((f as any).options) ? (f as any).options : [];
    const first = opts[0] && typeof opts[0] === 'object' ? (opts[0] as any).value : opts[0];
    const type = String((f as any).type ?? '').toLowerCase();
    out[key] = (f as any).default ?? first ?? (type === 'number' ? 0 : type === 'boolean' ? false : `(test ${key})`);
  }
  return out;
}

/** The form values the Test dialog supplied for this node, or an empty form. */
export function testAnswerFor(ctx: { variables: Readonly<Record<string, unknown>>; nodeId?: string }): Record<string, unknown> {
  const answers = ctx.variables.$testAnswers;
  if (!ctx.nodeId || !answers || typeof answers !== 'object') return {};
  const mine = (answers as Record<string, unknown>)[ctx.nodeId];
  return mine && typeof mine === 'object' && !Array.isArray(mine) ? { ...(mine as Record<string, unknown>) } : {};
}
