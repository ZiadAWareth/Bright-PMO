/**
 * Narrowest wins. A scope ceiling can only ever REDUCE what the caller could already do.
 *
 * Three states, and the difference between the last two is the entire safety property:
 *
 *   undefined / null — no ceiling declared. The assistant page, which has no Agent row behind it.
 *                      The caller's own permissions decide, exactly as before.
 *   []               — a ceiling allowing NOTHING. An agent saved with an empty list can reach
 *                      nothing at all.
 *   ['Ticket']       — only Ticket, and only if the caller could already read Ticket.
 *
 * Reading `[]` as "unset, so allow everything" is the obvious mistake and the expensive one: it
 * turns a half-finished form into an agent with the run of the database. It is why the absent
 * case is spelled with `undefined`/`null` and never with emptiness.
 */
export type ScopeCeiling = string[] | null | undefined;

/**
 * Is `name` inside the ceiling?
 *
 * Case-insensitive on purpose: entity names are PascalCase in the Prisma schema (`Ticket`) and
 * lowercase in the permission map (`ticket`), and whoever fills in an agent's form will type
 * whichever they last saw. A ceiling that silently failed on case would look like the agent was
 * broken, and the workaround people would reach for is to empty the list — which reads as
 * "nothing" here but would read as "everything" under the mistake above.
 *
 * A name in the ceiling that matches nothing simply grants nothing. There is no branch for it
 * because there cannot be one: this filters a list that already exists.
 */
export function withinCeiling(name: string, ceiling: ScopeCeiling): boolean {
  if (ceiling === undefined || ceiling === null) return true;
  const wanted = String(name).toLowerCase();
  return ceiling.some((entry) => typeof entry === 'string' && entry.toLowerCase() === wanted);
}

/**
 * The tools an agent may call: the ones this surface offers, minus anything outside its ceiling.
 *
 * A filter and never a lookup, so a tool named in `allowedTools` that the surface does not offer
 * cannot be conjured into existence by naming it.
 */
export function narrowTools<T extends { name: string }>(tools: T[], ceiling: ScopeCeiling): T[] {
  return tools.filter((tool) => withinCeiling(tool.name, ceiling));
}
