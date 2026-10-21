// `import type`, not a plain import. `GroundingPack` is only ever a type here, and the barrel it
// lives behind also exports the Nest-decorated `GroundingService` — so a value import drags the
// whole framework in behind a contract that has no runtime dependencies at all. That is what made
// every tool in this folder impossible to load, and therefore impossible to test, on its own.
import type { GroundingPack } from './grounding';

/**
 * How far a tool may go without asking.
 *
 *  'read'    — no side effects. Runs immediately.
 *  'confirm' — writes, and the user must approve THIS call, with its arguments shown, first.
 *  'write'   — writes, pre-authorised by the surface that started the run (a workflow pulse,
 *              say, where the approval happened when the workflow was activated).
 *
 * There is no 'admin' level on purpose. Permission to touch a record belongs to the caller's
 * own permissions, which the tool checks against `AgentToolContext`; the trust level is only
 * about whether a human sees the call before it happens.
 */
export type ToolTrust = 'read' | 'confirm' | 'write';

/**
 * Where a tool's RESULTS come from — a different question from `trust`, which is about writes.
 *
 *  'internal' — the app's own database and configuration. Attacker text can reach it, but only
 *               by first getting into a record, which takes some level of access.
 *  'external' — the open internet. A web search, a third-party API. Anyone who can rank for a
 *               query the agent might plausibly make can put words in front of the model.
 *
 * Nothing reads this yet: the taint rule it exists for arrives with the first external tool
 * (plan §11.5 — once a run consumes external content it is tainted for its remaining lifetime
 * and may not call a write tool without a human saying so). It is declared NOW because that rule
 * keys off this field on EVERY tool, and adding a required field to a contract costs three lines
 * at four tools and a painful sweep at thirty.
 *
 * Required rather than defaulted to 'internal', deliberately. A default is silent, and the one
 * failure that matters here is somebody adding a tool that reaches the internet and not thinking
 * about it — which is precisely the case a default hides. Same reasoning as `trust` above:
 * a new tool cannot be added without someone answering the question.
 */
export type ContentTrust = 'internal' | 'external';

/** Who is asking. Every tool must filter its work by this and never widen it. */
export interface AgentToolContext {
  userId?: number;
  userEmail?: string;
  organizationId?: number;
  isPlatformAdmin?: boolean;
  /** Same permission map the guards put on the request. */
  permissions?: Record<string, any>;
  /** What the app knows about itself, already filtered to this caller. */
  grounding: GroundingPack;
  signal?: AbortSignal;
}

/**
 * What data a tool actually read, for the "Sources" line under an answer.
 *
 * Declared by the tool rather than worked out downstream, and that is the whole point. The
 * alternative was to parse `summary` — but that is a sentence written for a human, so the day
 * someone rewords "7 Ticket records." the Sources line would quietly start showing nothing.
 * Here the tool reports a number it already computed.
 *
 * Only tools that read RECORDS declare sources. `describe_app` reads the schema, and a line
 * claiming "Ticket" when all that was read was a list of field names would be exactly the
 * fabricated citation this mechanism exists to avoid.
 */
export interface AgentToolSource {
  entity: string;
  /** Omitted when a count would be meaningless — an aggregate returns one summary, not rows. */
  rows?: number;
  /**
   * What the number counts. Defaults to records.
   *
   * Added after the 2.12 gate showed the line lying by omission: a groupBy over 15 tickets reported
   * `Ticket (4 rows)` because it returned 4 groups, and a six-month trend reported `Ticket (6 rows)`
   * for 6 monthly buckets. Both read as "it looked at a handful of tickets", which understated the
   * evidence and made a well-grounded answer look thin. The unit was known at the point the number
   * was produced and simply was not carried.
   */
  unit?: 'row' | 'group' | 'period';
}

/**
 * What a tool hands back to the runtime.
 *
 * `ok: false` is a normal outcome, not an exception: "that entity does not exist" is
 * information the model can act on, and turning it into a thrown error would end the run
 * instead of letting the model correct itself. Genuine faults still throw.
 */
export type AgentToolResult =
  | { ok: true; data: unknown; summary?: string; sources?: AgentToolSource[] }
  | { ok: false; error: string };

export interface AgentTool {
  name: string;
  /** Written for the model, not for a developer. It is the only instruction it gets. */
  description: string;
  /** JSON Schema for the arguments. */
  parameters: Record<string, unknown>;
  trust: ToolTrust;
  /** Where its results come from. Not the same question as `trust`. */
  contentTrust: ContentTrust;
  execute(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult>;
}

/** Strips everything the model has no business seeing — notably `trust` and `execute`. */
export function toLlmToolDefinition(tool: AgentTool) {
  return { name: tool.name, description: tool.description, parameters: tool.parameters };
}

/** `sources` is optional so a tool that reads no records needs no change to compile. */
export function ok(data: unknown, summary?: string, sources?: AgentToolSource[]): AgentToolResult {
  return { ok: true, data, summary, sources };
}

export function fail(error: string): AgentToolResult {
  return { ok: false, error };
}

/**
 * Folds every source a run collected into the one line shown under the answer, e.g.
 * `Ticket (7 rows) · User (2 rows)`.
 *
 * Lives here, next to `AgentToolSource`, and is plain TypeScript with no Nest or Prisma import
 * — the same rule `rate-limit.ts` follows, so it survives the move to `@soul/agent-runtime` and
 * into the browser.
 *
 * One entity read twice is reported once with its rows added, because two calls to the same
 * table are an implementation detail of how the model worked; the user asked what it read.
 * An entity whose every source omitted a count is named without one rather than shown as
 * "(0 rows)", which would read as "found nothing" when the truth is "not counted".
 */
export function summariseSources(sources: AgentToolSource[]): string {
  // Keyed by entity AND unit, because 4 groups and 7 records are not 11 of anything. An entity
  // read both ways in one run gets two segments — rare, and honest when it happens.
  const totals = new Map<string, number | undefined>();
  const key = (source: AgentToolSource) => `${source.entity}|${source.unit ?? 'row'}`;

  for (const source of sources) {
    if (!source?.entity) continue;
    const seen = totals.get(key(source));
    if (typeof source.rows !== 'number') {
      // Registers the entity without claiming a count. Does not erase a count another call gave.
      if (!totals.has(key(source))) totals.set(key(source), undefined);
      continue;
    }
    totals.set(key(source), (seen ?? 0) + source.rows);
  }

  return [...totals.entries()]
    .map(([composite, count]) => {
      const [entity, unit] = composite.split('|');
      if (count === undefined) return entity;
      // "1 group" / "3 groups". Every unit here pluralises with a plain 's'.
      return `${entity} (${count} ${unit}${count === 1 ? '' : 's'})`;
    })
    .join(' · ');
}
