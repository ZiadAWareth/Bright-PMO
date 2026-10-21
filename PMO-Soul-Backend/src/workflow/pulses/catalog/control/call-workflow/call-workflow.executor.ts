import type { PulseExecutor } from '../../../core';

/** How deep sub-workflow calls may nest before the engine refuses. */
export const MAX_WORKFLOW_DEPTH = 5;

/**
 * Runs another workflow as a step of this one.
 *
 * Without this, shared logic — "notify the owner and log an audit entry", say —
 * has to be copied into every workflow that needs it, and every later change has
 * to be repeated in each copy. This is the composition primitive that keeps a
 * growing set of processes maintainable.
 *
 * Recursion is bounded: a workflow that calls itself (directly or in a cycle)
 * would otherwise run until the interpreter's step cap and fail with something
 * unhelpful. The depth is carried in the run's variables under a reserved key,
 * so it survives the nested call.
 */
export const execute: PulseExecutor = async (inputs, ctx) => {
  if (!ctx.services.runWorkflow) {
    return { error: { name: 'SubWorkflowUnavailable', message: 'This app cannot run sub-workflows.' } };
  }

  const workflowName = String(inputs.workflowName ?? '').trim();
  if (!workflowName) {
    return { error: { name: 'MissingWorkflow', message: 'Call Workflow requires a workflow name.' } };
  }

  const depth = Number((ctx.variables as any)?.$workflowDepth ?? 0);
  if (depth >= MAX_WORKFLOW_DEPTH) {
    return {
      error: {
        name: 'WorkflowRecursionLimit',
        message:
          `Sub-workflow nesting reached ${MAX_WORKFLOW_DEPTH}. ` +
          `"${workflowName}" was not run — check for a workflow that calls itself.`,
      },
    };
  }

  // No explicit mapping means "hand down what this workflow has", which is the
  // common case and avoids re-listing every field.
  const passed =
    inputs.variables && typeof inputs.variables === 'object' && Object.keys(inputs.variables).length > 0
      ? (inputs.variables as Record<string, unknown>)
      : { ...(ctx.variables as Record<string, unknown>) };

  const key = String(inputs.as ?? 'subWorkflow').trim() || 'subWorkflow';
  const request = {
    workflowName,
    variables: { ...passed, $workflowDepth: depth + 1 },
    depth: depth + 1,
    convertTypes: inputs.convertTypes === true,
  };

  // "Wait for it to finish" off: start it and carry on (n8n's waitForSubWorkflow: false). Its
  // result is not returned, and a failure there is its own run's, not this step's.
  if (inputs.waitForCompletion === false) {
    void ctx.services.runWorkflow(request).catch(() => undefined);
    return { outputs: { [key]: { status: 'STARTED' } } };
  }

  // "If it fails: Carry on" covers every way the call can fail — a workflow that is not there, an
  // input of the wrong type — not only a called workflow that ran and failed.
  let result: { status: string; runId?: string; variables?: Record<string, unknown> };
  try {
    result = await ctx.services.runWorkflow(request);
  } catch (err) {
    if (inputs.onFailure !== 'continue') throw err;
    return { outputs: { [key]: { status: 'FAILED', error: err instanceof Error ? err.message : String(err) } } };
  }

  // A sub-run parked on a human task or timer reports WAITING/PAUSED. Until parent–child resume
  // exists, that is not a result the parent can continue on: it would carry the child's partial
  // variables forward as if the child had finished.
  const st = String(result.status ?? '').toUpperCase();
  if (st === 'WAITING' || st === 'PAUSED') {
    return {
      error: {
        name: 'SubWorkflowPaused',
        message: `Workflow "${workflowName}" paused on a human task or wait (run ${result.runId}); a called workflow must run straight through.`,
      },
    };
  }
  if (result.status === 'FAILED' && inputs.onFailure !== 'continue') {
    return {
      error: {
        name: 'SubWorkflowFailed',
        message: `Workflow "${workflowName}" failed (run ${result.runId}).`,
      },
    };
  }

  return { outputs: { [key]: { status: result.status, runId: result.runId, ...(result.variables ?? {}) } } };
};
