import { fail, ok } from '../tool.contract';
// Split from the line above, and `import type`, so this file can be loaded and exercised without a
// Nest container: `ok`/`fail` are real functions, the rest are interfaces that vanish at runtime.
// A plain import of an interface leaves a named import of something that does not exist, which tsc
// is happy with and the test runner is not.
import type { AgentTool, AgentToolContext, AgentToolResult } from '../tool.contract';
import type { PulseRepository } from '../../workflow/pulses/core';

/** A history question is about the recent past; a hundred runs is a different tool. */
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;
/** Declared once so the schema the model is shown and the check below cannot drift apart. */
const STATUSES = ['QUEUED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED'];

export interface HistoryToolDeps {
  /**
   * Must be backed by `PrismaService`, never a bare `PrismaClient`. The organisation filter on
   * these tables is Prisma middleware; a raw client loses it without any error.
   */
  repo: (entity: string) => PulseRepository;
}

export const HISTORY_TOOL_PARAMETERS = {
  type: 'object',
  properties: {
    workflow: {
      type: 'string',
      description: 'Name of one workflow, as shown on the Workflows page. Omit for all of them.',
    },
    status: {
      type: 'string',
      enum: STATUSES,
      description: 'Only runs that ended this way. Use FAILED to investigate something not working.',
    },
    runId: {
      type: 'string',
      description:
        'One run, returned with its full step-by-step timeline. Take the id from an earlier call.',
    },
    limit: {
      type: 'integer',
      description: `How many runs to return, newest first (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT}).`,
    },
  },
  required: [],
  additionalProperties: false,
};

/** Both are optional in the schema, and a run still in flight has no end. */
function durationMs(startedAt: unknown, completedAt: unknown): number | null {
  const start = startedAt ? new Date(startedAt as string).getTime() : NaN;
  const end = completedAt ? new Date(completedAt as string).getTime() : NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return end - start;
}

function iso(value: unknown): string | null {
  if (!value) return null;
  const at = new Date(value as string);
  return Number.isFinite(at.getTime()) ? at.toISOString() : null;
}

export function createHistoryTool(deps: HistoryToolDeps): AgentTool {
  return {
    name: 'read_run_history',
    description:
      'Look at whether automations actually ran and whether they succeeded. Returns recent ' +
      'workflow runs newest-first — which workflow, what triggered it, whether it completed or ' +
      'failed, how long it took, and for a failure, the step that failed and its error. Pass a ' +
      'runId for one run\'s full step timeline. Use this for any question about something not ' +
      'happening, a notification that never arrived, or an automation behaving oddly; guessing ' +
      'from the records alone cannot tell you whether a workflow ever fired. It reports what the ' +
      'steps DID, never the data they carried — those values are withheld, so do not claim to ' +
      'have seen them.',
    parameters: HISTORY_TOOL_PARAMETERS,
    trust: 'read',
    contentTrust: 'internal',

    async execute(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      // Run history is gated on `workflow` read, the same permission the Runs page requires —
      // knowing which automations fire and which are failing is knowing how the business operates.
      //
      // An absent permission map means unrestricted, matching `canRead` in the grounding service.
      // That is a conscious match, not a shortcut: a caller with no map already sees every entity
      // through describe_app and query_data, so being stricter here would only be inconsistent.
      const unrestricted = ctx.isPlatformAdmin || !ctx.permissions;
      const entry = ctx.permissions?.['workflow'];
      if (!unrestricted && !(entry?.get || entry?.getAll)) {
        return fail('You do not have permission to read workflow run history.');
      }

      const runs = deps.repo('WorkflowRun');
      const steps = deps.repo('WorkflowRunStep');

      // Names are read separately rather than joined in, so nothing here has to know how the run
      // table relates to the workflow table, and one map serves every branch below.
      let workflowNames: Map<string, string>;
      try {
        const rows: any[] = await deps.repo('Workflow').findMany({ select: { id: true, name: true } });
        workflowNames = new Map(rows.map((row) => [String(row.id), String(row.name)]));
      } catch (err) {
        return fail(`The run history could not be read: ${(err as Error).message}`);
      }

      try {
        if (typeof args.runId === 'string' && args.runId.trim()) {
          const runId = args.runId.trim();
          const run: any = await runs.findUnique({ id: runId });
          // A run belonging to another organisation is filtered out by the middleware and so
          // arrives here as "not found" — the same wording either way, on purpose.
          if (!run) {
            return fail(`There is no run with id "${runId}".`);
          }
          const timeline: any[] = await steps.findMany({
            where: { runId },
            orderBy: { executedAt: 'asc' },
          });
          const name = workflowNames.get(String(run.workflowId)) ?? 'Unknown workflow';
          return ok(
            {
              runId: run.id,
              workflow: name,
              status: run.status,
              triggerEvent: run.triggerEvent,
              startedAt: iso(run.startedAt),
              completedAt: iso(run.completedAt),
              durationMs: durationMs(run.startedAt, run.completedAt),
              error: run.error ?? null,
              // Metadata per step and nothing else. `input` and `output` are not selected away
              // downstream, they are never named — see the note at the top of this file.
              steps: timeline.map((step) => ({
                nodeId: step.nodeId,
                nodeKind: step.nodeKind,
                nodeType: step.nodeType ?? null,
                status: step.status,
                executedAt: iso(step.executedAt),
                durationMs: step.durationMs ?? null,
                error: step.error ?? null,
              })),
              notes: [
                'The values each step read and wrote are withheld and are not available to this tool.',
              ],
            },
            `Run ${run.id} of "${name}": ${run.status}, ${timeline.length} steps.`,
            [{ entity: 'WorkflowRun', rows: 1 }],
          );
        }

        let workflowIds: string[] | undefined;
        if (typeof args.workflow === 'string' && args.workflow.trim()) {
          const wanted = args.workflow.trim().toLowerCase();
          // Matched in code rather than with Prisma's `mode: 'insensitive'`, which is one database's
          // feature. Several workflows may share a name across versions, so every match counts.
          workflowIds = [...workflowNames.entries()]
            .filter(([, name]) => name.toLowerCase() === wanted)
            .map(([id]) => id);
          if (workflowIds.length === 0) {
            const available = [...new Set(workflowNames.values())].sort();
            return fail(
              `There is no workflow called "${args.workflow}". Workflows here: ${available.join(', ') || 'none'}.`,
            );
          }
        }

        const status = typeof args.status === 'string' ? args.status.trim().toUpperCase() : '';
        // Checked, not defaulted. The JSON-schema `enum` is a hint the model may ignore, and an
        // unknown status quietly matching nothing would read as "there were no failures" — the
        // most misleading answer this tool could give.
        if (status && !STATUSES.includes(status)) {
          return fail(`"${args.status}" is not a run status. Use one of: ${STATUSES.join(', ')}.`);
        }

        const limit = Math.max(
          1,
          Math.min(MAX_LIMIT, typeof args.limit === 'number' ? Math.floor(args.limit) : DEFAULT_LIMIT),
        );

        const where: Record<string, unknown> = {};
        if (workflowIds) where.workflowId = { in: workflowIds };
        if (status) where.status = status;

        const rows: any[] = await runs.findMany({
          where,
          orderBy: { startedAt: 'desc' },
          take: limit,
        });

        // One extra query for every failure across the whole page, rather than one per run: a
        // failing workflow is exactly the case where this tool gets called with a large limit.
        const failedIds = rows.filter((row) => row.status === 'FAILED').map((row) => String(row.id));
        const firstFailure = new Map<string, any>();
        if (failedIds.length) {
          const failures: any[] = await steps.findMany({
            where: { runId: { in: failedIds }, status: 'FAILED' },
            orderBy: { executedAt: 'asc' },
          });
          for (const step of failures) {
            // First failing step only. A later step failing because an earlier one did is noise,
            // and the model will otherwise report the last one as the cause.
            if (!firstFailure.has(String(step.runId))) firstFailure.set(String(step.runId), step);
          }
        }

        const history = rows.map((row) => {
          const failure = firstFailure.get(String(row.id));
          return {
            runId: row.id,
            workflow: workflowNames.get(String(row.workflowId)) ?? 'Unknown workflow',
            status: row.status,
            triggerEvent: row.triggerEvent,
            startedAt: iso(row.startedAt),
            completedAt: iso(row.completedAt),
            durationMs: durationMs(row.startedAt, row.completedAt),
            error: row.error ?? null,
            failedStep: failure
              ? {
                  nodeId: failure.nodeId,
                  nodeType: failure.nodeType ?? null,
                  error: failure.error ?? null,
                }
              : undefined,
          };
        });

        const scope = workflowIds ? `"${String(args.workflow).trim()}"` : 'all workflows';
        return ok(
          {
            runs: history,
            filters: { workflow: workflowIds ? String(args.workflow).trim() : null, status: status || null, limit },
            // Said out loud rather than left to be inferred from a short list, which a model
            // otherwise reports as "there have been no other runs" — a claim a capped query
            // cannot support.
            notes: [
              `Newest first, capped at ${limit} runs. There may be older runs than these.`,
              'The values each step read and wrote are withheld and are not available to this tool.',
            ],
          },
          history.length === 0
            ? `No runs found for ${scope}${status ? ` with status ${status}` : ''}.`
            : `${history.length} run(s) for ${scope}: ${history.filter((r) => r.status === 'FAILED').length} failed.`,
          [{ entity: 'WorkflowRun', rows: history.length }],
        );
      } catch (err) {
        return fail(`The run history could not be read: ${(err as Error).message}`);
      }
    },
  };
}
