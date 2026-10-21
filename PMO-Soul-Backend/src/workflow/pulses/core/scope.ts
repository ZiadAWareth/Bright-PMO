/**
 * Scope model (Step 0, Decision 2).
 *
 * Every pulse instance runs inside a scope; a single node is a scope of one.
 * Boundary events (Wave 4) attach to a scopeId, never to a node id — so the later
 * inline sub-scope feature becomes a designer-only change, not an engine rewrite.
 * For now this is the minimal shape the interpreter stamps and carries.
 */
export interface Scope {
  id: string;
  parentId?: string;
  /** Node ids that belong to this scope. */
  nodeIds: string[];
}

export const ROOT_SCOPE_ID = 'scope:root';

export function rootScope(nodeIds: string[]): Scope {
  return { id: ROOT_SCOPE_ID, nodeIds };
}

// ── Loop body scope ───────────────────────────────────────────────────────────
//
// A loop's `item`/`index` variables are BODY-scoped: whatever those names held
// before the loop started is put back when the loop reaches `done`. Without this,
// two nested loops on the default names clobbered each other — the outer `item`
// was gone the moment the inner loop ran — and after any loop the variables were
// left holding the last element, which a later step could read by mistake.

/** One iteration's contribution to the loop's `<as>` result array. */
export type LoopResult =
  | { index: number; item: unknown; output: unknown }
  | { index: number; item: unknown; error: { name: string; message: string } };

/** Per-loop-node state. Lives in `$loops` so it survives a pause/resume. */
export interface LoopFrame {
  /** Next iteration to run (0 = the loop has not started). */
  i: number;
  /** The scoped variables' values from before the loop, restored on `done`. */
  saved?: Record<string, { present: boolean; value?: unknown }>;
  /** What each finished iteration produced; becomes `<as>` on `done`. */
  results?: LoopResult[];
  /**
   * forEach only: the collection, resolved ONCE on entry. Re-resolving it each pass
   * against the live variables breaks the moment the body shadows a name the
   * template reads — an inner loop over `{{item.lines}}` would look up `item` after
   * its own first pass had already replaced it.
   */
  collection?: unknown[];
  /** Set by the interpreter when a body step failed under `onItemError: 'skip' | 'stop'`. */
  failed?: { name: string; message: string; stop: boolean };
}

/** Remember the current values of `names` so `exitLoopScope` can put them back. */
export function enterLoopScope(
  vars: Record<string, unknown>,
  names: string[],
): LoopFrame['saved'] {
  const saved: NonNullable<LoopFrame['saved']> = {};
  for (const name of names) {
    saved[name] = name in vars ? { present: true, value: vars[name] } : { present: false };
  }
  return saved;
}

/** Restore what `enterLoopScope` captured; a name that did not exist is deleted again. */
export function exitLoopScope(vars: Record<string, unknown>, saved: LoopFrame['saved']): void {
  for (const [name, prev] of Object.entries(saved ?? {})) {
    if (prev.present) vars[name] = prev.value;
    else delete vars[name];
  }
}
